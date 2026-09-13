// Transfer Core Package
// Universal transfer engine for PeerDrop

export type {
  TransferSession,
  FileTransferInfo,
  TransferManifest,
  TransferStatus,
  FileTransferStatus,
} from './session';
export {
  createTransferSession,
  updateSessionProgress,
  saveTransferSession,
  getAllTransferSessions,
  getTransferSession,
  deleteTransferSession,
  createManifest,
  updateManifestChunk,
  isManifestComplete,
  getResumePoint,
} from './session';

export { DEFAULT_CHUNK_SIZE, calculateOptimalChunkSize } from './streaming';
export type { ChunkInfo, StreamOptions } from './streaming';
export { streamFile, streamFileRange, receiveChunks } from './streaming';

export type { IntegrityResult, IntegrityManifest, FileIntegrityInfo } from './integrity';
export {
  hashData,
  hashStream,
  verifyIntegrity,
  verifyStreamIntegrity,
  createIntegrityManifest,
  saveIntegrityManifest,
  getIntegrityManifest,
} from './integrity';

export type {
  Destination,
  DestinationType,
  DestinationStatus,
  PeerDropDevice,
  USBDevice,
  NASDevice,
  LocalStorage,
} from './destinations';
export {
  getAllDestinations,
  saveDestination,
  removeDestination,
  getDestinationById,
  getDestinationsByType,
  getAvailableDestinations,
  getDestinationIcon,
  getDestinationTypeLabel,
  formatCapacity,
  getAvailableSpace,
} from './destinations';

export type { CollisionAction, CollisionInfo, CollisionResolution, CollisionResolver } from './collisions';
export {
  createCollisionResolver,
  generateUniqueName,
  checkCollision,
  formatCollisionMessage,
} from './collisions';
