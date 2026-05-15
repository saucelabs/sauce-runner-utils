import type { ChildProcess } from 'child_process';

export interface WatchdogOptions {
  /**
   * Maximum seconds of stdout/stderr silence from the child before it is
   * treated as hung. The timer resets on every chunk of output.
   */
  noProgressTimeoutSecs: number;

  /**
   * Milliseconds to wait between SIGTERM and SIGKILL after the watchdog
   * fires. Defaults to 10000 (10s).
   */
  signalEscalationMs?: number;

  /**
   * Called once when the watchdog fires, before signals are sent. Receives
   * the time at which the last output chunk was seen.
   */
  onStall?: (lastSeenAt: Date) => void;

  /**
   * Log prefix used in the "no output for Ns" message. Defaults to
   * "Sauce runner watchdog".
   */
  tag?: string;
}

export interface WatchdogResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  watchdogFired: boolean;
}

/**
 * Watch a spawned child process for stdout/stderr silence and terminate it
 * if no output is produced within `noProgressTimeoutSecs`. Each chunk of
 * output is echoed to the parent's stdout/stderr so existing logs are
 * preserved, and the silence timer is reset.
 *
 * The child MUST be spawned with piped stdout and stderr (i.e. not
 * `stdio: 'inherit'`) so the parent can observe its output.
 */
export function runWithStdoutWatchdog(
  child: ChildProcess,
  opts: WatchdogOptions,
): Promise<WatchdogResult> {
  const tag = opts.tag ?? 'Sauce runner watchdog';
  const escalationMs = opts.signalEscalationMs ?? 10_000;
  const timeoutMs = opts.noProgressTimeoutSecs * 1000;

  let lastSeenAt = new Date();
  let watchdogFired = false;
  let watchdogTimer: NodeJS.Timeout | undefined;
  let killTimer: NodeJS.Timeout | undefined;

  const resetWatchdog = () => {
    // Once the watchdog has fired, don't re-arm — late output from a
    // child that's being terminated should not block the kill sequence
    // or generate duplicate "no output" log lines.
    if (watchdogFired) {
      return;
    }
    lastSeenAt = new Date();
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
    }
    watchdogTimer = setTimeout(() => {
      watchdogFired = true;
      console.error(
        `${tag}: no output from child for ${opts.noProgressTimeoutSecs}s — terminating.`,
      );
      if (opts.onStall) {
        try {
          opts.onStall(lastSeenAt);
        } catch (err) {
          console.error(`${tag}: onStall handler threw: ${err}`);
        }
      }
      try {
        child.kill('SIGTERM');
      } catch (err) {
        console.error(`${tag}: SIGTERM failed: ${err}`);
      }
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          console.error(`${tag}: child still alive after SIGTERM — SIGKILL.`);
          try {
            child.kill('SIGKILL');
          } catch (err) {
            console.error(`${tag}: SIGKILL failed: ${err}`);
          }
        }
      }, escalationMs);
    }, timeoutMs);
  };

  if (child.stdout) {
    child.stdout.on('data', (chunk: Buffer | string) => {
      process.stdout.write(chunk);
      resetWatchdog();
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (chunk: Buffer | string) => {
      process.stderr.write(chunk);
      resetWatchdog();
    });
  }

  resetWatchdog();

  return new Promise<WatchdogResult>((resolve) => {
    let settled = false;
    const settle = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
      }
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolve({ exitCode: code, signal, watchdogFired });
    };
    // Listen to 'exit' (fires when the process terminates) rather than only
    // 'close' (which waits for all stdio streams to flush). Grandchildren
    // such as Chrome can inherit and hold the parent's pipe FDs open
    // indefinitely after the parent dies, preventing 'close' from firing.
    child.on('exit', (code, signal) => settle(code, signal));
    child.on('close', (code, signal) => settle(code, signal));
  });
}
