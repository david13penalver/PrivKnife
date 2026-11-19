export interface QpdfRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  outputBytes?: Uint8Array;
}

interface QpdfRuntimeModule {
  callMain: (args: string[]) => number;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
}

let cachedModulePromise: Promise<QpdfRuntimeModule> | null = null;
let executionQueue: Promise<void> = Promise.resolve();
let jobCounter = 0;

let activeCapture: { stdout: string[]; stderr: string[] } | null = null;

type NodeProcessLike = {
  versions?: { node?: string };
  browser?: boolean;
  exitCode?: number;
};

function getNodeProcess(): NodeProcessLike | undefined {
  return (globalThis as unknown as { process?: NodeProcessLike }).process;
}

function isNodeRuntime(): boolean {
  const proc = getNodeProcess();
  return (
    typeof proc !== 'undefined' &&
    typeof proc.versions === 'object' &&
    typeof proc.versions?.node === 'string' &&
    proc.browser !== true
  );
}

async function getQpdfInstance(): Promise<QpdfRuntimeModule> {
  if (!cachedModulePromise) {
    cachedModulePromise = (async () => {
      const origLog = console.log;
      const origErr = console.error;

      console.log = (...args: unknown[]) => {
        const line = args.map(String).join(' ');
        if (activeCapture) {
          activeCapture.stdout.push(line);
        } else {
          origLog.apply(console, args);
        }
      };
      console.error = (...args: unknown[]) => {
        const line = args.map(String).join(' ');
        if (activeCapture) {
          activeCapture.stderr.push(line);
        } else {
          origErr.apply(console, args);
        }
      };

      try {
        const imported: any = await import('@neslinesli93/qpdf-wasm');
        const factory =
          typeof imported === 'function'
            ? imported
            : typeof imported?.default === 'function'
              ? imported.default
              : imported?.default?.default;

        if (typeof factory !== 'function') {
          throw new Error('Unable to resolve @neslinesli93/qpdf-wasm factory');
        }

        const instance: QpdfRuntimeModule = await factory({
          noInitialRun: true,
          locateFile: (fileName: string, scriptDirectory: string) =>
            isNodeRuntime()
              ? `${scriptDirectory}${fileName}`
              : `/assets/wasm/${fileName}`,
        });
        return instance;
      } finally {
        console.log = origLog;
        console.error = origErr;
      }
    })().catch((err) => {
      cachedModulePromise = null;
      throw err;
    });
  }

  return cachedModulePromise;
}

/**
 * Runs a QPDF WASM invocation safely in Emscripten MEMFS with strict cleanup
 * and serialized execution (Emscripten callMain is single-threaded per instance).
 */
export function runQpdfCommand(
  inputBytes: Uint8Array,
  buildArgs: (inPath: string, outPath: string) => string[],
  options: { readOutput?: boolean } = {}
): Promise<QpdfRunResult> {
  const readOutput = options.readOutput ?? true;

  const task = executionQueue.then(async (): Promise<QpdfRunResult> => {
    const qpdf = await getQpdfInstance();
    const seq = ++jobCounter;
    const inPath = `/in-${seq}.pdf`;
    const outPath = `/out-${seq}.pdf`;
    const capture = { stdout: [] as string[], stderr: [] as string[] };
    const normalized = new Uint8Array(inputBytes);

    qpdf.FS.writeFile(inPath, normalized);
    activeCapture = capture;
    let exitCode = 0;

    try {
      const args = buildArgs(inPath, outPath);
      const rawExit = qpdf.callMain(args);
      exitCode = typeof rawExit === 'number' ? rawExit : 0;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number'
      ) {
        exitCode = (err as { status: number }).status;
      } else {
        exitCode = 2;
        capture.stderr.push(
          err instanceof Error ? err.message : String(err ?? 'QPDF error')
        );
      }
    } finally {
      activeCapture = null;
      const proc = getNodeProcess();
      if (proc && typeof proc.exitCode === 'number' && proc.exitCode !== 0) {
        proc.exitCode = 0;
      }
    }

    let outputBytes: Uint8Array | undefined;
    try {
      if (readOutput && (exitCode === 0 || exitCode === 3)) {
        const rawOut = qpdf.FS.readFile(outPath);
        outputBytes = new Uint8Array(rawOut.byteLength);
        outputBytes.set(rawOut);
      }
    } finally {
      try {
        qpdf.FS.unlink(inPath);
      } catch {
        // Ignore missing MEMFS input cleanup
      }
      try {
        qpdf.FS.unlink(outPath);
      } catch {
        // Ignore missing MEMFS output cleanup
      }
    }

    return {
      exitCode,
      stdout: capture.stdout.join('\n'),
      stderr: capture.stderr.join('\n'),
      outputBytes,
    };
  });

  executionQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}
