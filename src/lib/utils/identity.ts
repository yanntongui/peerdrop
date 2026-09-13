// Identity Packet System (KDE Connect-Inspired)
// Generates and manages device identity for discovery and pairing

export interface DeviceData {
  id: string;
  alias: string;
  deviceModel: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'web';
  fingerprint: string;
  protocol: 'webrtc' | 'rest';
  capabilities: string[];
  version: string;
  os: string;
  ip: string | null;
  port: number | null;
}

export function generateDeviceId(): string {
  return crypto.randomUUID();
}

export function generateFingerprint(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function detectDeviceType(): DeviceData['deviceType'] {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

export function detectOS(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'Unknown';
}

export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Edge/.test(ua)) return 'Edge';
  return 'Unknown';
}

export async function getDeviceModel(): Promise<string> {
  const os = detectOS();
  const browser = detectBrowser();

  // Try to get more specific info
  if (typeof navigator !== 'undefined' && (navigator as any).userAgentData) {
    const data = (navigator as any).userAgentData;
    if (data.platform) {
      return `${data.platform} (${browser})`;
    }
  }

  return `${os} - ${browser}`;
}

export async function createIdentityPacket(
  alias?: string
): Promise<DeviceData> {
  const id = generateDeviceId();
  const fingerprint = generateFingerprint();
  const deviceType = detectDeviceType();
  const os = detectOS();
  const deviceModel = await getDeviceModel();

  return {
    id,
    alias: alias || `${deviceModel} - ${id.slice(0, 8)}`,
    deviceModel,
    deviceType,
    fingerprint,
    protocol: 'webrtc',
    capabilities: ['files', 'clipboard', 'notifications'],
    version: '1.0.0',
    os,
    ip: null,
    port: null,
  };
}

export function validateIdentityPacket(
  packet: any
): packet is DeviceData {
  return (
    typeof packet === 'object' &&
    packet !== null &&
    typeof packet.id === 'string' &&
    typeof packet.alias === 'string' &&
    typeof packet.deviceModel === 'string' &&
    ['mobile', 'desktop', 'tablet', 'web'].includes(packet.deviceType) &&
    typeof packet.fingerprint === 'string' &&
    Array.isArray(packet.capabilities)
  );
}

// Store for paired devices
export interface PairedDevice {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  lastSeen: Date;
  trusted: boolean;
  protocol: 'local' | 'remote';
}

const PAIRED_DEVICES_KEY = 'peerdrop-paired-devices';

export function getPairedDevices(): PairedDevice[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(PAIRED_DEVICES_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function savePairedDevice(device: PairedDevice): void {
  const devices = getPairedDevices();
  const existingIndex = devices.findIndex((d) => d.id === device.id);

  if (existingIndex >= 0) {
    devices[existingIndex] = device;
  } else {
    devices.push(device);
  }

  localStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(devices));
}

export function removePairedDevice(deviceId: string): void {
  const devices = getPairedDevices().filter((d) => d.id !== deviceId);
  localStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(devices));
}

export function isDevicePaired(deviceId: string): boolean {
  return getPairedDevices().some((d) => d.id === deviceId);
}
