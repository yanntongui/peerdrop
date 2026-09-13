// Mobile Integration Layer
// Capacitor plugins for camera, share sheet, file system

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('Capacitor' in window)
  );
}

export function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

// Native Share Sheet
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (isMobile()) {
    try {
      const { Share } = await import('@capacitor/share');

      const shareOptions: any = {
        title: options.title || 'PeerDrop',
        text: options.text || 'Share files with PeerDrop',
      };

      if (options.url) {
        shareOptions.url = options.url;
      }

      await Share.share(shareOptions);
      return true;
    } catch (e) {
      console.warn('Capacitor Share failed, trying Web Share API:', e);
      return webShare(options);
    }
  }

  return webShare(options);
}

async function webShare(options: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const shareData: ShareData = {
      title: options.title,
      text: options.text,
      url: options.url,
    };

    if (options.files && options.files.length > 0) {
      shareData.files = options.files;
    }

    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
}

// File System Access
export async function readFileFromDevice(filePath: string): Promise<string | null> {
  if (!isMobile()) return null;

  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path: filePath,
    });

    return result.data as string;
  } catch (e) {
    console.warn('Read file failed:', e);
    return null;
  }
}

export async function writeFileToDevice(
  filePath: string,
  data: string
): Promise<boolean> {
  if (!isMobile()) return false;

  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: filePath,
      data,
      recursive: true,
    });
    return true;
  } catch (e) {
    console.warn('Write file failed:', e);
    return false;
  }
}

// Get app info
export async function getAppInfo(): Promise<{
  name: string;
  version: string;
  platform: string;
}> {
  if (isMobile()) {
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      return {
        name: info.name,
        version: info.version,
        platform: 'mobile',
      };
    } catch {
      // Fallback
    }
  }

  return {
    name: 'PeerDrop',
    version: '0.1.0',
    platform: 'web',
  };
}

// Placeholder for future barcode scanner integration
export async function scanQRCode(): Promise<string | null> {
  // Barcode scanner requires @capacitor/barcode-scanner package
  // For now, return null to trigger manual input fallback
  return null;
}
