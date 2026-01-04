import { db } from "@/db/db";
import { postTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const id = req.nextUrl.pathname.split("/").pop();
        if (!id) {
            return NextResponse.json({ error: 'No post ID provided' }, { status: 400 });
        }

        const data = await db.select().from(postTable).where(
            eq(postTable.id, id)
        );

        return NextResponse.json({success: true, data});
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Failed to get post' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: 'No post ID provided' }, { status: 400 });
    }

    const body = await req.json();
    
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Update the post
    const [updatedPost] = await db.update(postTable)
      .set({
        title: body.title,
        content: body.content,
        image: body.image || null,
        updatedAt: new Date(),
      })
      .where(eq(postTable.id, id))
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: updatedPost,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update post',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
    let postImageUrl: string | null = null;
    
    try {
        const id = req.nextUrl.pathname.split("/").pop();
        
        if (!id) {
            return NextResponse.json({ error: 'No post ID provided' }, { status: 400 });
        }

        // First, get the post to access the image URL
        const [post] = await db.select().from(postTable).where(
            eq(postTable.id, id)
        ).limit(1);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Store the image URL for deletion (even if it's null)
        postImageUrl = post.image || null;

        // Delete the post from database
        const deleted = await db.delete(postTable).where(
            eq(postTable.id, id)
        );

        // Initialize response
        const response: any = { 
            success: true, 
            deleted,
            message: 'Post deleted successfully'
        };

        // If post had an image, try to delete it from filesystem
        if (postImageUrl) {
            const imageDeleteResult = await deleteImageFile(postImageUrl);
            if (imageDeleteResult.success) {
                response.message = 'Post and associated image deleted successfully';
                response.imageDeleted = true;
            } else {
                // Still success for post deletion, but note image deletion issue
                response.message = 'Post deleted, but there was an issue deleting the image file';
                response.imageDeleted = false;
                response.imageError = imageDeleteResult.error;
            }
        }

        return NextResponse.json(response);
        
    } catch (error) {
        console.error('Error in DELETE:', error);
        
        // Clean up: if post was deleted but image deletion failed
        if (postImageUrl) {
            try {
                await deleteImageFile(postImageUrl);
            } catch (cleanupError) {
                console.error('Cleanup deletion also failed:', cleanupError);
            }
        }
        
        return NextResponse.json({ 
            error: 'Failed to delete post',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Updated helper function to handle both URL formats
async function deleteImageFile(imageUrl: string) {
    try {
        let filename: string;

        // Handle both URL formats: /uploads/filename.jpg and /api/images/filename.jpg
        if (imageUrl.startsWith('/api/images/')) {
            filename = imageUrl.substring('/api/images/'.length);
        } else if (imageUrl.startsWith('/uploads/')) {
            filename = imageUrl.substring('/uploads/'.length);
        } else {
            return {
                success: false,
                error: 'Invalid image URL format'
            };
        }

        // Security check
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return {
                success: false,
                error: 'Invalid filename'
            };
        }

        // Use the UPLOAD_DIR (same as in upload route)
        const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
        const filePath = join(UPLOAD_DIR, filename);
        
        // Check if file exists
        if (!existsSync(filePath)) {
            console.warn(`Image file not found: ${filePath}`);
            return {
                success: false,
                error: 'Image file not found',
                warning: true
            };
        }

        // Delete the file
        await unlink(filePath);
        console.log(`Successfully deleted image: ${filename}`);
        
        return {
            success: true,
            message: `Image file deleted: ${filename}`
        };
        
    } catch (error) {
        console.error('Error in deleteImageFile:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error deleting image'
        };
    }
}