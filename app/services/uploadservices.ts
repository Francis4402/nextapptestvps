// services/uploadService.ts

interface UploadResponse {
  url: string
  filename: string
  size: number
  type: string
}

interface UploadError {
  message: string
}

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' }
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image size must be less than 5MB' }
  }

  return { valid: true }
}

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    const data: UploadResponse = await response.json()
    return data
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    })

    if (!response.ok) {
      throw new Error('Delete failed')
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}