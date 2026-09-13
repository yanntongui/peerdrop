// WebRTC Connection Manager
// Handles P2P connections using simple-peer

import Peer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import type { DeviceData } from './identity';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface ConnectionOptions {
  signalingUrl: string;
  roomId: string;
  deviceInfo: DeviceData;
}

export interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
  deviceInfo: DeviceData;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private deviceInfo: DeviceData;
  private roomId: string;

  // Event handlers
  public onPeerConnected?: (peerId: string, deviceInfo: DeviceData) => void;
  public onPeerDisconnected?: (peerId: string) => void;
  public onData?: (peerId: string, data: any) => void;
  public onStream?: (peerId: string, stream: MediaStream) => void;
  public onError?: (error: Error) => void;

  constructor(options: ConnectionOptions) {
    this.roomId = options.roomId;
    this.deviceInfo = options.deviceInfo;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('[WebRTC] Connected to signaling server');

        // Join room
        this.socket!.emit('join-room', {
          roomId: this.roomId,
          deviceInfo: this.deviceInfo,
        });

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebRTC] Connection error:', error);
        reject(error);
      });

      this.setupSocketListeners();
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Peers list received
    this.socket.on('peers-list', (peers: any[]) => {
      console.log('[WebRTC] Existing peers:', peers);

      // Initiate connections to existing peers
      peers.forEach((peer) => {
        this.initiatePeerConnection(peer.socketId, peer.deviceInfo);
      });
    });

    // New peer joined
    this.socket.on(
      'peer-joined',
      (data: { socketId: string; deviceInfo: DeviceData }) => {
        console.log('[WebRTC] Peer joined:', data.deviceInfo.alias);
        // Wait for peer to be ready before initiating
      }
    );

    // Peer left
    this.socket.on(
      'peer-left',
      (data: { socketId: string; deviceInfo: DeviceData }) => {
        console.log('[WebRTC] Peer left:', data.deviceInfo?.alias);
        this.removePeer(data.socketId);
        this.onPeerDisconnected?.(data.socketId);
      }
    );

    // WebRTC signaling
    this.socket.on(
      'offer',
      async (data: { offer: any; fromSocketId: string }) => {
        console.log('[WebRTC] Received offer from', data.fromSocketId);
        await this.handleOffer(data.fromSocketId, data.offer);
      }
    );

    this.socket.on(
      'answer',
      async (data: { answer: any; fromSocketId: string }) => {
        console.log('[WebRTC] Received answer from', data.fromSocketId);
        await this.handleAnswer(data.fromSocketId, data.answer);
      }
    );

    this.socket.on(
      'ice-candidate',
      async (data: { candidate: any; fromSocketId: string }) => {
        await this.handleIceCandidate(data.fromSocketId, data.candidate);
      }
    );

    // Transfer events
    this.socket.on('transfer-request', (data: any) => {
      this.onData?.(data.fromSocketId, {
        type: 'transfer-request',
        files: data.files,
      });
    });

    this.socket.on('transfer-accepted', (data: any) => {
      this.onData?.(data.fromSocketId, { type: 'transfer-accepted' });
    });

    this.socket.on('transfer-rejected', (data: any) => {
      this.onData?.(data.fromSocketId, {
        type: 'transfer-rejected',
        reason: data.reason,
      });
    });
  }

  private async initiatePeerConnection(
    peerSocketId: string,
    deviceInfo: DeviceData
  ): Promise<void> {
    const peer = new Peer({
      initiator: true,
      trickle: true,
      config: {
        iceServers: ICE_SERVERS,
      },
    });

    this.setupPeerEvents(peer, peerSocketId, deviceInfo);

    // Create offer
    const offer = peer.signal.bind(peer);

    // Wait for signal event
    peer.on('signal', (signal: any) => {
      this.socket?.emit('offer', {
        roomId: this.roomId,
        offer: signal,
        targetSocketId: peerSocketId,
      });
    });
  }

  private async handleOffer(
    peerSocketId: string,
    offer: any
  ): Promise<void> {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      config: {
        iceServers: ICE_SERVERS,
      },
    });

    this.setupPeerEvents(peer, peerSocketId, {} as DeviceData);

    // Signal the offer
    peer.signal(offer);

    // Create and send answer
    peer.on('signal', (signal) => {
      if (signal.type === 'answer') {
        this.socket?.emit('answer', {
          roomId: this.roomId,
          answer: signal,
          targetSocketId: peerSocketId,
        });
      } else {
        // ICE candidate
        this.socket?.emit('ice-candidate', {
          roomId: this.roomId,
          candidate: signal,
          targetSocketId: peerSocketId,
        });
      }
    });
  }

  private async handleAnswer(
    peerSocketId: string,
    answer: any
  ): Promise<void> {
    const connection = this.peers.get(peerSocketId);
    if (connection) {
      connection.peer.signal(answer);
    }
  }

  private async handleIceCandidate(
    peerSocketId: string,
    candidate: any
  ): Promise<void> {
    const connection = this.peers.get(peerSocketId);
    if (connection) {
      connection.peer.signal(candidate);
    }
  }

  private setupPeerEvents(
    peer: Peer.Instance,
    peerSocketId: string,
    deviceInfo: DeviceData
  ): void {
    peer.on('connect', () => {
      console.log('[WebRTC] Peer connected:', peerSocketId);
      this.peers.set(peerSocketId, {
        peerId: peerSocketId,
        peer,
        deviceInfo,
      });
      this.onPeerConnected?.(peerSocketId, deviceInfo);
    });

    peer.on('data', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.onData?.(peerSocketId, parsed);
      } catch {
        // Binary data
        this.onData?.(peerSocketId, data);
      }
    });

    peer.on('stream', (stream) => {
      this.onStream?.(peerSocketId, stream);
    });

    peer.on('error', (error) => {
      console.error('[WebRTC] Peer error:', error);
      this.onError?.(error);
    });

    peer.on('close', () => {
      console.log('[WebRTC] Peer closed:', peerSocketId);
      this.removePeer(peerSocketId);
      this.onPeerDisconnected?.(peerSocketId);
    });
  }

  private removePeer(peerSocketId: string): void {
    const connection = this.peers.get(peerSocketId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerSocketId);
    }
  }

  // Send data to a specific peer
  send(peerId: string, data: any): void {
    const connection = this.peers.get(peerId);
    if (connection && connection.peer.connected) {
      const encoded = typeof data === 'string' ? data : JSON.stringify(data);
      connection.peer.send(encoded);
    }
  }

  // Broadcast to all peers
  broadcast(data: any): void {
    this.peers.forEach((connection) => {
      this.send(connection.peerId, data);
    });
  }

  // Get connected peers
  getPeers(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  // Get peer count
  getPeerCount(): number {
    return this.peers.size;
  }

  // Disconnect
  disconnect(): void {
    this.peers.forEach((connection) => {
      connection.peer.destroy();
    });
    this.peers.clear();

    this.socket?.disconnect();
    this.socket = null;
  }
}
