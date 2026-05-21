import childProcess from 'child_process';
import events from 'events';
import stream from 'stream';
import { runWithStdoutWatchdog } from '../../../src/watchdog';

function makeFakeChild() {
  const fakeProc = <childProcess.ChildProcess>new events.EventEmitter();
  fakeProc.stdin = new stream.Writable();
  fakeProc.stdout = <stream.Readable>new events.EventEmitter();
  fakeProc.stderr = <stream.Readable>new events.EventEmitter();
  // jest sees `fakeProc.exitCode` / `signalCode` via property access; default null
  Object.defineProperty(fakeProc, 'exitCode', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(fakeProc, 'signalCode', {
    value: null,
    writable: true,
    configurable: true,
  });
  fakeProc.kill = jest.fn().mockReturnValue(true);
  return fakeProc;
}

describe('runWithStdoutWatchdog', () => {
  let writeStdoutSpy: jest.SpyInstance;
  let writeStderrSpy: jest.SpyInstance;

  beforeEach(() => {
    writeStdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    writeStderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    writeStdoutSpy.mockRestore();
    writeStderrSpy.mockRestore();
    jest.useRealTimers();
  });

  it('resolves with watchdogFired=false when child exits before timeout', async () => {
    const child = makeFakeChild();
    const promise = runWithStdoutWatchdog(child, {
      noProgressTimeoutSecs: 5,
      tag: 'TEST',
    });

    setTimeout(() => {
      child.stdout?.emit('data', Buffer.from('hello\n'));
      child.emit('close', 0, null);
    }, 10);

    const result = await promise;
    expect(result.watchdogFired).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('fires the watchdog and SIGTERMs the child after stdout silence', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();
    const onStall = jest.fn();

    const promise = runWithStdoutWatchdog(child, {
      noProgressTimeoutSecs: 2,
      signalEscalationMs: 1000,
      tag: 'TEST',
      onStall,
    });

    // Advance past the no-progress window
    jest.advanceTimersByTime(2_000);

    expect(onStall).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    // Child still alive after SIGTERM → SIGKILL after escalation window
    jest.advanceTimersByTime(1_000);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');

    // Simulate close from the kill
    child.emit('close', null, 'SIGKILL');

    jest.useRealTimers();
    const result = await promise;
    expect(result.watchdogFired).toBe(true);
    expect(result.signal).toBe('SIGKILL');
  });

  it('resets the silence timer on each chunk of output', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();

    const promise = runWithStdoutWatchdog(child, {
      noProgressTimeoutSecs: 2,
      signalEscalationMs: 1000,
      tag: 'TEST',
    });

    // 1.5s of silence — should NOT fire yet
    jest.advanceTimersByTime(1_500);
    expect(child.kill).not.toHaveBeenCalled();

    // Output resets the timer
    child.stdout?.emit('data', Buffer.from('tick\n'));

    // Another 1.5s — still under 2s since the chunk; should NOT fire
    jest.advanceTimersByTime(1_500);
    expect(child.kill).not.toHaveBeenCalled();

    // Cross the threshold
    jest.advanceTimersByTime(1_000);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    child.emit('close', null, 'SIGTERM');
    jest.useRealTimers();
    const result = await promise;
    expect(result.watchdogFired).toBe(true);
  });

  it('does not re-arm the timer after it has fired', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();
    const onStall = jest.fn();

    const promise = runWithStdoutWatchdog(child, {
      noProgressTimeoutSecs: 2,
      signalEscalationMs: 1000,
      tag: 'TEST',
      onStall,
    });

    // Fire the watchdog
    jest.advanceTimersByTime(2_000);
    expect(onStall).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    // Late stdout output from the dying child must not re-arm
    child.stdout?.emit('data', Buffer.from('late chatter from doomed child\n'));
    jest.advanceTimersByTime(3_000);

    // Still only one stall callback and SIGTERM call (plus SIGKILL escalation)
    expect(onStall).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect((child.kill as jest.Mock).mock.calls.length).toBeLessThanOrEqual(2);

    child.emit('close', null, 'SIGKILL');
    jest.useRealTimers();
    await promise;
  });

  it('echoes stdout and stderr to the parent streams', async () => {
    const child = makeFakeChild();
    const promise = runWithStdoutWatchdog(child, {
      noProgressTimeoutSecs: 5,
      tag: 'TEST',
    });

    setTimeout(() => {
      child.stdout?.emit('data', Buffer.from('out-chunk'));
      child.stderr?.emit('data', Buffer.from('err-chunk'));
      child.emit('close', 0, null);
    }, 10);

    await promise;
    expect(writeStdoutSpy).toHaveBeenCalledWith(Buffer.from('out-chunk'));
    expect(writeStderrSpy).toHaveBeenCalledWith(Buffer.from('err-chunk'));
  });
});
