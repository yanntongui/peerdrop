// Tauri Integration Layer
// Detects if running in Tauri and provides native API access

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function getDeviceInfo() {
  if (!isTauri()) {
    return {
      os: navigator.platform,
      arch: 'unknown',
      app: 'PeerDrop Web',
      version: '0.1.0',
    };
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_device_info');
  } catch {
    return { os: 'unknown', arch: 'unknown', app: 'PeerDrop', version: '0.1.0' };
  }
}

export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return '0.1.0';
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_app_version');
  } catch {
    return '0.1.0';
  }
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_always_on_top', { enabled });
  } catch (e) {
    console.warn('Failed to set always on top:', e);
  }
}

export async function minimizeToTray(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('minimize_to_tray');
  } catch (e) {
    console.warn('Failed to minimize to tray:', e);
  }
}

export async function setupDragAndDrop(): Promise<{
  onDragDrop: (callback: (paths: string[]) => void) => Promise<() => void>;
}> {
  if (!isTauri()) {
    return {
      onDragDrop: async () => () => {},
    };
  }

  try {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    const webview = getCurrentWebview();

    return {
      onDragDrop: async (callback: (paths: string[]) => void) => {
        const unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'drop') {
            callback(event.payload.paths);
          }
        });
        return unlisten;
      },
    };
  } catch {
    return { onDragDrop: async () => () => {} };
  }
}

export async function openUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, '_blank');
    return;
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank');
  }
}
