// File Core Package
// Universal file access and metadata

export type { UniversalFileSource, UniversalFileSourceFactory, FileSourceCapability } from './source';
export { BlobFileSource, ArrayBufferFileSource, StreamFileSource, createFileSource, createBufferSource, createStreamSource } from './sources';
export type { FileMetadata, FileCategory } from './metadata';
export { detectCategory, formatFileSize, getCategoryIcon } from './metadata';
export type { IntakeResult, IntakeStatus, IntakePipelineOptions } from './intake';
export { FileIntakePipeline, createIntakePipeline } from './intake';
