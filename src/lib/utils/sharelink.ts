// Share Links System
// Generate and validate share links for file transfers

import type { FileMeta } from './streaming';

export interface ShareLink {
  id: string;
  roomId: string;
  files: FileMeta[];
  createdAt: Date;
  expiresAt: Date | null;
  maxDownloads: number;
  currentDownloads: number;
  passwordHash: string | null;
}

export interface ShareLinkOptions {
  expiresIn?: number; // milliseconds
  maxDownloads?: number;
  password?: string;
}

const SHARE_LINKS_KEY = 'peerdrop-share-links';

// Generate a unique link ID
function generateLinkId(): string {
  return crypto.randomUUID().slice(0, 12);
}

// Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Create a new share link
export async function createShareLink(
  roomId: string,
  files: FileMeta[],
  options: ShareLinkOptions = {}
): Promise<ShareLink> {
  const id = generateLinkId();
  const now = new Date();

  const link: ShareLink = {
    id,
    roomId,
    files,
    createdAt: now,
    expiresAt: options.expiresIn
      ? new Date(now.getTime() + options.expiresIn)
      : null,
    maxDownloads: options.maxDownloads || 0, // 0 = unlimited
    currentDownloads: 0,
    passwordHash: options.password ? await hashPassword(options.password) : null,
  };

  // Store locally
  const links = getShareLinks();
  links.push(link);
  localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));

  return link;
}

// Get all share links
export function getShareLinks(): ShareLink[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(SHARE_LINKS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Get a share link by ID
export function getShareLink(id: string): ShareLink | null {
  const links = getShareLinks();
  return links.find((l) => l.id === id) || null;
}

// Validate a share link
export async function validateShareLink(
  id: string,
  password?: string
): Promise<{ valid: boolean; error?: string; link?: ShareLink }> {
  const link = getShareLink(id);

  if (!link) {
    return { valid: false, error: 'Link not found' };
  }

  // Check expiration
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    return { valid: false, error: 'Link has expired' };
  }

  // Check download limit
  if (link.maxDownloads > 0 && link.currentDownloads >= link.maxDownloads) {
    return { valid: false, error: 'Download limit reached' };
  }

  // Check password
  if (link.passwordHash) {
    if (!password) {
      return { valid: false, error: 'Password required' };
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== link.passwordHash) {
      return { valid: false, error: 'Invalid password' };
    }
  }

  return { valid: true, link };
}

// Increment download count
export function incrementDownloadCount(id: string): void {
  const links = getShareLinks();
  const link = links.find((l) => l.id === id);

  if (link) {
    link.currentDownloads++;
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
  }
}

// Delete a share link
export function deleteShareLink(id: string): void {
  const links = getShareLinks().filter((l) => l.id !== id);
  localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
}

// Clean up expired links
export function cleanupExpiredLinks(): void {
  const now = new Date();
  const links = getShareLinks().filter((link) => {
    if (link.expiresAt && now > new Date(link.expiresAt)) {
      return false;
    }
    if (link.maxDownloads > 0 && link.currentDownloads >= link.maxDownloads) {
      return false;
    }
    return true;
  });

  localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
}

// Generate share URL
export function generateShareUrl(linkId: string): string {
  if (typeof window === 'undefined') {
    return `https://peerdrop.app/share/${linkId}`;
  }

  return `${window.location.origin}/share/${linkId}`;
}

// Format link for display
export function formatShareLink(link: ShareLink): {
  url: string;
  expiresAt: string;
  downloads: string;
  hasPassword: boolean;
} {
  return {
    url: generateShareUrl(link.id),
    expiresAt: link.expiresAt
      ? new Date(link.expiresAt).toLocaleString()
      : 'Never',
    downloads: link.maxDownloads > 0
      ? `${link.currentDownloads}/${link.maxDownloads}`
      : `${link.currentDownloads} (unlimited)`,
    hasPassword: !!link.passwordHash,
  };
}
