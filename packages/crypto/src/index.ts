// Crypto Package
// E2E encryption, key management, DTLS

export interface EncryptionKey {
  key: CryptoKey;
  salt: Uint8Array;
  iv: Uint8Array;
  algorithm: string;
}

export async function generateEncryptionKey(password: string): Promise<EncryptionKey> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password) as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt, iv, algorithm: 'AES-GCM-256' };
}

export async function deriveKeyFromSecret(
  secret: string,
  salt?: Uint8Array
): Promise<EncryptionKey> {
  const encoder = new TextEncoder();
  const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret) as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: actualSalt as unknown as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: actualSalt, iv, algorithm: 'AES-GCM-256' };
}

export async function encryptChunk(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const chunkIv = new Uint8Array(12);
  chunkIv.set(iv);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: chunkIv as unknown as BufferSource },
    key,
    data
  );

  return { ciphertext, iv: chunkIv };
}

export async function decryptChunk(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    'raw',
    bytes as unknown as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateSharedSecret(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}
