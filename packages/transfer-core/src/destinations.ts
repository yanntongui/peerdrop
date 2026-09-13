// Destination Manager
// Manages transfer destinations: PeerDrop devices, USB, NAS, network

export type DestinationType = 'peerdrop' | 'usb' | 'nas' | 'local' | 'network' | 'unknown';

export type DestinationStatus = 'available' | 'busy' | 'unavailable' | 'error';

export interface Destination {
  id: string;
  name: string;
  type: DestinationType;
  status: DestinationStatus;
  icon: string;
  capacity?: number;
  available?: number;
  fileSystem?: string;
  mountPath?: string;
  ipAddress?: string;
  port?: number;
  platformMetadata?: Record<string, unknown>;
}

export interface PeerDropDevice extends Destination {
  type: 'peerdrop';
  deviceType: 'phone' | 'tablet' | 'desktop' | 'laptop';
  os: string;
  version: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface USBDevice extends Destination {
  type: 'usb';
  volumeName: string;
  serialNumber?: string;
  busNumber?: number;
  removable: boolean;
  ejectable: boolean;
}

export interface NASDevice extends Destination {
  type: 'nas';
  protocol: 'smb' | 'nfs' | 'webdav' | 'ftp';
  shares: string[];
  username?: string;
}

export interface LocalStorage extends Destination {
  type: 'local';
  path: string;
  isRemovable: boolean;
}

const DESTINATIONS_KEY = 'peerdrop-destinations';

export function getAllDestinations(): Destination[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DESTINATIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveDestination(destination: Destination): void {
  const destinations = getAllDestinations();
  const idx = destinations.findIndex((d) => d.id === destination.id);
  if (idx >= 0) {
    destinations[idx] = destination;
  } else {
    destinations.push(destination);
  }
  localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(destinations));
}

export function removeDestination(id: string): void {
  const destinations = getAllDestinations().filter((d) => d.id !== id);
  localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(destinations));
}

export function getDestinationById(id: string): Destination | null {
  return getAllDestinations().find((d) => d.id === id) || null;
}

export function getDestinationsByType(type: DestinationType): Destination[] {
  return getAllDestinations().filter((d) => d.type === type);
}

export function getAvailableDestinations(): Destination[] {
  return getAllDestinations().filter((d) => d.status === 'available');
}

export function getDestinationIcon(type: DestinationType): string {
  switch (type) {
    case 'peerdrop':
      return '📱';
    case 'usb':
      return '💾';
    case 'nas':
      return '🗄️';
    case 'local':
      return '📁';
    case 'network':
      return '🌐';
    default:
      return '📍';
  }
}

export function getDestinationTypeLabel(type: DestinationType): string {
  switch (type) {
    case 'peerdrop':
      return 'PeerDrop Device';
    case 'usb':
      return 'USB Drive';
    case 'nas':
      return 'Network Storage';
    case 'local':
      return 'Local Storage';
    case 'network':
      return 'Network Location';
    default:
      return 'Unknown';
  }
}

export function formatCapacity(bytes?: number): string {
  if (!bytes) return 'Unknown';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 1) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  return `${(gb / 1024).toFixed(1)} TB`;
}

export function getAvailableSpace(destination: Destination): string {
  if (!destination.capacity || !destination.available) return 'Unknown';
  return `${formatCapacity(destination.available)} free of ${formatCapacity(destination.capacity)}`;
}
