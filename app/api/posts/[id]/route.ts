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

// Improved helper function with better error handling
async function deleteImageFile(imageUrl: string) {
    try {
        // Validate URL format
        if (!imageUrl.startsWith('/uploads/')) {
            return {
                success: false,
                error: 'Invalid image URL format'
            };
        }

        // Extract filename safely
        const filename = imageUrl.substring('/uploads/'.length);
        if (!filename || filename.includes('..')) {
            return {
                success: false,
                error: 'Invalid filename'
            };
        }

        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadsDir, filename);
        
        // Check if file exists
        if (!existsSync(filePath)) {
            return {
                success: false,
                error: 'Image file not found',
                warning: true
            };
        }

        // Delete the file
        await unlink(filePath);
        
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