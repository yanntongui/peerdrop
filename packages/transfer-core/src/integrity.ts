// File Integrity Manager
// SHA-256 verification for transferred files

export interface IntegrityResult {
  match: boolean;
  sourceHash: string;
  destinationHash: string;
  algorithm: string;
  verifiedAt: number;
}

export interface IntegrityManifest {
  transferId: string;
  files: FileIntegrityInfo[];
}

export interface FileIntegrityInfo {
  fileId: string;
  fileName: string;
  size: number;
  hash: string;
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
}

export async function hashData(
  data: ArrayBuffer | Uint8Array,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashStream(
  stream: ReadableStream<Uint8Array>,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return hashData(combined, algorithm);
}

export async function verifyIntegrity(
  sourceHash: string,
  destinationData: ArrayBuffer | Uint8Array,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<IntegrityResult> {
  const destinationHash = await hashData(destinationData, algorithm);

  return {
    match: sourceHash === destinationHash,
    sourceHash,
    destinationHash,
    algorithm,
    verifiedAt: Date.now(),
  };
}

export async function verifyStreamIntegrity(
  sourceHash: string,
  stream: ReadableStream<Uint8Array>,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<IntegrityResult> {
  const destinationHash = await hashStream(stream, algorithm);

  return {
    match: sourceHash === destinationHash,
    sourceHash,
    destinationHash,
    algorithm,
    verifiedAt: Date.now(),
  };
}

export function createIntegrityManifest(
  transferId: string,
  files: FileIntegrityInfo[]
): IntegrityManifest {
  return { transferId, files };
}

const INTEGRITY_KEY = 'peerdrop-integrity';

export function saveIntegrityManifest(manifest: IntegrityManifest): void {
  if (typeof window === 'undefined') return;
  const manifests = getIntegrityManifests();
  const idx = manifests.findIndex((m) => m.transferId === manifest.transferId);
  if (idx >= 0) {
    manifests[idx] = manifest;
  } else {
    manifests.push(manifest);
  }
  localStorage.setItem(INTEGRITY_KEY, JSON.stringify(manifests));
}

export function getIntegrityManifests(): IntegrityManifest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(INTEGRITY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getIntegrityManifest(transferId: string): IntegrityManifest | null {
  return getIntegrityManifests().find((m) => m.transferId === transferId) || null;
}
