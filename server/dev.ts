import { Server } from 'socket.io';

const PORT = parseInt(process.env.PORT || '3001');
const io = new Server(PORT, {
  cors: { origin: '*' },
});

const rooms = new Map<string, Map<string, any>>();
const shareLinks = new Map<string, { roomId: string; files: any[]; expiresAt: number | null; maxDownloads: number; downloads: number }>();

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('join-room', (roomId, peerInfo) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId)!.set(socket.id, peerInfo);
    const peers = Array.from(rooms.get(roomId)!.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ id, ...info }));
    socket.emit('peers-in-room', peers);
    socket.to(roomId).emit('peer-joined', { id: socket.id, ...peerInfo });
    console.log(`  ${socket.id} joined room ${roomId} (${peers.length} existing peers)`);
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    rooms.get(roomId)?.delete(socket.id);
    socket.to(roomId).emit('peer-left', socket.id);
  });

  socket.on('disconnect', () => {
    for (const [roomId, peers] of rooms) {
      if (peers.has(socket.id)) {
        peers.delete(socket.id);
        socket.to(roomId).emit('peer-left', socket.id);
      }
    }
    console.log(`[-] Disconnected: ${socket.id}`);
  });

  socket.on('discover', (roomId) => {
    const peers = rooms.has(roomId)
      ? Array.from(rooms.get(roomId)!.entries())
          .filter(([id]) => id !== socket.id)
          .map(([id, info]) => ({ id, ...info }))
      : [];
    socket.emit('peers-in-room', peers);
  });

  socket.on('create-share-link', ({ roomId, files, expiresIn, maxDownloads }) => {
    const id = `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const link = {
      roomId,
      files,
      expiresAt: expiresIn ? Date.now() + expiresIn : null,
      maxDownloads: maxDownloads || 0,
      downloads: 0,
    };
    shareLinks.set(id, link);
    socket.emit('share-link-created', { id, ...link });
    console.log(`  Share link created: ${id}`);
  });

  socket.on('resolve-share-link', (linkId) => {
    const link = shareLinks.get(linkId);
    if (!link) {
      socket.emit('share-link-error', { error: 'Link not found' });
      return;
    }
    if (link.expiresAt && Date.now() > link.expiresAt) {
      shareLinks.delete(linkId);
      socket.emit('share-link-error', { error: 'Link expired' });
      return;
    }
    if (link.maxDownloads > 0 && link.downloads >= link.maxDownloads) {
      shareLinks.delete(linkId);
      socket.emit('share-link-error', { error: 'Download limit reached' });
      return;
    }
    link.downloads++;
    socket.emit('share-link-resolved', { roomId: link.roomId, files: link.files });
    console.log(`  Share link resolved: ${linkId} (${link.downloads} downloads)`);
  });
});

console.log(`PeerDrop signaling server running on port ${PORT}`);
