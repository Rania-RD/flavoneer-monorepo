export function compressImage(
  file: File,
  maxSizeKB = 500
): Promise<File> {
  return new Promise((resolve) => {
    // If it's not an image, resolve with original file
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    // Check size first, if it's already smaller than maxSizeKB, just return it
    const maxSizeBytes = maxSizeKB * 1024;
    if (file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate scaling factor to reduce size
        // If image is very large, reducing dimensions helps significantly with size
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image with calculated dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Quality reduction to hit target size, start at 0.8
        const initialQuality = 0.8;
        // HTMLCanvasElement.toBlob only supports "image/jpeg" or "image/webp" for quality setting. Let's use "image/jpeg"
        // Also webp yields better compression! Let's just use jpeg for best compatibility if webp has issues,
        // but webp is widely supported now. We'll stick to jpeg.
        const mimeType = "image/jpeg";

        const attemptCompression = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              if (blob.size <= maxSizeBytes || currentQuality <= 0.3) {
                // Return compressed blob as a File
                resolve(
                  new File(
                    [blob],
                    file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                    {
                      type: mimeType,
                      lastModified: Date.now(),
                    }
                  )
                );
              } else {
                // Still too large, reduce quality and try again
                attemptCompression(currentQuality - 0.1);
              }
            },
            mimeType,
            currentQuality
          );
        };

        attemptCompression(initialQuality);
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
