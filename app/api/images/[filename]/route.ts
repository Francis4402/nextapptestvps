import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // IMPORTANT: Await the params
    const { filename } = await params

    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 })
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 })
    }

    const filePath = join(UPLOAD_DIR, filename)

    if (!existsSync(filePath)) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    
    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    }[ext || ''] || 'image/jpeg'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('Error serving image:', error)
    return new NextResponse('Error loading image', { status: 500 })
  }
}