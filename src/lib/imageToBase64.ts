/**
 * Client-side image compressor. Reads a File, draws it on a canvas at the
 * requested max dimension, re-encodes as JPEG (or keeps PNG when the source
 * is a PNG with alpha) at the requested quality, and returns a base64 data
 * URL. Used because Firestore documents cap at ~1 MB total — raw base64 of a
 * phone photo would blow past that limit, so we resize first.
 */

const DEFAULT_MAX_DIM = 1024
const DEFAULT_QUALITY = 0.82

export type CompressOptions = {
  maxDim?: number
  quality?: number
  /** When true, always re-encode as JPEG (smaller, no alpha). Default true. */
  forceJpeg?: boolean
}

export async function imageFileToBase64(
  file: File,
  opts: CompressOptions = {}
): Promise<string> {
  const { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY, forceJpeg = true } = opts

  // 1. Decode
  const dataUrl = await readFileAsDataURL(file)
  const img = await loadImage(dataUrl)

  // 2. Scale to fit maxDim on the longest side
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  // 3. Draw + re-encode
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available in this browser.')
  ctx.drawImage(img, 0, 0, w, h)

  const isPng = file.type === 'image/png' && !forceJpeg
  const mime = isPng ? 'image/png' : 'image/jpeg'
  const out = canvas.toDataURL(mime, isPng ? undefined : quality)

  // Final safety check — base64 docs bigger than ~900 KB will exceed Firestore
  // limits after other fields are added.
  const approxBytes = Math.ceil((out.length - out.indexOf(',') - 1) * 0.75)
  if (approxBytes > 900 * 1024) {
    throw new Error(
      `Image is too large after compression (${Math.round(approxBytes / 1024)} KB). ` +
        `Try a smaller photo.`
    )
  }
  return out
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('FileReader error'))
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image.'))
    img.src = src
  })
}