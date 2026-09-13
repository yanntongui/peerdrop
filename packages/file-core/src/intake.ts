// File Intake Pipeline
// Handles file selection, permission checks, metadata extraction

import type { UniversalFileSource } from './source';
import { createFileSource } from './sources';
import { detectCategory, type FileMetadata, type FileCategory } from './metadata';

export type IntakeStatus =
  | 'pending'
  | 'checking'
  | 'accessible'
  | 'permission_required'
  | 'inaccessible'
  | 'error';

export interface IntakeResult {
  source: UniversalFileSource;
  metadata: FileMetadata;
  status: IntakeStatus;
  error?: string;
  permissionGranted?: boolean;
}

export interface IntakePipelineOptions {
  /** Maximum file size in bytes (0 = unlimited) */
  maxFileSize?: number;

  /** Allowed file categories (empty = all) */
  allowedCategories?: FileCategory[];

  /** Allowed MIME types (empty = all) */
  allowedMimeTypes?: string[];

  /** Whether to generate previews */
  generatePreviews?: boolean;

  /** Whether to compute hashes */
  computeHashes?: boolean;
}

const DEFAULT_OPTIONS: IntakePipelineOptions = {
  maxFileSize: 0,
  allowedCategories: [],
  allowedMimeTypes: [],
  generatePreviews: true,
  computeHashes: false,
};

export class FileIntakePipeline {
  private options: IntakePipelineOptions;

  constructor(options: IntakePipelineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process files from a FileList (browser file picker or drag-and-drop).
   */
  async processFileList(fileList: FileList): Promise<IntakeResult[]> {
    const results: IntakeResult[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const result = await this.processFile(file);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single File object.
   */
  async processFile(file: File): Promise<IntakeResult> {
    const source = createFileSource(file);
    return this.processSource(source);
  }

  /**
   * Process a UniversalFileSource.
   */
  async processSource(source: UniversalFileSource): Promise<IntakeResult> {
    try {
      // Step 1: Basic validation
      if (!source.name) {
        return {
          source,
          metadata: this.createMinimalMetadata(source),
          status: 'error',
          error: 'File has no name',
        };
      }

      // Step 2: Size check
      if (this.options.maxFileSize && source.size && source.size > this.options.maxFileSize) {
        return {
          source,
          metadata: this.createMinimalMetadata(source),
          status: 'error',
          error: `File exceeds maximum size of ${this.options.maxFileSize} bytes`,
        };
      }

      // Step 3: Category check
      const category = detectCategory(source.mimeType, source.extension);
      if (
        this.options.allowedCategories &&
        this.options.allowedCategories.length > 0 &&
        !this.options.allowedCategories.includes(category)
      ) {
        return {
          source,
          metadata: this.createMinimalMetadata(source),
          status: 'error',
          error: `File category '${category}' is not allowed`,
        };
      }

      // Step 4: MIME type check
      if (
        this.options.allowedMimeTypes &&
        this.options.allowedMimeTypes.length > 0 &&
        source.mimeType &&
        !this.options.allowedMimeTypes.includes(source.mimeType)
      ) {
        return {
          source,
          metadata: this.createMinimalMetadata(source),
          status: 'error',
          error: `MIME type '${source.mimeType}' is not allowed`,
        };
      }

      // Step 5: Accessibility check
      const isAccessible = await source.checkAccessibility();
      if (!isAccessible) {
        return {
          source,
          metadata: this.createMinimalMetadata(source),
          status: 'inaccessible',
          error: 'File is not accessible',
        };
      }

      // Step 6: Extract metadata
      const metadata = await this.extractMetadata(source);

      // Step 7: Generate preview if requested
      if (this.options.generatePreviews && source.getPreview) {
        try {
          metadata.preview = await source.getPreview();
        } catch {
          // Preview generation is optional
        }
      }

      // Step 8: Compute hash if requested
      if (this.options.computeHashes) {
        try {
          metadata.hash = await source.hash('SHA-256');
        } catch {
          // Hash computation is optional
        }
      }

      return {
        source,
        metadata,
        status: 'accessible',
      };
    } catch (error) {
      return {
        source,
        metadata: this.createMinimalMetadata(source),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process files from Android share intent.
   */
  async processShareIntent(intent: {
    action: string;
    uris?: string[];
    types?: string[];
    streams?: ReadableStream<Uint8Array>[];
  }): Promise<IntakeResult[]> {
    const results: IntakeResult[] = [];

    if (intent.action === 'android.intent.action.SEND' && intent.uris?.[0]) {
      // Single file share
      const source = await this.createSourceFromUri(
        intent.uris[0],
        intent.types?.[0]
      );
      if (source) {
        results.push(await this.processSource(source));
      }
    } else if (intent.action === 'android.intent.action.SEND_MULTIPLE' && intent.uris) {
      // Multiple file share
      for (let i = 0; i < intent.uris.length; i++) {
        const source = await this.createSourceFromUri(
          intent.uris[i],
          intent.types?.[i]
        );
        if (source) {
          results.push(await this.processSource(source));
        }
      }
    }

    return results;
  }

  private async extractMetadata(source: UniversalFileSource): Promise<FileMetadata> {
    const category = detectCategory(source.mimeType, source.extension);

    return {
      name: source.name,
      extension: source.extension || '',
      mimeType: source.mimeType || 'application/octet-stream',
      size: source.size || 0,
      createdAt: source.createdAt,
      modifiedAt: source.modifiedAt,
      sourceApp: source.sourceApp,
      isAccessible: source.isAccessible,
      category,
    };
  }

  private createMinimalMetadata(source: UniversalFileSource): FileMetadata {
    return {
      name: source.name,
      extension: source.extension || '',
      mimeType: source.mimeType || 'application/octet-stream',
      size: source.size || 0,
      isAccessible: false,
      category: detectCategory(source.mimeType, source.extension),
    };
  }

  private async createSourceFromUri(
    uri: string,
    mimeType?: string
  ): Promise<UniversalFileSource | null> {
    try {
      // For web, try to fetch the URI
      if (typeof fetch !== 'undefined') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], uri.split('/').pop() || 'unknown', {
          type: mimeType || blob.type,
        });
        return createFileSource(file);
      }
    } catch {
      // URI not directly accessible
    }
    return null;
  }
}

export function createIntakePipeline(
  options?: IntakePipelineOptions
): FileIntakePipeline {
  return new FileIntakePipeline(options);
}
