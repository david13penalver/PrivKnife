import {
  ContainerMetadata,
  FileEncryptorVaultOptions,
  FileEncryptorVaultResult,
} from './types';

export const VAULT_MAGIC_BYTES = new Uint8Array([0x50, 0x52, 0x49, 0x56]); // 'PRIV'
export const VAULT_FORMAT_VERSION = 1;

// -------------------------------------------------------------
// 1. Validation Guardrails
// -------------------------------------------------------------
export function validateVaultOptions(
  options: FileEncryptorVaultOptions,
  password?: string
): { valid: boolean; error?: string } {
  if (!options) {
    return { valid: false, error: 'Vault options are required' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'A password is required for vault operations' };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: 'Vault password must be at least 6 characters long',
    };
  }

  if (
    typeof options.pbkdf2Iterations !== 'number' ||
    options.pbkdf2Iterations < 1000 ||
    options.pbkdf2Iterations > 1000000
  ) {
    return {
      valid: false,
      error: 'PBKDF2 iterations must be between 1,000 and 1,000,000',
    };
  }

  if (options.saltLengthBytes !== 16 && options.saltLengthBytes !== 32) {
    return {
      valid: false,
      error: 'Salt length must be 16 or 32 bytes',
    };
  }

  if (options.ivLengthBytes !== 12) {
    return {
      valid: false,
      error: 'AES-GCM IV length must be 12 bytes',
    };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Container Header Detection
// -------------------------------------------------------------
export async function isPrivKnifeVaultContainer(
  source: File | Blob | ArrayBuffer
): Promise<boolean> {
  try {
    let headerBytes: Uint8Array;
    if (source instanceof ArrayBuffer) {
      headerBytes = new Uint8Array(source.slice(0, 5));
    } else {
      const slice = source.slice(0, 5);
      headerBytes = new Uint8Array(await slice.arrayBuffer());
    }

    if (headerBytes.length < 5) return false;

    return (
      headerBytes[0] === VAULT_MAGIC_BYTES[0] &&
      headerBytes[1] === VAULT_MAGIC_BYTES[1] &&
      headerBytes[2] === VAULT_MAGIC_BYTES[2] &&
      headerBytes[3] === VAULT_MAGIC_BYTES[3] &&
      headerBytes[4] === VAULT_FORMAT_VERSION
    );
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 3. Web Crypto Key Derivation Helpers
// -------------------------------------------------------------
async function deriveAesGcmKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// -------------------------------------------------------------
// 4. File Encryption Pipeline (.priv / .enc)
// -------------------------------------------------------------
export async function encryptFileToVault(
  source: File | Blob | ArrayBuffer,
  password: string,
  options: FileEncryptorVaultOptions,
  originalFileName: string = 'document.bin'
): Promise<FileEncryptorVaultResult> {
  const validation = validateVaultOptions(options, password);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid encryption options');
  }

  // Read plaintext
  let plaintextBuffer: ArrayBuffer;
  let originalMime = 'application/octet-stream';
  let originalSize = 0;

  if (source instanceof ArrayBuffer) {
    plaintextBuffer = source;
    originalSize = source.byteLength;
  } else {
    plaintextBuffer = await source.arrayBuffer();
    originalSize = source.size;
    if ('type' in source && source.type) {
      originalMime = source.type;
    }
  }

  // Generate cryptographic Salt & IV
  const salt = new Uint8Array(options.saltLengthBytes);
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(options.ivLengthBytes);
  crypto.getRandomValues(iv);

  // Derive AES-256-GCM key via PBKDF2
  const key = await deriveAesGcmKey(password, salt, options.pbkdf2Iterations);

  // Encrypt payload
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    plaintextBuffer as unknown as BufferSource
  );

  // Prepare metadata payload
  const metadata: ContainerMetadata = {
    originalName: options.embedOriginalFilename ? originalFileName : 'file.bin',
    originalSize,
    mimeType: originalMime,
    encryptedAt: Date.now(),
  };

  const metaJson = JSON.stringify(metadata);
  const metaBytes = new TextEncoder().encode(metaJson);

  // Construct binary container:
  // [4 bytes Magic "PRIV"]
  // [1 byte Version = 1]
  // [4 bytes Iterations (Uint32BE)]
  // [1 byte Salt Length]
  // [N bytes Salt]
  // [1 byte IV Length]
  // [M bytes IV]
  // [2 bytes Metadata Length (Uint16BE)]
  // [K bytes Metadata UTF-8]
  // [Remaining bytes: Ciphertext + 16-byte Auth Tag]

  const headerSize =
    4 + 1 + 4 + 1 + salt.length + 1 + iv.length + 2 + metaBytes.length;
  const totalContainerSize = headerSize + ciphertextBuffer.byteLength;

  const containerArray = new Uint8Array(totalContainerSize);
  const view = new DataView(containerArray.buffer);

  let offset = 0;

  // Magic
  containerArray.set(VAULT_MAGIC_BYTES, offset);
  offset += 4;

  // Version
  containerArray[offset] = VAULT_FORMAT_VERSION;
  offset += 1;

  // Iterations
  view.setUint32(offset, options.pbkdf2Iterations, false);
  offset += 4;

  // Salt
  containerArray[offset] = salt.length;
  offset += 1;
  containerArray.set(salt, offset);
  offset += salt.length;

  // IV
  containerArray[offset] = iv.length;
  offset += 1;
  containerArray.set(iv, offset);
  offset += iv.length;

  // Meta length + Meta
  view.setUint16(offset, metaBytes.length, false);
  offset += 2;
  containerArray.set(metaBytes, offset);
  offset += metaBytes.length;

  // Ciphertext
  containerArray.set(new Uint8Array(ciphertextBuffer), offset);

  const containerBlob = new Blob([containerArray], {
    type: 'application/octet-stream',
  });

  const ext = options.containerFormat === 'enc' ? 'enc' : 'priv';
  const outFileName = `${originalFileName}.${ext}`;

  return {
    success: true,
    blob: containerBlob,
    fileName: outFileName,
    fileSize: containerBlob.size,
    mimeType: 'application/octet-stream',
    operation: 'encrypt',
    metadata: {
      originalFileName,
      algorithm: 'AES-GCM-256',
      iterations: options.pbkdf2Iterations,
      saltHex: bufferToHex(salt),
      ivHex: bufferToHex(iv),
      authTagVerified: true,
    },
  };
}

// -------------------------------------------------------------
// 5. Vault Decryption Pipeline
// -------------------------------------------------------------
export async function decryptVaultToFile(
  containerData: File | Blob | ArrayBuffer,
  password: string
): Promise<FileEncryptorVaultResult> {
  if (!password) {
    throw new Error('Password is required for decryption');
  }

  let containerBuffer: ArrayBuffer;
  if (containerData instanceof ArrayBuffer) {
    containerBuffer = containerData;
  } else {
    containerBuffer = await containerData.arrayBuffer();
  }

  const containerBytes = new Uint8Array(containerBuffer);
  const view = new DataView(containerBuffer);

  if (containerBytes.length < 28) {
    throw new Error('Corrupted or truncated vault file: Invalid header');
  }

  // Verify magic bytes
  if (
    containerBytes[0] !== VAULT_MAGIC_BYTES[0] ||
    containerBytes[1] !== VAULT_MAGIC_BYTES[1] ||
    containerBytes[2] !== VAULT_MAGIC_BYTES[2] ||
    containerBytes[3] !== VAULT_MAGIC_BYTES[3]
  ) {
    throw new Error('Invalid vault container format: Header magic mismatch');
  }

  // Version
  const version = containerBytes[4];
  if (version !== VAULT_FORMAT_VERSION) {
    throw new Error(`Unsupported vault container version: ${version}`);
  }

  let offset = 5;

  // Iterations
  const iterations = view.getUint32(offset, false);
  offset += 4;

  // Salt
  const saltLen = containerBytes[offset];
  offset += 1;
  if (offset + saltLen > containerBytes.length) {
    throw new Error('Corrupted vault container: Invalid salt length');
  }
  const salt = containerBytes.slice(offset, offset + saltLen);
  offset += saltLen;

  // IV
  const ivLen = containerBytes[offset];
  offset += 1;
  if (offset + ivLen > containerBytes.length) {
    throw new Error('Corrupted vault container: Invalid IV length');
  }
  const iv = containerBytes.slice(offset, offset + ivLen);
  offset += ivLen;

  // Meta
  const metaLen = view.getUint16(offset, false);
  offset += 2;
  if (offset + metaLen > containerBytes.length) {
    throw new Error('Corrupted vault container: Invalid metadata length');
  }
  const metaBytes = containerBytes.slice(offset, offset + metaLen);
  offset += metaLen;

  let metadata: ContainerMetadata | null = null;
  try {
    const metaJson = new TextDecoder().decode(metaBytes);
    metadata = JSON.parse(metaJson);
  } catch {
    // metadata is optional/corrupt
  }

  // Ciphertext is remaining bytes
  const ciphertext = containerBytes.slice(offset);

  // Derive key and decrypt
  const key = await deriveAesGcmKey(password, salt, iterations);

  let plaintextBuffer: ArrayBuffer;
  try {
    plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      key,
      ciphertext as unknown as BufferSource
    );
  } catch (err) {
    throw new Error(
      'Decryption failed: Incorrect password or corrupted vault container.'
    );
  }

  const originalMime = metadata?.mimeType || 'application/octet-stream';
  const outFileName = metadata?.originalName || 'decrypted-file';
  const decryptedBlob = new Blob([plaintextBuffer], { type: originalMime });

  return {
    success: true,
    blob: decryptedBlob,
    fileName: outFileName,
    fileSize: decryptedBlob.size,
    mimeType: originalMime,
    operation: 'decrypt',
    metadata: {
      originalFileName: outFileName,
      algorithm: 'AES-GCM-256',
      iterations,
      saltHex: bufferToHex(salt),
      ivHex: bufferToHex(iv),
      authTagVerified: true,
    },
  };
}
