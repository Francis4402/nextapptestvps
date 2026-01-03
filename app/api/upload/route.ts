import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, access, constants } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

// Helper function to ensure upload directory exists
async function ensureUploadsDirectory() {
  // Determine the base path based on environment
  const basePath = process.cwd()
  const uploadsDir = join(basePath, 'public', 'uploads')
  
  try {
    // Check if directory exists
    await access(uploadsDir, constants.F_OK)
  } catch (error) {
    // Directory doesn't exist, create it
    console.log(`Creating uploads directory at: ${uploadsDir}`)
    await mkdir(uploadsDir, { recursive: true })
  }
  
  return uploadsDir
}

// Helper function to safely delete image file
async function deleteImageFile(imageUrl: string | null) {
  if (!imageUrl) return
  
  try {
    // Extract filename from URL
    const filename = imageUrl.split('/').pop()
    if (!filename) return
    
    const uploadsDir = await ensureUploadsDirectory()
    const filePath = join(uploadsDir, filename)
    
    // Check if file exists and delete it
    if (existsSync(filePath)) {
      await unlink(filePath)
      console.log(`Deleted image file: ${filename}`)
    }
  } catch (error) {
    console.error('Error deleting image file:', error)
    // Don't throw error here - we still want to delete the post from DB
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ensure upload directory exists
    await ensureUploadsDirectory()
    
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be a valid image (JPEG, PNG, WEBP, GIF, SVG)' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const arrayBuffer = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer
    let buffer = Buffer.from(arrayBuffer)

    // Server-side compression if still over 2MB
    const TARGET_SIZE = 2 * 1024 * 1024; // 2MB
    if (buffer.length > TARGET_SIZE) {
      try {
        console.log(`Server-side compressing image from ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        const sharpInstance = sharp(buffer);
        
        // Get image metadata
        const metadata = await sharpInstance.metadata();
        
        // Check if it's an SVG (sharp can't compress SVGs directly)
        if (metadata.format === 'svg') {
          console.log('SVG image detected, skipping compression');
        } else {
          // Resize if width > 1920
          if (metadata.width && metadata.width > 1920) {
            sharpInstance.resize(1920, null, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }
          
          // Compress based on format with quality optimization
          const quality = Math.max(70, Math.floor(85 * (TARGET_SIZE / buffer.length)));
          
          if (metadata.format === 'jpeg') {
            buffer = Buffer.from(await sharpInstance
              .jpeg({ 
                quality,
                mozjpeg: true,
                progressive: true
              })
              .toBuffer());
          } else if (metadata.format === 'png') {
            buffer = Buffer.from(await sharpInstance
              .png({ 
                compressionLevel: 9,
                palette: true,
                progressive: true
              })
              .toBuffer());
          } else if (metadata.format === 'webp') {
            buffer = Buffer.from(await sharpInstance
              .webp({ 
                quality,
                effort: 6
              })
              .toBuffer());
          } else if (metadata.format === 'gif') {
            buffer = Buffer.from(await sharpInstance
              .webp({ 
                quality: 80,
                effort: 6
              })
              .toBuffer());
          }
          
          console.log(`Compressed to ${(buffer.length / 1024 / 1024).toFixed(2)}MB with quality ${quality}`);
        }
      } catch (error) {
        console.error('Server-side compression failed:', error);
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    
    // Determine extension based on format
    const metadata = await sharp(buffer).metadata();
    const extension = metadata.format || file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomString}.${extension}`

    // Get uploads directory path
    const uploadsDir = await ensureUploadsDirectory()

    // Save file to public/uploads
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Return the URL path - use relative path for Next.js
    const url = `/uploads/${filename}`

    return NextResponse.json({ 
      url,
      filename,
      size: buffer.length,
      originalSize: file.size,
      type: file.type,
      compressed: buffer.length < file.size,
      compressionRatio: Math.round((1 - buffer.length / file.size) * 100),
      filePath: url // Return the relative path
    })

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
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      )
    }

    await deleteImageFile(url)

    return NextResponse.json(
      { success: true, message: 'Image deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}