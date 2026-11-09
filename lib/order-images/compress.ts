// Client-side image compression before upload.
//
// Reduces file size 80-90% by resizing to max 1920px and compressing to
// JPEG quality 0.8. This is critical for Cloudflare Tunnel (100s timeout)
// and slow mobile connections.
//
// Falls back to the original file if compression fails or the file is
// already small enough.

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.8
const COMPRESS_THRESHOLD_BYTES = 500 * 1024 // 500KB — skip if already small

export async function compressImage(file: File): Promise<File> {
  // Skip if already small
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file

  // Skip non-image or already compressed types
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap

    // Resize if larger than max dimension
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) return file

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '.jpg')
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    // Compression failed — fall back to original
    return file
  }
}
