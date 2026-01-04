// services/uploadService.ts
import imageCompression from 'browser-image-compression'

interface UploadResponse {
  url: string
  filename: string
  size: number
  originalSize: number
  type: string
  compressed: boolean
  compressionRatio: number
  name: string
}

interface UploadError {
  message: string
}

// Compression options
const compressionOptions = {
  maxSizeMB: 2, // Max size in MB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
  alwaysKeepResolution: true,
}

export const compressImageIfNeeded = async (file: File): Promise<File> => {
  // Only compress if file is over 2MB
  if (file.size <= 2 * 1024 * 1024) {
    return file
  }

  try {
    console.log(`Compressing image from ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    
    const compressedFile = await imageCompression(file, {
      ...compressionOptions,
      initialQuality: Math.max(0.5, 1 - (file.size - 2 * 1024 * 1024) / (10 * 1024 * 1024)),
    })

    console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return compressedFile
  } catch (error) {
    console.error('Compression failed:', error)
    return file
  }
}

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please select a valid image file (JPEG, PNG, WEBP, GIF)' 
    }
  }

  // Validate file size (10MB max before compression)
  if (file.size > 10 * 1024 * 1024) {
    return { 
      valid: false, 
      error: 'Image size must be less than 10MB before compression' 
    }
  }

  return { valid: true }
}

export const validateMultipleImages = (files: File[]): { valid: boolean; error?: string } => {
  // Check maximum number of images
  if (files.length > 5) {
    return {
      valid: false,
      error: 'Maximum 5 images allowed'
    }
  }

  // Check total size (max 20MB for all images)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: 'Total image size must be less than 20MB'
    }
  }

  // Validate each file
  for (const file of files) {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return validation
    }
  }

  return { valid: true }
}

export const uploadMultipleImages = async (files: File[]): Promise<UploadResponse[]> => {
  try {
    const processedFiles = await Promise.all(
      files.map(file => compressImageIfNeeded(file))
    )

    const formData = new FormData()
    processedFiles.forEach((file, index) => {
      formData.append('files', file)
    })

    // DEBUG: Log the API URL
    const apiUrl = '/api/upload'
    console.log('Uploading to:', apiUrl)
    console.log('Files to upload:', processedFiles.length)

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    })

    console.log('Response status:', response.status)

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response:', text.substring(0, 500))
      
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        throw new Error('Server returned HTML page. Check if /api/upload route exists.')
      }
      throw new Error(`Invalid response type: ${contentType}`)
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log('Upload successful:', data)
    
    // Handle both single and multiple file responses
    if (Array.isArray(data)) {
      return data
    } else {
      return [data]
    }
  } catch (error) {
    console.error('Upload error details:', error)
    throw error
  }
}

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  const results = await uploadMultipleImages([file])
  return results[0]
}

export const deleteImages = async (imageUrls: string[]): Promise<boolean> => {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: imageUrls }),
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

export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  return deleteImages([imageUrl])
}