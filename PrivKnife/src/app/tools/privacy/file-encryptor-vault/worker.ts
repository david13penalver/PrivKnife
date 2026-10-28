/// <reference lib="webworker" />

import { decryptVaultToFile, encryptFileToVault } from './engine';
import {
  FileEncryptorVaultWorkerRequest,
  FileEncryptorVaultWorkerResponse,
} from './types';

addEventListener(
  'message',
  async (event: MessageEvent<FileEncryptorVaultWorkerRequest>) => {
    const { type, id, sourceBuffer, password, options, originalFileName } =
      event.data;

    try {
      postMessage({
        type,
        id,
        progress: 25,
      } as FileEncryptorVaultWorkerResponse);

      if (type === 'encrypt') {
        postMessage({
          type,
          id,
          progress: 50,
        } as FileEncryptorVaultWorkerResponse);

        const result = await encryptFileToVault(
          sourceBuffer,
          password,
          options,
          originalFileName
        );

        postMessage({
          type: 'encrypt',
          id,
          success: true,
          result,
          progress: 100,
        } as FileEncryptorVaultWorkerResponse);
      } else {
        postMessage({
          type,
          id,
          progress: 50,
        } as FileEncryptorVaultWorkerResponse);

        const result = await decryptVaultToFile(sourceBuffer, password);

        postMessage({
          type: 'decrypt',
          id,
          success: true,
          result,
          progress: 100,
        } as FileEncryptorVaultWorkerResponse);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Vault operation failed';
      postMessage({
        type,
        id,
        success: false,
        error: errorMsg,
      } as FileEncryptorVaultWorkerResponse);
    }
  }
);
