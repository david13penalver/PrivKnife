/// <reference lib="webworker" />

import { processFormatterInput } from './engine';
import {
  FormatterDeps,
  FormatterWorkerRequest,
  FormatterWorkerResponse,
} from './types';

export async function handleFormatterWorkerMessage(
  data: FormatterWorkerRequest,
  post: (msg: FormatterWorkerResponse) => void,
  deps: FormatterDeps = {}
): Promise<void> {
  if (!data || data.type !== 'format') {
    post({
      type: 'error',
      error: 'Unsupported JSON/SQL/YAML formatter worker request payload.',
    });
    return;
  }

  try {
    const result = await processFormatterInput(data.inputText, data.options, {
      ...deps,
      onProgress: (percent, stage) => {
        deps.onProgress?.(percent, stage);
        post({ type: 'progress', percent, stage });
      },
    });
    post({ type: 'done', result });
  } catch (err: unknown) {
    post({
      type: 'error',
      error:
        err instanceof Error
          ? err.message
          : 'Formatter worker execution failed.',
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<FormatterWorkerRequest>) => {
    void handleFormatterWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
