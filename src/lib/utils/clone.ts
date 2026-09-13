// Phone Clone / Migration System
// Full device transfer between old and new devices

export interface CloneCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  fileTypes: string[];
  selected: boolean;
  estimatedSize: number;
  itemCount: number;
}

export interface CloneSession {
  id: string;
  sourceDevice: string;
  targetDevice: string;
  startedAt: number;
  completedAt: number | null;
  categories: CloneCategory[];
  totalSize: number;
  transferredSize: number;
  status: 'selecting' | 'transferring' | 'completed' | 'error' | 'paused';
  error: string | null;
}

export interface CloneProgress {
  sessionId: string;
  categoryId: string;
  filesTransferred: number;
  totalFiles: number;
  bytesTransferred: number;
  totalBytes: number;
  currentFile: string;
}

const CLONE_SESSION_KEY = 'peerdrop-clone-session';

// Default clone categories
export const DEFAULT_CATEGORIES: CloneCategory[] = [
  {
    id: 'contacts',
    name: 'Contacts',
    icon: '👥',
    description: 'Phone numbers, emails, addresses',
    fileTypes: ['vcard', 'vcf'],
    selected: true,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'photos',
    name: 'Photos',
    icon: '📸',
    description: 'Images and albums',
    fileTypes: ['image/*'],
    selected: true,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'videos',
    name: 'Videos',
    icon: '🎬',
    description: 'Video files',
    fileTypes: ['video/*'],
    selected: true,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: '📄',
    description: 'PDFs, Word docs, spreadsheets',
    fileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
    selected: true,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    description: 'Audio files and playlists',
    fileTypes: ['audio/*', '.mp3', '.wav', '.flac', '.m4a'],
    selected: true,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'apps',
    name: 'App Data',
    icon: '📦',
    description: 'App configurations and data',
    fileTypes: ['.json', '.xml', '.plist'],
    selected: false,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'messages',
    name: 'Messages',
    icon: '💬',
    description: 'SMS, iMessage, chat history',
    fileTypes: ['.db', '.sqlite', '.json'],
    selected: false,
    estimatedSize: 0,
    itemCount: 0,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    description: 'Device preferences and configurations',
    fileTypes: ['.json', '.plist', '.xml'],
    selected: false,
    estimatedSize: 0,
    itemCount: 0,
  },
];

// Create a new clone session
export function createCloneSession(sourceDevice: string, targetDevice: string): CloneSession {
  const session: CloneSession = {
    id: `clone-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    sourceDevice,
    targetDevice,
    startedAt: Date.now(),
    completedAt: null,
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    totalSize: 0,
    transferredSize: 0,
    status: 'selecting',
    error: null,
  };

  saveCloneSession(session);
  return session;
}

// Save clone session
export function saveCloneSession(session: CloneSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLONE_SESSION_KEY, JSON.stringify(session));
}

// Get current clone session
export function getCloneSession(): CloneSession | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(CLONE_SESSION_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Update category selection
export function updateCategorySelection(
  sessionId: string,
  categoryId: string,
  selected: boolean
): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  const category = session.categories.find((c) => c.id === categoryId);
  if (category) {
    category.selected = selected;
    session.totalSize = session.categories
      .filter((c) => c.selected)
      .reduce((sum, c) => sum + c.estimatedSize, 0);
    saveCloneSession(session);
  }
}

// Toggle all categories
export function toggleAllCategories(sessionId: string, selected: boolean): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.categories.forEach((c) => (c.selected = selected));
  session.totalSize = session.categories
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + c.estimatedSize, 0);
  saveCloneSession(session);
}

// Update category stats (from device scan)
export function updateCategoryStats(
  sessionId: string,
  categoryId: string,
  estimatedSize: number,
  itemCount: number
): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  const category = session.categories.find((c) => c.id === categoryId);
  if (category) {
    category.estimatedSize = estimatedSize;
    category.itemCount = itemCount;
    session.totalSize = session.categories
      .filter((c) => c.selected)
      .reduce((sum, c) => sum + c.estimatedSize, 0);
    saveCloneSession(session);
  }
}

// Start transfer
export function startCloneTransfer(sessionId: string): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.status = 'transferring';
  session.transferredSize = 0;
  saveCloneSession(session);
}

// Update transfer progress
export function updateCloneProgress(
  sessionId: string,
  categoryId: string,
  bytesTransferred: number
): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.transferredSize += bytesTransferred;
  saveCloneSession(session);
}

// Complete transfer
export function completeCloneTransfer(sessionId: string): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.status = 'completed';
  session.completedAt = Date.now();
  saveCloneSession(session);
}

// Pause transfer
export function pauseCloneTransfer(sessionId: string): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.status = 'paused';
  saveCloneSession(session);
}

// Resume transfer
export function resumeCloneTransfer(sessionId: string): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.status = 'transferring';
  saveCloneSession(session);
}

// Error during transfer
export function errorCloneTransfer(sessionId: string, error: string): void {
  const session = getCloneSession();
  if (!session || session.id !== sessionId) return;

  session.status = 'error';
  session.error = error;
  saveCloneSession(session);
}

// Clear session
export function clearCloneSession(): void {
  localStorage.removeItem(CLONE_SESSION_KEY);
}

// Format time remaining
export function formatTimeRemaining(session: CloneSession): string {
  if (session.status !== 'transferring' || session.transferredSize === 0) {
    return 'Calculating...';
  }

  const elapsed = Date.now() - session.startedAt;
  const speed = session.transferredSize / (elapsed / 1000);
  const remaining = (session.totalSize - session.transferredSize) / speed;

  if (remaining < 60) return `~${Math.round(remaining)}s`;
  if (remaining < 3600) return `~${Math.round(remaining / 60)}m`;
  return `~${Math.round(remaining / 3600)}h ${Math.round((remaining % 3600) / 60)}m`;
}
