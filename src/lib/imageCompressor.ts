export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith('data:video') ||
    /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) ||
    url.includes('video/upload') ||
    url.includes('/video/')
  );
}

/**
 * Helper utility to resize and compress a base64 image string client-side.
 * This ensures uploaded/captured files remain crisp, fast, and within storage quotas.
 */
export function compressBase64Image(base64Str: string, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string') {
      resolve(base64Str || '');
      return;
    }

    if (!base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    // If string is already small (under 80KB), resolve directly
    if (base64Str.length < 90000) {
      resolve(base64Str);
      return;
    }

    // Safety timeout: Never leave Promise unresolved
    const timer = setTimeout(() => {
      resolve(base64Str);
    }, 3500);

    try {
      const img = new Image();
      
      // Do NOT set crossOrigin on data: URLs because WebKit/Safari will fail with security/taint errors
      if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        clearTimeout(timer);
        try {
          let width = img.width || 1;
          let height = img.height || 1;

          const targetMax = maxDimension || 1200;

          if (width > targetMax || height > targetMax) {
            if (width > height) {
              height = Math.round((height * targetMax) / width);
              width = targetMax;
            } else {
              width = Math.round((width * targetMax) / height);
              height = targetMax;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Str);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const isPng = base64Str.startsWith('data:image/png');
          if (!isPng) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputType, quality);

          resolve(compressed || base64Str);
        } catch (e) {
          console.warn("Canvas compression error, using raw image:", e);
          resolve(base64Str);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(base64Str);
      };

      img.src = base64Str;
    } catch (e) {
      clearTimeout(timer);
      resolve(base64Str);
    }
  });
}
