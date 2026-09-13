import type { UniversalFileSource, FileSourceCapability } from './source';

export class BlobFileSource implements UniversalFileSource {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  uri?: string;
  sourceApp?: string;
  extension?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  capabilities: FileSourceCapability[] = ['read', 'stream', 'metadata'];
  isAccessible: boolean = true;
  platformMetadata?: Record<string, unknown>;

  private file: File;
  private closed = false;

  constructor(file: File) {
    this.file = file;
    this.id = `blob-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    this.name = file.name;
    this.mimeType = file.type || undefined;
    this.size = file.size;
    this.extension = file.name.split('.').pop()?.toLowerCase();
    this.createdAt = new Date(file.lastModified);
    this.modifiedAt = new Date(file.lastModified);
  }

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    if (this.closed) throw new Error('Source is closed');
    return this.file.stream();
  }

  async readAll(): Promise<ArrayBuffer> {
    if (this.closed) throw new Error('Source is closed');
    return this.file.arrayBuffer();
  }

  async readRange(start: number, end: number): Promise<ArrayBuffer> {
    if (this.closed) throw new Error('Source is closed');
    const blob = this.file.slice(start, end);
    return blob.arrayBuffer();
  }

  async hash(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    const data = await this.file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async checkAccessibility(): Promise<boolean> {
    return !this.closed && this.size !== undefined;
  }

  async getPreview(): Promise<string | null> {
    if (this.mimeType?.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(this.file);
      });
    }
    return null;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.isAccessible = false;
  }
}

export class ArrayBufferFileSource implements UniversalFileSource {
  id: string;
  name: string;
  mimeType?: string;
  size: number;
  uri?: string;
  sourceApp?: string;
  extension?: string;
  capabilities: FileSourceCapability[] = ['read', 'seek', 'stream', 'metadata'];
  isAccessible: boolean = true;

  private data: ArrayBuffer;
  private closed = false;

  constructor(data: ArrayBuffer, name: string, mimeType?: string) {
    this.data = data;
    this.id = `buf-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    this.name = name;
    this.mimeType = mimeType;
    this.size = data.byteLength;
    this.extension = name.split('.').pop()?.toLowerCase();
  }

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    if (this.closed) throw new Error('Source is closed');
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(this.data));
        controller.close();
      },
    });
  }

  async readAll(): Promise<ArrayBuffer> {
    if (this.closed) throw new Error('Source is closed');
    return this.data;
  }

  async readRange(start: number, end: number): Promise<ArrayBuffer> {
    if (this.closed) throw new Error('Source is closed');
    return this.data.slice(start, end);
  }

  async hash(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async checkAccessibility(): Promise<boolean> {
    return !this.closed;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.isAccessible = false;
  }
}

export class StreamFileSource implements UniversalFileSource {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  capabilities: FileSourceCapability[] = ['read', 'stream', 'metadata'];
  isAccessible: boolean = true;

  private streamFactory: () => Promise<ReadableStream<Uint8Array>>;
  private closed = false;

  constructor(
    streamFactory: () => Promise<ReadableStream<Uint8Array>>,
    name: string,
    size?: number,
    mimeType?: string
  ) {
    this.streamFactory = streamFactory;
    this.id = `stream-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    this.name = name;
    this.size = size;
    this.mimeType = mimeType;
    this.extension = name.split('.').pop()?.toLowerCase();
  }

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    if (this.closed) throw new Error('Source is closed');
    return this.streamFactory();
  }

  async readAll(): Promise<ArrayBuffer> {
    if (this.closed) throw new Error('Source is closed');
    const stream = await this.streamFactory();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result.buffer;
  }

  async readRange(start: number, end: number): Promise<ArrayBuffer> {
    const stream = await this.openStream();
    const reader = stream.getReader();
    let offset = 0;
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStart = Math.max(0, start - offset);
        const chunkEnd = Math.min(value.length, end - offset);

        if (chunkEnd > chunkStart) {
          chunks.push(value.slice(chunkStart, chunkEnd));
        }

        offset += value.length;
        if (offset >= end) break;
      }
    } finally {
      reader.releaseLock();
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result.buffer;
  }

  async hash(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    const stream = await this.openStream();
    const reader = stream.getReader();
    const hasher = new (window.crypto as any).Hasher(algorithm);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
    }

    return hasher.digest('hex');
  }

  async checkAccessibility(): Promise<boolean> {
    return !this.closed;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.isAccessible = false;
  }
}

export function createFileSource(file: File): UniversalFileSource {
  return new BlobFileSource(file);
}

export function createBufferSource(
  data: ArrayBuffer,
  name: string,
  mimeType?: string
): UniversalFileSource {
  return new ArrayBufferFileSource(data, name, mimeType);
}

export function createStreamSource(
  factory: () => Promise<ReadableStream<Uint8Array>>,
  name: string,
  size?: number,
  mimeType?: string
): UniversalFileSource {
  return new StreamFileSource(factory, name, size, mimeType);
}
