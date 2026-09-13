// Universal File Source Interface
// Abstracts file access regardless of origin

export type FileSourceCapability = 'read' | 'seek' | 'stream' | 'metadata';

export interface UniversalFileSource {
  /** Unique identifier for this file source */
  id: string;

  /** Human-readable file name */
  name: string;

  /** MIME type if known */
  mimeType?: string;

  /** File size in bytes if known */
  size?: number;

  /** URI/path representation */
  uri?: string;

  /** Application that provided this file */
  sourceApp?: string;

  /** File extension */
  extension?: string;

  /** Creation date if available */
  createdAt?: Date;

  /** Modification date if available */
  modifiedAt?: Date;

  /** Capabilities of this source */
  capabilities: FileSourceCapability[];

  /** Whether the file is currently accessible */
  isAccessible: boolean;

  /** Platform-specific metadata */
  platformMetadata?: Record<string, unknown>;

  /**
   * Open a readable stream to the file content.
   * Must support backpressure via cancel().
   */
  openStream(): Promise<ReadableStream<Uint8Array>>;

  /**
   * Read the entire file into memory.
   * WARNING: Only use for small files. For large files, use openStream().
   */
  readAll(): Promise<ArrayBuffer>;

  /**
   * Read a specific range of bytes.
   */
  readRange(start: number, end: number): Promise<ArrayBuffer>;

  /**
   * Get a hash of the file content.
   */
  hash(algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<string>;

  /**
   * Check if the file is still accessible.
   */
  checkAccessibility(): Promise<boolean>;

  /**
   * Get a preview/thumbnail if available.
   */
  getPreview?(): Promise<string | null>;

  /**
   * Release any resources held by this source.
   */
  close?(): Promise<void>;
}

export interface UniversalFileSourceFactory {
  /**
   * Create a file source from a File object (browser).
   */
  fromFile(file: File): UniversalFileSource;

  /**
   * Create a file source from a URI/path.
   */
  fromUri(uri: string, mimeType?: string): Promise<UniversalFileSource>;

  /**
   * Create a file source from raw data.
   */
  fromData(
    data: ArrayBuffer | Uint8Array,
    name: string,
    mimeType?: string
  ): UniversalFileSource;

  /**
   * Create a file source from a ReadableStream.
   */
  fromStream(
    stream: ReadableStream<Uint8Array>,
    name: string,
    size?: number,
    mimeType?: string
  ): UniversalFileSource;
}
