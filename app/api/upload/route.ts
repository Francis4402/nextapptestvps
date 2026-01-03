// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink  } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/\s+/g, '-')
    const filename = `${timestamp}-${originalName}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save file to public/uploads
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Return the URL path
    const url = `/uploads/${filename}`

    return NextResponse.json({ 
      url,
      filename,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Helper function to delete image file
async function deleteImageFile(imageUrl: string | null) {
  if (!imageUrl) return
  
  try {
    // Extract filename from URL
    const filename = imageUrl.split('/').pop()
    if (!filename) return
    
    const filePath = join(process.cwd(), 'public', 'uploads', filename)
    
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