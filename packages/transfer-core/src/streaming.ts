// Streaming Transfer Engine
// Handles chunked streaming with backpressure

export const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB

export interface ChunkInfo {
  index: number;
  offset: number;
  size: number;
  data: ArrayBuffer;
  hash: string;
}

export interface StreamOptions {
  chunkSize?: number;
  onProgress?: (bytesTransferred: number, totalBytes: number) => void;
  onChunk?: (chunk: ChunkInfo) => void;
}

export async function* streamFile(
  source: ReadableStream<Uint8Array> | File,
  options: StreamOptions = {}
): AsyncGenerator<ChunkInfo> {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  let stream: ReadableStream<Uint8Array>;

  if (source instanceof File) {
    stream = source.stream();
  } else {
    stream = source;
  }

  const reader = stream.getReader();
  let buffer = new Uint8Array(0);
  let totalBytesRead = 0;
  let chunkIndex = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append new data to buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Process complete chunks
      while (buffer.length >= chunkSize) {
        const chunkData = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize);

        const hash = await computeHash(chunkData);
        const chunk: ChunkInfo = {
          index: chunkIndex,
          offset: chunkIndex * chunkSize,
          size: chunkData.length,
          data: chunkData.buffer,
          hash,
        };

        totalBytesRead += chunkData.length;
        chunkIndex++;

        options.onProgress?.(totalBytesRead, 0);
        options.onChunk?.(chunk);

        yield chunk;
      }
    }

    // Process remaining data
    if (buffer.length > 0) {
      const hash = await computeHash(buffer);
      const chunk: ChunkInfo = {
        index: chunkIndex,
        offset: chunkIndex * chunkSize,
        size: buffer.length,
        data: buffer.buffer,
        hash,
      };

      totalBytesRead += buffer.length;
      options.onProgress?.(totalBytesRead, 0);
      options.onChunk?.(chunk);

      yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamFileRange(
  file: File,
  start: number,
  end: number,
  options: StreamOptions = {}
): AsyncGenerator<ChunkInfo> {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const totalSize = end - start;
  let bytesStreamed = 0;
  let chunkIndex = Math.floor(start / chunkSize);

  const stream = file.slice(start, end).stream();
  const reader = stream.getReader();
  let buffer = new Uint8Array(0);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      while (buffer.length >= chunkSize) {
        const chunkData = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize);

        const hash = await computeHash(chunkData);
        yield {
          index: chunkIndex,
          offset: start + bytesStreamed,
          size: chunkData.length,
          data: chunkData.buffer,
          hash,
        };

        bytesStreamed += chunkData.length;
        chunkIndex++;
        options.onProgress?.(bytesStreamed, totalSize);
      }
    }

    if (buffer.length > 0) {
      const hash = await computeHash(buffer);
      yield {
        index: chunkIndex,
        offset: start + bytesStreamed,
        size: buffer.length,
        data: buffer.buffer,
        hash,
      };

      bytesStreamed += buffer.length;
      options.onProgress?.(bytesStreamed, totalSize);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function receiveChunks(
  expectedSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<{
  writer: WritableStream<Uint8Array>;
  progress: () => number;
}> {
  const totalChunks = Math.ceil(expectedSize / chunkSize);
  const receivedChunks = new Map<number, Uint8Array>();
  let bytesReceived = 0;

  const writer = new WritableStream<Uint8Array>({
    write(chunk) {
      bytesReceived += chunk.length;
    },
  });

  return {
    writer,
    progress: () => bytesReceived / expectedSize,
  };
}

async function computeHash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function calculateOptimalChunkSize(fileSize: number): number {
  if (fileSize < 1024 * 1024) return 64 * 1024; // 64KB for files < 1MB
  if (fileSize < 10 * 1024 * 1024) return 256 * 1024; // 256KB for files < 10MB
  if (fileSize < 100 * 1024 * 1024) return 1024 * 1024; // 1MB for files < 100MB
  return 4 * 1024 * 1024; // 4MB for files >= 100MB
}
