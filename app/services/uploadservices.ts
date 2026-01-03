// services/uploadService.ts
import imageCompression from 'browser-image-compression';

interface UploadResponse {
  url: string
  filename: string
  size: number
  type: string
}

interface UploadError {
  message: string
}

// Compression options
const compressionOptions = {
  maxSizeMB: 2, // Max size in MB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true, // Use web worker for better performance
  fileType: 'image/jpeg', // Convert to JPEG for better compression
  initialQuality: 0.8, // Initial quality (0.8 = 80%)
  alwaysKeepResolution: true,
}

export const compressImageIfNeeded = async (file: File): Promise<File> => {
  // Only compress if file is over 2MB
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  try {
    console.log(`Compressing image from ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    const compressedFile = await imageCompression(file, {
      ...compressionOptions,
      // Adjust quality based on original file size
      initialQuality: Math.max(0.5, 1 - (file.size - 2 * 1024 * 1024) / (10 * 1024 * 1024)),
    });

    console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
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

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  try {
    // Compress image if needed
    const processedFile = await compressImageIfNeeded(file);

    const formData = new FormData()
    formData.append('file', processedFile)
    formData.append('originalSize', file.size.toString())
    formData.append('processedSize', processedFile.size.toString())

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