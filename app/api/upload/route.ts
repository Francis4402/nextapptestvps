// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

// Helper function to safely delete image files
async function deleteImageFiles(imageUrls: string[]) {
  for (const imageUrl of imageUrls) {
    if (!imageUrl) continue
    
    try {
      // Extract filename from URL
      const filename = imageUrl.split('/').pop()
      if (!filename) continue
      
      const filePath = join(process.cwd(), 'uploads', filename)
      
      // Check if file exists and delete it
      if (existsSync(filePath)) {
        await unlink(filePath)
        console.log(`Deleted image file: ${filename}`)
      }
    } catch (error) {
      console.error('Error deleting image file:', error)
      // Don't throw error here - we still want to continue with other deletions
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    
    // Support single file upload for backward compatibility
    const file = formData.get('file') as File
    const filesToProcess = files.length > 0 ? files : file ? [file] : []

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Limit to 5 files maximum
    if (filesToProcess.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 files allowed' },
        { status: 400 }
      )
    }

    const results = []
    
    for (const file of filesToProcess) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
      if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} must be a valid image (JPEG, PNG, WEBP, GIF, SVG)` },
          { status: 400 }
        )
      }

      // Validate file size (max 10MB per image)
      const MAX_SIZE = 2 * 1024 * 1024 // 1MB
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} size must be less than 10MB` },
          { status: 400 }
        )
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const arrayBuffer = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer
      let buffer = Buffer.from(arrayBuffer)

      // Server-side compression if still over 2MB
      const TARGET_SIZE = 1 * 1024 * 1024 // 2MB
      if (buffer.length > TARGET_SIZE) {
        try {
          console.log(`Server-side compressing ${file.name} from ${(buffer.length / 1024 / 1024).toFixed(2)}MB`)
          
          const sharpInstance = sharp(buffer)
          const metadata = await sharpInstance.metadata()
          
          // Check if it's an SVG
          if (metadata.format === 'svg') {
            console.log('SVG image detected, skipping compression')
          } else {
            // Resize if width > 1920
            if (metadata.width && metadata.width > 1920) {
              sharpInstance.resize(1920, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
            }
            
            // Compress based on format with quality optimization
            const quality = Math.max(70, Math.floor(85 * (TARGET_SIZE / buffer.length)))
            
            if (metadata.format === 'jpeg') {
              buffer = Buffer.from(await sharpInstance
                .jpeg({ 
                  quality,
                  mozjpeg: true,
                  progressive: true
                })
                .toBuffer())
            } else if (metadata.format === 'png') {
              buffer = Buffer.from(await sharpInstance
                .png({ 
                  compressionLevel: 9,
                  palette: true,
                  progressive: true
                })
                .toBuffer())
            } else if (metadata.format === 'webp') {
              buffer = Buffer.from(await sharpInstance
                .webp({ 
                  quality,
                  effort: 6
                })
                .toBuffer())
            } else if (metadata.format === 'gif') {
              // Convert GIFs to WebP for better compression
              buffer = Buffer.from(await sharpInstance
                .webp({ 
                  quality: 80,
                  effort: 6
                })
                .toBuffer())
            }
            
            console.log(`${file.name} compressed to ${(buffer.length / 1024 / 1024).toFixed(2)}MB with quality ${quality}`)
          }
        } catch (error) {
          console.error(`Server-side compression failed for ${file.name}:`, error)
          // Continue with original buffer
        }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      
      // Determine extension based on format
      const metadata = await sharp(buffer).metadata()
      const extension = metadata.format || file.name.split('.').pop() || 'jpg'
      const filename = `${timestamp}-${randomString}.${extension}`

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      // Save file to uploads directory
      const filePath = join(uploadsDir, filename)
      await writeFile(filePath, buffer)

      // Return the URL path
      const url = `/api/images/${filename}`

      results.push({
        url,
        filename,
        size: buffer.length,
        originalSize: file.size,
        type: file.type,
        compressed: buffer.length < file.size,
        compressionRatio: Math.round((1 - buffer.length / file.size) * 100),
        name: file.name
      })
    }

    return NextResponse.json(filesToProcess.length === 1 ? results[0] : results)

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { urls } = body // Accept array of URLs
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'Image URLs array is required' },
        { status: 400 }
      )
    }

    await deleteImageFiles(urls)

    return NextResponse.json(
      { success: true, message: 'Images deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    )
  }
}