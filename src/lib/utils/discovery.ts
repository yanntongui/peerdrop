// Local Peer Discovery (Multicast UDP - LocalSend Inspired)
// Discovers peers on the same network without a server

import type { DeviceData } from './identity';

const MULTICAST_ADDRESS = '224.0.0.167';
const MULTICAST_PORT = 53317;

export interface DiscoveredPeer {
  deviceInfo: DeviceData;
  ip: string;
  port: number;
  lastSeen: Date;
}

export class LocalDiscovery {
  private socket: any = null;
  private deviceInfo: DeviceData;
  private peers: Map<string, DiscoveredPeer> = new Map();
  private isRunning = false;

  // Event handlers
  public onPeerFound?: (peer: DiscoveredPeer) => void;
  public onPeerLost?: (peerId: string) => void;
  public onPeerUpdated?: (peer: DiscoveredPeer) => void;

  constructor(deviceInfo: DeviceData) {
    this.deviceInfo = deviceInfo;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    // Note: Multicast UDP requires native support
    // In browser, we'll use a fallback HTTP-based discovery
    // For actual multicast, use the Tauri/Electron native layer

    console.log('[Discovery] Starting local peer discovery...');
    console.log('[Discovery] Multicast:', MULTICAST_ADDRESS, MULTICAST_PORT);

    this.isRunning = true;

    // Start periodic announcement
    this.announce();

    // Start peer cleanup
    this.startCleanup();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[Discovery] Stopped');
  }

  // Announce device presence
  private announce(): void {
    if (!this.isRunning) return;

    const announcement = {
      type: 'announce',
      deviceInfo: this.deviceInfo,
      port: MULTICAST_PORT,
    };

    // In browser, we can't do multicast directly
    // This would be handled by native layer in Tauri/Electron
    console.log('[Discovery] Announcing:', announcement);

    // Schedule next announcement
    setTimeout(() => this.announce(), 5000);
  }

  // Handle incoming announcement
  handleAnnouncement(data: any, fromIp: string): void {
    if (data.deviceInfo?.id === this.deviceInfo.id) return; // Ignore self

    const peer: DiscoveredPeer = {
      deviceInfo: data.deviceInfo,
      ip: fromIp,
      port: data.port || MULTICAST_PORT,
      lastSeen: new Date(),
    };

    const existing = this.peers.get(peer.deviceInfo.id);

    if (!existing) {
      this.peers.set(peer.deviceInfo.id, peer);
      console.log('[Discovery] Peer found:', peer.deviceInfo.alias);
      this.onPeerFound?.(peer);
    } else {
      existing.lastSeen = new Date();
      this.onPeerUpdated?.(existing);
    }
  }

  // Remove stale peers
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 15000; // 15 seconds

      this.peers.forEach((peer, id) => {
        if (now - peer.lastSeen.getTime() > timeout) {
          this.peers.delete(id);
          console.log('[Discovery] Peer lost:', peer.deviceInfo.alias);
          this.onPeerLost?.(id);
        }
      });
    }, 5000);
  }

  // Get all discovered peers
  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values());
  }

  // Get peer count
  getPeerCount(): number {
    return this.peers.size;
  }
}

// HTTP-based discovery fallback (for browser)
export class HttpDiscovery {
  private deviceInfo: DeviceData;
  private baseUrl: string;
  private peers: Map<string, DiscoveredPeer> = new Map();
  private isRunning = false;

  public onPeerFound?: (peer: DiscoveredPeer) => void;
  public onPeerLost?: (peerId: string) => void;

  constructor(deviceInfo: DeviceData, baseUrl: string = '') {
    this.deviceInfo = deviceInfo;
    this.baseUrl = baseUrl;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('[HTTP Discovery] Starting...');
    this.isRunning = true;

    // Register with known peers
    await this.register();

    // Start polling for peers
    this.startPolling();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[HTTP Discovery] Stopped');
  }

  private async register(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/discovery/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.deviceInfo),
      });
    } catch (error) {
      console.error('[HTTP Discovery] Registration failed:', error);
    }
  }

  private startPolling(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const response = await fetch(`${this.baseUrl}/api/discovery/peers`);
        const peers: DiscoveredPeer[] = await response.json();

        // Update peers
        const currentIds = new Set(peers.map((p) => p.deviceInfo.id));

        // Remove lost peers
        this.peers.forEach((peer, id) => {
          if (!currentIds.has(id)) {
            this.peers.delete(id);
            this.onPeerLost?.(id);
          }
        });

        // Add new peers
        peers.forEach((peer) => {
          if (!this.peers.has(peer.deviceInfo.id)) {
            this.peers.set(peer.deviceInfo.id, peer);
            this.onPeerFound?.(peer);
          }
        });
      } catch (error) {
        console.error('[HTTP Discovery] Poll failed:', error);
      }
    }, 3000);
  }

  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values());
  }
}
