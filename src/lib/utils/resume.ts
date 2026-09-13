// Transfer Resume System
// Saves transfer progress to enable resuming after disconnect

export interface TransferProgress {
  transferId: string;
  fileId: string;
  fileName: string;
  totalSize: number;
  transferredSize: number;
  chunksReceived: number[];
  totalChunks: number;
  startedAt: number;
  lastUpdated: number;
}

const TRANSFER_PROGRESS_KEY = 'peerdrop-transfer-progress';

// Save transfer progress
export function saveTransferProgress(progress: TransferProgress): void {
  if (typeof window === 'undefined') return;

  const allProgress = getAllTransferProgress();
  const existingIndex = allProgress.findIndex(
    (p) => p.transferId === progress.transferId && p.fileId === progress.fileId
  );

  if (existingIndex >= 0) {
    allProgress[existingIndex] = progress;
  } else {
    allProgress.push(progress);
  }

  localStorage.setItem(TRANSFER_PROGRESS_KEY, JSON.stringify(allProgress));
}

// Get all transfer progress
export function getAllTransferProgress(): TransferProgress[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(TRANSFER_PROGRESS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Get transfer progress by transfer ID
export function getTransferProgress(transferId: string): TransferProgress[] {
  return getAllTransferProgress().filter((p) => p.transferId === transferId);
}

// Get file transfer progress
export function getFileTransferProgress(
  transferId: string,
  fileId: string
): TransferProgress | null {
  const allProgress = getAllTransferProgress();
  return (
    allProgress.find(
      (p) => p.transferId === transferId && p.fileId === fileId
    ) || null
  );
}

// Update transfer progress
export function updateTransferProgress(
  transferId: string,
  fileId: string,
  chunkIndex: number,
  totalSize: number,
  chunkSize: number,
  totalChunks: number,
  fileName: string
): void {
  const existing = getFileTransferProgress(transferId, fileId);

  if (existing) {
    if (!existing.chunksReceived.includes(chunkIndex)) {
      existing.chunksReceived.push(chunkIndex);
    }
    existing.transferredSize += chunkSize;
    existing.lastUpdated = Date.now();
    saveTransferProgress(existing);
  } else {
    const progress: TransferProgress = {
      transferId,
      fileId,
      fileName,
      totalSize,
      transferredSize: chunkSize,
      chunksReceived: [chunkIndex],
      totalChunks,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    saveTransferProgress(progress);
  }
}

// Check if chunk was already received
export function isChunkReceived(
  transferId: string,
  fileId: string,
  chunkIndex: number
): boolean {
  const progress = getFileTransferProgress(transferId, fileId);
  return progress ? progress.chunksReceived.includes(chunkIndex) : false;
}

// Get received chunks for a file
export function getReceivedChunks(
  transferId: string,
  fileId: string
): number[] {
  const progress = getFileTransferProgress(transferId, fileId);
  return progress ? progress.chunksReceived : [];
}

// Calculate resume progress
export function getResumeInfo(
  transferId: string,
  fileId: string
): {
  canResume: boolean;
  receivedChunks: number[];
  transferredSize: number;
  totalSize: number;
  percent: number;
} {
  const progress = getFileTransferProgress(transferId, fileId);

  if (!progress) {
    return {
      canResume: false,
      receivedChunks: [],
      transferredSize: 0,
      totalSize: 0,
      percent: 0,
    };
  }

  return {
    canResume: true,
    receivedChunks: progress.chunksReceived,
    transferredSize: progress.transferredSize,
    totalSize: progress.totalSize,
    percent: (progress.transferredSize / progress.totalSize) * 100,
  };
}

// Mark transfer as complete
export function markTransferComplete(
  transferId: string,
  fileId: string
): void {
  const progress = getFileTransferProgress(transferId, fileId);

  if (progress) {
    progress.chunksReceived = Array.from(
      { length: progress.totalChunks },
      (_, i) => i
    );
    progress.transferredSize = progress.totalSize;
    progress.lastUpdated = Date.now();
    saveTransferProgress(progress);
  }
}

// Delete transfer progress
export function deleteTransferProgress(
  transferId: string,
  fileId?: string
): void {
  const allProgress = getAllTransferProgress();

  const filtered = fileId
    ? allProgress.filter(
        (p) => !(p.transferId === transferId && p.fileId === fileId)
      )
    : allProgress.filter((p) => p.transferId !== transferId);

  localStorage.setItem(TRANSFER_PROGRESS_KEY, JSON.stringify(filtered));
}

// Clean up old transfers (older than 24 hours)
export function cleanupOldTransfers(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const allProgress = getAllTransferProgress();
  const filtered = allProgress.filter((p) => p.lastUpdated > cutoff);
  localStorage.setItem(TRANSFER_PROGRESS_KEY, JSON.stringify(filtered));
}

// Generate transfer ID
export function generateTransferId(): string {
  return `transfer-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}
