// Transfer Session Manager
// Manages transfer sessions with state tracking

export type TransferStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'transferring'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export type FileTransferStatus =
  | 'pending'
  | 'transferring'
  | 'completed'
  | 'error'
  | 'skipped';

export interface TransferSession {
  id: string;
  status: TransferStatus;
  startedAt: number;
  completedAt?: number;
  totalFiles: number;
  completedFiles: number;
  totalSize: number;
  transferredSize: number;
  files: FileTransferInfo[];
  error?: string;
}

export interface FileTransferInfo {
  id: string;
  name: string;
  size: number;
  status: FileTransferStatus;
  transferredBytes: number;
  startChunk: number;
  endChunk?: number;
  hash?: string;
  error?: string;
}

export interface TransferManifest {
  transferId: string;
  fileName: string;
  fileId: string;
  size: number;
  chunkSize: number;
  totalChunks: number;
  completedChunks: number[];
  hash: string;
  status: TransferStatus;
  createdAt: number;
  updatedAt: number;
}

const SESSION_KEY = 'peerdrop-transfer-sessions';

export function createTransferSession(files: { id: string; name: string; size: number }[]): TransferSession {
  return {
    id: `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    status: 'idle',
    startedAt: Date.now(),
    totalFiles: files.length,
    completedFiles: 0,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    transferredSize: 0,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      status: 'pending' as FileTransferStatus,
      transferredBytes: 0,
      startChunk: 0,
    })),
  };
}

export function updateSessionProgress(
  session: TransferSession,
  fileId: string,
  bytesTransferred: number
): TransferSession {
  const file = session.files.find((f) => f.id === fileId);
  if (file) {
    file.transferredBytes = bytesTransferred;
    if (bytesTransferred >= file.size) {
      file.status = 'completed';
      file.endChunk = undefined;
    }
  }

  session.transferredSize = session.files.reduce((sum, f) => sum + f.transferredBytes, 0);
  session.completedFiles = session.files.filter((f) => f.status === 'completed').length;

  return session;
}

export function saveTransferSession(session: TransferSession): void {
  if (typeof window === 'undefined') return;
  const sessions = getAllTransferSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function getAllTransferSessions(): TransferSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getTransferSession(id: string): TransferSession | null {
  return getAllTransferSessions().find((s) => s.id === id) || null;
}

export function deleteTransferSession(id: string): void {
  const sessions = getAllTransferSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function createManifest(
  transferId: string,
  fileId: string,
  fileName: string,
  size: number,
  chunkSize: number,
  hash: string
): TransferManifest {
  return {
    transferId,
    fileName,
    fileId,
    size,
    chunkSize,
    totalChunks: Math.ceil(size / chunkSize),
    completedChunks: [],
    hash,
    status: 'idle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateManifestChunk(
  manifest: TransferManifest,
  chunkIndex: number
): TransferManifest {
  if (!manifest.completedChunks.includes(chunkIndex)) {
    manifest.completedChunks.push(chunkIndex);
  }
  manifest.updatedAt = Date.now();
  return manifest;
}

export function isManifestComplete(manifest: TransferManifest): boolean {
  return manifest.completedChunks.length >= manifest.totalChunks;
}

export function getResumePoint(manifest: TransferManifest): number {
  if (manifest.completedChunks.length === 0) return 0;
  const maxChunk = Math.max(...manifest.completedChunks);
  return (maxChunk + 1) * manifest.chunkSize;
}
