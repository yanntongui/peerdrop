// Transfer History System
// Tracks all past file transfers

export interface TransferRecord {
  id: string;
  roomId: string;
  direction: 'sent' | 'received';
  peerName: string;
  peerDevice: string;
  files: { name: string; size: number; type: string }[];
  totalSize: number;
  status: 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt: number;
  duration: number; // ms
  speed: number; // bytes/sec average
}

const HISTORY_KEY = 'peerdrop-transfer-history';
const MAX_HISTORY = 50;

// Save a transfer record
export function saveTransferRecord(record: TransferRecord): void {
  if (typeof window === 'undefined') return;

  const history = getTransferHistory();

  // Avoid duplicates
  const existing = history.findIndex((h) => h.id === record.id);
  if (existing >= 0) {
    history[existing] = record;
  } else {
    history.unshift(record);
  }

  // Trim to max
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Get all transfer history
export function getTransferHistory(): TransferRecord[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Get history filtered by direction
export function getTransfersByDirection(direction: 'sent' | 'received'): TransferRecord[] {
  return getTransferHistory().filter((r) => r.direction === direction);
}

// Get history filtered by status
export function getTransfersByStatus(status: TransferRecord['status']): TransferRecord[] {
  return getTransferHistory().filter((r) => r.status === status);
}

// Search history by peer name or file name
export function searchHistory(query: string): TransferRecord[] {
  const q = query.toLowerCase();
  return getTransferHistory().filter(
    (r) =>
      r.peerName.toLowerCase().includes(q) ||
      r.files.some((f) => f.name.toLowerCase().includes(q))
  );
}

// Delete a transfer record
export function deleteTransferRecord(id: string): void {
  const history = getTransferHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Clear all history
export function clearTransferHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// Get total stats
export function getTransferStats(): {
  totalSent: number;
  totalReceived: number;
  totalFiles: number;
  totalTime: number;
} {
  const history = getTransferHistory();

  return history.reduce(
    (acc, r) => ({
      totalSent: acc.totalSent + (r.direction === 'sent' ? r.totalSize : 0),
      totalReceived: acc.totalReceived + (r.direction === 'received' ? r.totalSize : 0),
      totalFiles: acc.totalFiles + r.files.length,
      totalTime: acc.totalTime + r.duration,
    }),
    { totalSent: 0, totalReceived: 0, totalFiles: 0, totalTime: 0 }
  );
}

// Format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Format speed
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1048576) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
}
