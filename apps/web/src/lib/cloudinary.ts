'use client'

// Direct browser upload to Cloudinary using an unsigned upload preset.
// Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
// Create the preset in Cloudinary dashboard → Settings → Upload → Add upload preset
// → Signing Mode: Unsigned. Optionally restrict folder/formats there.

export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
}

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  )
}

export async function uploadImageToCloudinary(
  file: File,
  opts?: { folder?: string; onProgress?: (pct: number) => void },
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !preset) {
    throw new Error(
      'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
    )
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)
  if (opts?.folder) formData.append('folder', opts.folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    if (opts?.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) opts.onProgress!(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onerror = () => reject(new Error('Network error uploading image'))
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(body?.error?.message || `Upload failed (${xhr.status})`))
          return
        }
        resolve({
          secureUrl: body.secure_url,
          publicId: body.public_id,
          width: body.width,
          height: body.height,
          format: body.format,
          bytes: body.bytes,
        })
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Invalid upload response'))
      }
    }

    xhr.send(formData)
  })
}
