import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const TARGET_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_DIMENSION = 1920

// Helper function to ensure upload directory exists
async function ensureUploadsDirectory() {
  try {
    const basePath = process.cwd()
    const uploadsDir = join(basePath, 'public', 'uploads')
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      console.log(`Creating uploads directory at: ${uploadsDir}`)
      await mkdir(uploadsDir, { recursive: true })
      
      // Set permissions (read/write for owner, read for others)
      try {
        await writeFile(join(uploadsDir, '.gitkeep'), '')
      } catch (e) {
        // Ignore .gitkeep creation errors
      }
    }
    
    // Check if directory is writable
    try {
      const testFile = join(uploadsDir, `.test-${Date.now()}`)
      await writeFile(testFile, 'test')
      await unlink(testFile)
    } catch (error) {
      console.error('Uploads directory is not writable:', error)
      throw new Error('Upload directory is not writable. Please check permissions.')
    }
    
    return uploadsDir
  } catch (error) {
    console.error('Error ensuring uploads directory:', error)
    throw error
  }
}

// Helper function to validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file || file.size === 0) {
    return { valid: false, error: 'No file provided or file is empty' }
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
  
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { 
      valid: false, 
      error: `Unsupported image format. Allowed formats: ${allowedTypes.join(', ').replace('image/', '')}` 
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(1)
    return { 
      valid: false, 
      error: `File size must be less than ${maxSizeMB}MB` 
    }
  }

  return { valid: true }
}

