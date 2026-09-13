// File Metadata Extraction
// Extracts metadata from files regardless of type

export interface FileMetadata {
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  hash?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  sourceApp?: string;
  sourcePath?: string;
  isAccessible: boolean;
  preview?: string | null;
  category: FileCategory;
}

export type FileCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'data'
  | 'executable'
  | 'font'
  | 'unknown';

const MIME_CATEGORIES: Record<string, FileCategory> = {
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/csv': 'document',
  'text/markdown': 'document',
  'application/rtf': 'document',

  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
  'image/avif': 'image',

  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/x-matroska': 'video',
  'video/mpeg': 'video',

  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  'audio/x-m4a': 'audio',
  'audio/webm': 'audio',

  // Archives
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',

  // Code
  'text/javascript': 'code',
  'text/typescript': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/json': 'code',
  'application/xml': 'code',
  'text/x-python': 'code',
  'text/x-rust': 'code',

  // Data
  'application/sqlite3': 'data',
  'application/octet-stream': 'data',

  // Executables
  'application/x-msdownload': 'executable',
  'application/vnd.android.package-archive': 'executable',
  'application/x-executable': 'executable',

  // Fonts
  'font/ttf': 'font',
  'font/otf': 'font',
  'font/woff': 'font',
  'font/woff2': 'font',
};

const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  txt: 'document',
  csv: 'document',
  md: 'document',
  rtf: 'document',
  odt: 'document',
  ods: 'document',

  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  tiff: 'image',
  tif: 'image',
  heic: 'image',
  heif: 'image',
  avif: 'image',
  ico: 'image',

  mp4: 'video',
  webm: 'video',
  ogg: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  mpeg: 'video',
  mpg: 'video',
  wmv: 'video',
  flv: 'video',

  mp3: 'audio',
  wav: 'audio',
  aac: 'audio',
  flac: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  opus: 'audio',
  wma: 'audio',

  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',

  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  html: 'code',
  css: 'code',
  json: 'code',
  xml: 'code',
  py: 'code',
  rs: 'code',
  go: 'code',
  java: 'code',
  c: 'code',
  cpp: 'code',
  h: 'code',
  swift: 'code',
  kt: 'code',

  db: 'data',
  sqlite: 'data',
  sqlite3: 'data',
  sql: 'data',

  exe: 'executable',
  msi: 'executable',
  apk: 'executable',
  dmg: 'executable',
  app: 'executable',
  deb: 'executable',
  rpm: 'executable',

  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
};

export function detectCategory(mimeType?: string, extension?: string): FileCategory {
  if (mimeType && MIME_CATEGORIES[mimeType]) {
    return MIME_CATEGORIES[mimeType];
  }

  if (extension && EXTENSION_CATEGORIES[extension.toLowerCase()]) {
    return EXTENSION_CATEGORIES[extension.toLowerCase()];
  }

  // Fallback: check if mimeType starts with a known prefix
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'document';
    if (mimeType.startsWith('application/')) {
      if (mimeType.includes('pdf')) return 'document';
      if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
      if (mimeType.includes('json') || mimeType.includes('xml')) return 'code';
    }
  }

  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getCategoryIcon(category: FileCategory): string {
  switch (category) {
    case 'document':
      return '📄';
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'archive':
      return '📦';
    case 'code':
      return '💻';
    case 'data':
      return '🗃️';
    case 'executable':
      return '⚙️';
    case 'font':
      return '🔤';
    default:
      return '📁';
  }
}
