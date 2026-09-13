// File Collision Resolver
// Handles file name conflicts at destinations

export type CollisionAction = 'replace' | 'keep_both' | 'skip' | 'cancel';

export interface CollisionInfo {
  fileName: string;
  existingSize?: number;
  newSize: number;
  existingModified?: Date;
}

export interface CollisionResolution {
  action: CollisionAction;
  finalName?: string;
  applyToAll?: boolean;
}

export interface CollisionResolver {
  resolve: (collision: CollisionInfo) => CollisionResolution;
  setApplyToAll: (action: CollisionAction | null) => void;
}

export function createCollisionResolver(): CollisionResolver {
  let applyToAllAction: CollisionAction | null = null;

  return {
    resolve: (collision: CollisionInfo): CollisionResolution => {
      if (applyToAllAction) {
        return {
          action: applyToAllAction,
          finalName: applyToAllAction === 'keep_both'
            ? generateUniqueName(collision.fileName)
            : collision.fileName,
        };
      }

      // Default: ask user (in real implementation, this would show a dialog)
      return {
        action: 'skip',
      };
    },

    setApplyToAll: (action: CollisionAction | null) => {
      applyToAllAction = action;
    },
  };
}

export function generateUniqueName(originalName: string, existingNames?: string[]): string {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = dotIndex > 0 ? originalName.slice(dotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${extension}`;

  while (existingNames?.includes(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${extension}`;
  }

  return candidate;
}

export function checkCollision(
  targetName: string,
  existingFiles: { name: string; size: number; modified: Date }[]
): CollisionInfo | null {
  const existing = existingFiles.find((f) => f.name === targetName);
  if (!existing) return null;

  return {
    fileName: targetName,
    existingSize: existing.size,
    newSize: 0,
    existingModified: existing.modified,
  };
}

export function formatCollisionMessage(collision: CollisionInfo): string {
  const sizeInfo = collision.existingSize
    ? ` (${formatBytes(collision.existingSize)})`
    : '';
  const dateInfo = collision.existingModified
    ? `Modified ${collision.existingModified.toLocaleDateString()}`
    : '';

  return `"${collision.fileName}"${sizeInfo} already exists${dateInfo ? `. ${dateInfo}` : ''}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
