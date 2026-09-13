// Device Core Package
// Device identity, discovery, and management

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'laptop' | 'unknown';

export type DeviceOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface DeviceIdentity {
  id: string;
  name: string;
  type: DeviceType;
  os: DeviceOS;
  version: string;
  capabilities: DeviceCapability[];
  createdAt: number;
  lastSeen: number;
}

export type DeviceCapability =
  | 'file-send'
  | 'file-receive'
  | 'folder-send'
  | 'folder-receive'
  | 'multi-peer'
  | 'usb-storage'
  | 'nas-access'
  | 'clipboard'
  | 'screen-share';

export interface DeviceDiscovery {
  id: string;
  device: DeviceIdentity;
  address: string;
  port: number;
  protocol: 'webrtc' | 'tcp' | 'udp';
  latency?: number;
  lastPing: number;
}

const IDENTITY_KEY = 'peerdrop-device-identity';

export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (/Android.*Mobile|iPhone|iPod/.test(ua)) return 'phone';
  if (/iPad|Android(?!.*Mobile)/.test(ua)) return 'tablet';
  if (/Macintosh|Mac OS X/.test(ua)) return 'desktop';
  if (/Windows/.test(ua)) return 'desktop';
  if (/Linux/.test(ua)) return 'desktop';

  return 'unknown';
}

export function getDeviceOS(): DeviceOS {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macos';
  if (/Linux/.test(ua)) return 'linux';

  return 'unknown';
}

export function getDeviceCapabilities(): DeviceCapability[] {
  const caps: DeviceCapability[] = ['file-send', 'file-receive'];

  if (typeof navigator !== 'undefined') {
    if ('share' in navigator) caps.push('clipboard');
    if ('mediaDevices' in navigator) caps.push('screen-share');
  }

  return caps;
}

export function createDeviceIdentity(name?: string): DeviceIdentity {
  const id = typeof window !== 'undefined'
    ? localStorage.getItem('peerdrop-device-id') || generateDeviceId()
    : generateDeviceId();

  if (typeof window !== 'undefined') {
    localStorage.setItem('peerdrop-device-id', id);
  }

  const deviceType = getDeviceType();
  const os = getDeviceOS();

  return {
    id,
    name: name || `${os.charAt(0).toUpperCase() + os.slice(1)} Device`,
    type: deviceType,
    os,
    version: '0.1.0',
    capabilities: getDeviceCapabilities(),
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
}

function generateDeviceId(): string {
  return `device-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function getStoredIdentity(): DeviceIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveIdentity(identity: DeviceIdentity): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function updateLastSeen(identity: DeviceIdentity): DeviceIdentity {
  return { ...identity, lastSeen: Date.now() };
}

const DISCOVERY_KEY = 'peerdrop-discovered-devices';

export function getDiscoveredDevices(): DeviceDiscovery[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DISCOVERY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveDiscoveredDevice(discovery: DeviceDiscovery): void {
  const devices = getDiscoveredDevices();
  const idx = devices.findIndex((d) => d.id === discovery.id);
  if (idx >= 0) {
    devices[idx] = discovery;
  } else {
    devices.push(discovery);
  }
  localStorage.setItem(DISCOVERY_KEY, JSON.stringify(devices));
}

export function removeDiscoveredDevice(id: string): void {
  const devices = getDiscoveredDevices().filter((d) => d.id !== id);
  localStorage.setItem(DISCOVERY_KEY, JSON.stringify(devices));
}

export function getOnlineDevices(): DeviceDiscovery[] {
  const cutoff = Date.now() - 30000; // 30 seconds
  return getDiscoveredDevices().filter((d) => d.lastPing > cutoff);
}
