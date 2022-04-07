import childProcess from 'child_process';
import events from 'events';
import stream from 'stream';
import os from 'os';
import { run } from '../../../src/preExec';

describe('preExec', function () {
  it('should return true when passing', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    setTimeout(() => {
      fakeProc.stdout?.emit('data', 'stdout-data');
      fakeProc.stderr?.emit('data', 'stderr-data');
      fakeProc.emit('exit', 0);
    }, 100);

    const hasPassed = await run({ preExec: ['npm install'] }, 10);

    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(true);
  });

  it('should return false when failing', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    setTimeout(() => {
      fakeProc.emit('exit', 1);
    }, 100);

    const hasPassed = await run({ preExec: ['npm install'] }, 10);

    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(false);
  });

  it('should return false when timeouting', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    const hasPassed = await run({ preExec: ['npm install'] }, 1);

    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(false);
  });

  it('should return false when failed to start', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    setTimeout(() => {
      fakeProc.emit('error', 'Unable to start command');
    }, 100);

    const hasPassed = await run({ preExec: ['npm install'] }, 10);

    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(false);
  });

  it('should return true when no preExecs', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');
    const hasPassed = await run({ preExec: undefined }, 1);
    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(true);
  });


  it('should return false when failed to start', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    setTimeout(() => {
      fakeProc.emit('error', 'invalid start error');
    }, 100);

    const hasPassed = await run({ preExec: ['npm install'] }, 10);
    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(false);
  });


  it('should use cmd /C when running on windows', async function () {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const fakeProc = <childProcess.ChildProcess> new events.EventEmitter();
    fakeProc.stdin = new stream.Writable();
    fakeProc.stdout = <stream.Readable> new events.EventEmitter();
    fakeProc.stderr = <stream.Readable> new events.EventEmitter();
    spawnSpy.mockReturnValue(fakeProc);

    setTimeout(() => {
      fakeProc.emit('error', 'invalid start error');
    }, 100);

    const hasPassed = await run({ preExec: ['npm install'] }, 10);
    expect(spawnSpy.mock.calls).toMatchSnapshot();
    expect(hasPassed).toBe(false);
  });
});
