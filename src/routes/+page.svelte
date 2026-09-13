<script lang="ts">
  import '../app.css';
</script>

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
  <div class="container mx-auto px-4 py-16">
    <!-- Hero -->
    <div class="text-center mb-16">
      <h1 class="text-6xl font-bold mb-4 bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
        PeerDrop
      </h1>
      <p class="text-xl text-slate-400 max-w-2xl mx-auto">
        Share files up to 50GB directly between devices. No servers, no limits, end-to-end encrypted.
      </p>
    </div>

    <!-- Drop Zone -->
    <div class="max-w-2xl mx-auto mb-16">
      <div class="border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center hover:border-sky-500 transition-colors cursor-pointer bg-slate-800/50 backdrop-blur">
        <div class="text-6xl mb-4">📁</div>
        <p class="text-lg text-slate-300 mb-4">Drag & drop files here</p>
        <p class="text-sm text-slate-500">or click to browse</p>
      </div>
    </div>

    <!-- Features -->
    <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
      <div class="bg-slate-800/50 rounded-xl p-6 backdrop-blur">
        <div class="text-3xl mb-3">🔒</div>
        <h3 class="font-semibold mb-2">End-to-End Encrypted</h3>
        <p class="text-sm text-slate-400">Files are encrypted with DTLS 1.3. Only you and the receiver can access them.</p>
      </div>
      <div class="bg-slate-800/50 rounded-xl p-6 backdrop-blur">
        <div class="text-3xl mb-3">⚡</div>
        <h3 class="font-semibold mb-2">No Size Limits</h3>
        <p class="text-sm text-slate-400">Send files of any size up to 50GB. Direct P2P transfer, no storage needed.</p>
      </div>
      <div class="bg-slate-800/50 rounded-xl p-6 backdrop-blur">
        <div class="text-3xl mb-3">🌐</div>
        <h3 class="font-semibold mb-2">Peer-to-Peer</h3>
        <p class="text-sm text-slate-400">Files go directly from your device to theirs. No intermediate servers.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center mt-16 text-slate-500 text-sm">
      <p>Open source • Privacy first • No accounts required</p>
    </div>
  </div>
</main>
