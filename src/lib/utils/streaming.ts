// File Streaming & Chunking System
// Enables unlimited file size transfers with minimal memory usage

export const CHUNK_SIZE = 64 * 1024; // 64 KB

export interface FileChunk {
  index: number;
  hash: string;
  offset: number;
  size: number;
  data: ArrayBuffer;
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  hash: string; // Full file hash
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  index: number;
  hash: string;
  offset: number;
  size: number;
  sent: boolean;
}

export interface TransferProgress {
  fileId: string;
  totalChunks: number;
  sentChunks: number;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
}

// Calculate SHA-256 hash of data
export async function calculateHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Calculate hash of a chunk
export async function calculateChunkHash(
  data: ArrayBuffer
): Promise<string> {
  return calculateHash(data);
}

// Generate file metadata
export async function generateFileMeta(file: File): Promise<FileMeta> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const offset = i * CHUNK_SIZE;
    const size = Math.min(CHUNK_SIZE, file.size - offset);

    chunks.push({
      index: i,
      hash: '', // Will be calculated during transfer
      offset,
      size,
      sent: false,
    });
  }

  // Calculate full file hash
  const buffer = await file.arrayBuffer();
  const hash = await calculateHash(buffer);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    hash,
    chunks,
  };
}

// Stream file in chunks (sender side)
export async function* streamFile(
  file: File
): AsyncGenerator<FileChunk, void, unknown> {
  const reader = file.stream().getReader();
  let offset = 0;
  let chunkIndex = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // If chunk is larger than CHUNK_SIZE, split it
    let remaining = value;

    while (remaining.byteLength > 0) {
      const chunkData: Uint8Array =
        remaining.byteLength > CHUNK_SIZE
          ? remaining.slice(0, CHUNK_SIZE)
          : remaining;

      const hash = await calculateChunkHash(chunkData.buffer as ArrayBuffer);

      yield {
        index: chunkIndex,
        hash,
        offset,
        size: chunkData.byteLength,
        data: chunkData.buffer as ArrayBuffer,
      };

      offset += chunkData.byteLength;
      chunkIndex++;

      if (remaining.byteLength > CHUNK_SIZE) {
        remaining = remaining.slice(CHUNK_SIZE);
      } else {
        break;
      }
    }
  }
}

// Save file to disk using File System Access API
export async function saveFileToDisk(
  fileName: string,
  fileType: string,
  totalSize: number
): Promise<FileSystemWritableFileStream | null> {
  // Check if File System Access API is available
  if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) {
    console.warn('[Storage] File System Access API not available');
    return null;
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: fileType || 'File',
          accept: { [fileType || 'application/octet-stream']: [] },
        },
      ],
    });

    return handle.createWritable();
  } catch (error) {
    // User cancelled or error
    console.error('[Storage] Failed to save file:', error);
    return null;
  }
}

// Write chunk to disk
export async function writeChunk(
  writable: FileSystemWritableFileStream,
  chunk: ArrayBuffer
): Promise<void> {
  await writable.write(chunk);
}

// Close file writer
export async function closeFileWriter(
  writable: FileSystemWritableFileStream
): Promise<void> {
  await writable.close();
}

// Progress tracker
export class ProgressTracker {
  private startTime: number = 0;
  private lastChunkTime: number = 0;
  private bytesTransferred: number = 0;
  private totalBytes: number = 0;

  start(totalBytes: number): void {
    this.startTime = Date.now();
    this.lastChunkTime = this.startTime;
    this.bytesTransferred = 0;
    this.totalBytes = totalBytes;
  }

  update(bytesTransferred: number): TransferProgress {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const chunkElapsed = (now - this.lastChunkTime) / 1000;

    this.bytesTransferred = bytesTransferred;
    this.lastChunkTime = now;

    const progress = (bytesTransferred / this.totalBytes) * 100;
    const speed = chunkElapsed > 0 ? bytesTransferred / elapsed : 0;
    const remaining = this.totalBytes - bytesTransferred;
    const eta = speed > 0 ? remaining / speed : 0;

    return {
      fileId: '',
      totalChunks: Math.ceil(this.totalBytes / CHUNK_SIZE),
      sentChunks: Math.ceil(bytesTransferred / CHUNK_SIZE),
      progress,
      speed,
      eta,
    };
  }

  reset(): void {
    this.startTime = 0;
    this.lastChunkTime = 0;
    this.bytesTransferred = 0;
    this.totalBytes = 0;
  }
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format seconds to human readable
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

// Format speed
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}
