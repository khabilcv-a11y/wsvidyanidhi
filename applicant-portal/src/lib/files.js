const MAX_PDF = 2 * 1024 * 1024

// Phone photos are shrunk before upload so storage lasts and uploads are fast (about 250 KB each).
export async function prepareFile(file) {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF) throw new Error('This PDF is larger than 2 MB. Please choose a smaller file or take a photo instead.')
    return file
  }
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG or PNG) or a PDF.')
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This image format is not supported. Please use JPG or PNG.')
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
  if (!blob) throw new Error('Could not process this image. Please try another photo.')
  return new File([blob], 'document.jpg', { type: 'image/jpeg' })
}
