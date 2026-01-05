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
    
    const file = formData.get('file') as File
    const filesToProcess = files.length > 0 ? files : file ? [file] : []

    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const results = []
    const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
    
    for (const file of filesToProcess) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} must be JPEG, PNG, WEBP, or GIF` },
          { status: 400 }
        )
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      let buffer = Buffer.from(bytes)

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      
      let sharpInstance = sharp(buffer)
      let metadata = await sharpInstance.metadata()
      
      // Compression function
      const compressToUnder1MB = async (buffer: Buffer): Promise<Buffer> => {
        let currentBuffer = buffer
        let quality = 85
        
        while (currentBuffer.length > MAX_FILE_SIZE && quality >= 30) {
          sharpInstance = sharp(currentBuffer)
          
          // Resize if width > 1200px
          const targetWidth = 1200
          if (metadata.width && metadata.width > targetWidth) {
            sharpInstance = sharpInstance.resize(targetWidth, null, {
              fit: 'inside',
              withoutEnlargement: true
            })
          }
          
          // Compress based on format
          if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            currentBuffer = await sharpInstance
              .jpeg({ 
                quality: Math.max(50, quality),
                mozjpeg: true
              })
              .toBuffer()
          } else if (metadata.format === 'png') {
            // Convert PNG to WebP for better compression
            currentBuffer = await sharpInstance
              .webp({ quality: 75 })
              .toBuffer()
          } else if (metadata.format === 'webp') {
            currentBuffer = await sharpInstance
              .webp({ quality: Math.max(50, quality) })
              .toBuffer()
          } else if (metadata.format === 'gif') {
            currentBuffer = await sharpInstance
              .webp({ quality: 70 })
              .toBuffer()
          }
          
          quality -= 15 // Reduce quality for next iteration
          
          // Update metadata
          metadata = await sharp(currentBuffer).metadata()
          
          // If still too large and we can resize smaller
          if (currentBuffer.length > MAX_FILE_SIZE && metadata.width && metadata.width > 600) {
            // Reset and try smaller size
            sharpInstance = sharp(buffer)
            currentBuffer = await sharpInstance
              .resize(600, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 70 })
              .toBuffer()
          }
        }
        
        // Final check - if still too large, use last resort
        if (currentBuffer.length > MAX_FILE_SIZE) {
          sharpInstance = sharp(currentBuffer)
          currentBuffer = await sharpInstance
            .resize(400, null, { fit: 'inside' })
            .jpeg({ quality: 60 })
            .toBuffer()
        }
        
        return currentBuffer
      }

      // Compress if needed
      if (buffer.length > MAX_FILE_SIZE) {
        buffer = await compressToUnder1MB(buffer) as any
        
        // Final verification
        if (buffer.length > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `Unable to compress ${file.name} to under 1MB. Please use a smaller image.` },
            { status: 400 }
          )
        }
      }

      // Get final format
      const finalMetadata = await sharp(buffer).metadata()
      const finalFormat = finalMetadata.format || 'jpg'
      const filename = `${timestamp}-${randomString}.${finalFormat}`

      // Save file
      const uploadsDir = join(process.cwd(), 'uploads')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const filePath = join(uploadsDir, filename)
      await writeFile(filePath, buffer)

      results.push({
        url: `/api/images/${filename}`,
        filename,
        size: buffer.length,
        originalSize: file.size,
        isUnder1MB: buffer.length <= MAX_FILE_SIZE,
        compressed: buffer.length < file.size
      })
    }

    return NextResponse.json(results.length === 1 ? results[0] : results)

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