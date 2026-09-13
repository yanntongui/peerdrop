// Protocol Package
// WebRTC P2P transfer protocol

export type MessageType =
  | 'handshake'
  | 'transfer-request'
  | 'transfer-accepted'
  | 'transfer-rejected'
  | 'file-chunk'
  | 'file-complete'
  | 'transfer-complete'
  | 'transfer-cancel'
  | 'transfer-pause'
  | 'transfer-resume'
  | 'integrity-check'
  | 'error';

export interface ProtocolMessage {
  type: MessageType;
  transferId: string;
  timestamp: number;
  payload: unknown;
}

export interface HandshakePayload {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  capabilities: string[];
  protocolVersion: string;
}

export interface TransferRequestPayload {
  files: FileMetadata[];
  totalSize: number;
  password?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  hash?: string;
}

export interface FileChunkPayload {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: number[];
  hash: string;
  offset: number;
  size: number;
}

export interface TransferCompletePayload {
  totalFiles: number;
  totalSize: number;
  duration: number;
}

export interface IntegrityCheckPayload {
  fileId: string;
  hash: string;
  algorithm: string;
}

export function createMessage(
  type: MessageType,
  transferId: string,
  payload: unknown
): ProtocolMessage {
  return {
    type,
    transferId,
    timestamp: Date.now(),
    payload,
  };
}

export function createHandshake(
  deviceId: string,
  deviceName: string,
  deviceType: string,
  os: string,
  capabilities: string[]
): ProtocolMessage {
  return createMessage('handshake', '', {
    deviceId,
    deviceName,
    deviceType,
    os,
    capabilities,
    protocolVersion: '1.0.0',
  } as HandshakePayload);
}

export function createTransferRequest(
  transferId: string,
  files: FileMetadata[],
  totalSize: number
): ProtocolMessage {
  return createMessage('transfer-request', transferId, {
    files,
    totalSize,
  } as TransferRequestPayload);
}

export function createFileChunk(
  transferId: string,
  fileId: string,
  chunkIndex: number,
  totalChunks: number,
  data: number[],
  hash: string,
  offset: number,
  size: number
): ProtocolMessage {
  return createMessage('file-chunk', transferId, {
    fileId,
    chunkIndex,
    totalChunks,
    data,
    hash,
    offset,
    size,
  } as FileChunkPayload);
}

export function createTransferComplete(
  transferId: string,
  totalFiles: number,
  totalSize: number,
  duration: number
): ProtocolMessage {
  return createMessage('transfer-complete', transferId, {
    totalFiles,
    totalSize,
    duration,
  } as TransferCompletePayload);
}

export function createIntegrityCheck(
  transferId: string,
  fileId: string,
  hash: string,
  algorithm: string = 'SHA-256'
): ProtocolMessage {
  return createMessage('integrity-check', transferId, {
    fileId,
    hash,
    algorithm,
  } as IntegrityCheckPayload);
}

export function parseMessage(data: string | ArrayBuffer): ProtocolMessage | null {
  try {
    const json = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const msg = JSON.parse(json) as ProtocolMessage;

    if (!msg.type || !msg.transferId || !msg.timestamp) {
      return null;
    }

    return msg;
  } catch {
    return null;
  }
}

const PROTOCOL_VERSION = '1.0.0';

export function getProtocolVersion(): string {
  return PROTOCOL_VERSION;
}