// Helper function to compress image
async function compressImage(buffer: Buffer, originalType: string): Promise<{ buffer: Buffer; format: string }> {
  try {
    const sharpInstance = sharp(buffer)
    const metadata = await sharpInstance.metadata()
    
    // Determine output format based on input and browser compatibility
    let outputFormat: 'jpeg' | 'png' | 'webp'
    
    if (originalType.includes('png') || originalType.includes('gif')) {
      outputFormat = 'png'
    } else if (originalType.includes('svg')) {
      // Convert SVG to PNG for better compatibility
      outputFormat = 'png'
    } else {
      outputFormat = 'jpeg' // Default to JPEG for best compression
    }
    
    // Resize if too large
    if (metadata.width && metadata.width > MAX_DIMENSION) {
      sharpInstance.resize(MAX_DIMENSION, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }
    
    // Calculate compression quality
    let quality = 85
    if (buffer.length > TARGET_FILE_SIZE) {
      // Reduce quality for larger files
      quality = Math.max(60, Math.floor(80 * (TARGET_FILE_SIZE / buffer.length)))
    }
    
    let compressedBuffer: Buffer
    
    if (outputFormat === 'jpeg') {
      compressedBuffer = await sharpInstance
        .jpeg({ 
          quality,
          mozjpeg: true,
          progressive: true,
          force: true
        })
        .toBuffer()
    } else if (outputFormat === 'png') {
      compressedBuffer = await sharpInstance
        .png({ 
          compressionLevel: 9,
          progressive: true,
          force: true
        })
        .toBuffer()
    } else {
      compressedBuffer = await sharpInstance
        .webp({ 
          quality,
          effort: 6,
          force: true
        })
        .toBuffer()
    }
    
    console.log(`Image compressed: ${(buffer.length / 1024 / 1024).toFixed(2)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    
    return {
      buffer: compressedBuffer,
      format: outputFormat
    }
  } catch (error) {
    console.error('Compression failed:', error)
    // Return original buffer if compression fails
    const format = originalType.includes('jpeg') || originalType.includes('jpg') ? 'jpeg' :
                   originalType.includes('png') ? 'png' :
                   originalType.includes('webp') ? 'webp' : 'jpeg'
    
    return { buffer, format }
  }
}

// Helper function to generate filename
function generateFilename(originalName: string, format: string): string {
  const timestamp = Date.now()
  const uniqueId = uuidv4().substring(0, 8)
  
  // Clean original filename
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, '-') // Replace special chars with hyphens
    .toLowerCase()
    .substring(0, 50) // Limit length
  
  return `${cleanName}-${timestamp}-${uniqueId}.${format}`
}

// POST handler for file upload
export async function POST(req: NextRequest) {
  console.log('[UPLOAD API] POST request received')
  
  // Add CORS headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  try {
    // Ensure upload directory exists and is writable
    const uploadsDir = await ensureUploadsDirectory()
    console.log('[UPLOAD API] Uploads directory ready:', uploadsDir)

    // Check content type
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      console.warn('[UPLOAD API] Invalid content type:', contentType)
      return NextResponse.json(
        { 
          success: false,
          error: 'Request must be multipart/form-data' 
        },
        { 
          status: 400,
          headers
        }
      )
    }

    // Parse form data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (error) {
      console.error('[UPLOAD API] Failed to parse form data:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid form data' 
        },
        { 
          status: 400,
          headers
        }
      )
    }

    // Get file from form data
    const file = formData.get('file') as File
    console.log('[UPLOAD API] File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    })

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error 
        },
        { 
          status: 400,
          headers
        }
      )
    }

    // Convert file to buffer
    let buffer: Buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('[UPLOAD API] Buffer created, size:', buffer.length, 'bytes')
    } catch (error) {
      console.error('[UPLOAD API] Failed to read file:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to read file' 
        },
        { 
          status: 500,
          headers
        }
      )
    }

    // Compress image if needed
    const { buffer: finalBuffer, format } = await compressImage(buffer, file.type)
    
    // Generate filename
    const filename = generateFilename(file.name, format)
    const filePath = join(uploadsDir, filename)
    
    // Save file
    try {
      await writeFile(filePath, finalBuffer)
      
      // Verify file was saved
      const stats = await stat(filePath)
      console.log('[UPLOAD API] File saved successfully:', {
        path: filePath,
        size: stats.size,
        savedSize: finalBuffer.length
      })
    } catch (error) {
      console.error('[UPLOAD API] Failed to save file:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save file to server' 
        },
        { 
          status: 500,
          headers
        }
      )
    }

    // Create URL (relative path for Next.js)
    const url = `/uploads/${filename}`
    
    // Calculate compression stats
    const compressionRatio = Math.round((1 - finalBuffer.length / file.size) * 100)
    const wasCompressed = finalBuffer.length < buffer.length
    
    console.log('[UPLOAD API] Upload successful:', {
      url,
      filename,
      originalSize: file.size,
      finalSize: finalBuffer.length,
      compressionRatio: `${compressionRatio}%`,
      wasCompressed
    })

    // Return success response
    return NextResponse.json(
      {
        success: true,
        url,
        filename,
        size: finalBuffer.length,
        originalSize: file.size,
        type: file.type,
        compressed: wasCompressed,
        compressionRatio,
        format,
        message: 'File uploaded successfully'
      },
      {
        status: 200,
        headers
      }
    )

  } catch (error) {
    console.error('[UPLOAD API] Unexpected error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { 
        status: 500,
        headers
      }
    )
  }
}

// DELETE handler for removing files
export async function DELETE(req: NextRequest) {
  console.log('[UPLOAD API] DELETE request received')
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  try {
    const body = await req.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No image URL provided' 
        },
        { 
          status: 400,
          headers
        }
      )
    }

    // Extract filename from URL
    const filename = url.split('/').pop()
    if (!filename) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid image URL' 
        },
        { 
          status: 400,
          headers
        }
      )
    }

    // Get uploads directory
    const uploadsDir = await ensureUploadsDirectory()
    const filePath = join(uploadsDir, filename)

    // Check if file exists
    if (!existsSync(filePath)) {
      console.warn('[UPLOAD API] File not found:', filePath)
      return NextResponse.json(
        { 
          success: false,
          error: 'File not found' 
        },
        { 
          status: 404,
          headers
        }
      )
    }

    // Delete file
    await unlink(filePath)
    console.log('[UPLOAD API] File deleted:', filename)

    return NextResponse.json(
      { 
        success: true,
        message: 'Image deleted successfully' 
      },
      { 
        status: 200,
        headers
      }
    )

  } catch (error) {
    console.error('[UPLOAD API] Delete error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete image',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { 
        status: 500,
        headers
      }
    )
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  console.log('[UPLOAD API] OPTIONS request (CORS preflight)')
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// GET handler for testing
export async function GET(req: NextRequest) {
  console.log('[UPLOAD API] GET request received')
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })

  try {
    // Get uploads directory
    const uploadsDir = await ensureUploadsDirectory()
    
    return NextResponse.json(
      {
        success: true,
        message: 'Upload API is working',
        serverTime: new Date().toISOString(),
        uploadsDirectory: uploadsDir,
        environment: process.env.NODE_ENV || 'development',
        limits: {
          maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
          targetFileSize: `${TARGET_FILE_SIZE / 1024 / 1024}MB`,
          maxDimension: MAX_DIMENSION
        }
      },
      {
        status: 200,
        headers
      }
    )
  } catch (error) {
    console.error('[UPLOAD API] GET error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'API check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers
      }
    )
  }
}