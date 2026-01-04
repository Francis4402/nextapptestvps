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

    // Get the current post to find old images that need to be deleted
    const [currentPost] = await db.select()
      .from(postTable)
      .where(eq(postTable.id, id))
      .limit(1);

    if (!currentPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Find images to delete (images in current post but not in updated post)
    const oldImages = currentPost.images || [];
    const newImages = body.images || [];
    const imagesToDelete = oldImages.filter(
      url => !newImages.includes(url)
    );

    // Delete old images that are no longer needed
    if (imagesToDelete.length > 0) {
      console.log(`Deleting ${imagesToDelete.length} old images that are no longer used`);
      const deleteResults = await deleteImageFiles(imagesToDelete);
      
      if (deleteResults.failedCount > 0) {
        console.warn(`Failed to delete ${deleteResults.failedCount} old images`);
      }
    }

    // Update the post
    const [updatedPost] = await db.update(postTable)
      .set({
        title: body.title,
        content: body.content,
        images: newImages.length > 0 ? newImages : null,
        updatedAt: new Date(),
      })
      .where(eq(postTable.id, id))
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: updatedPost,
      deletedImagesCount: imagesToDelete.length,
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
    let postImageUrls: string[] | null = null;
    
    try {
        const id = req.nextUrl.pathname.split("/").pop();
        
        if (!id) {
            return NextResponse.json({ error: 'No post ID provided' }, { status: 400 });
        }

        // First, get the post to access the image URLs
        const [post] = await db.select().from(postTable).where(
            eq(postTable.id, id)
        ).limit(1);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Store the image URLs for deletion
        postImageUrls = post.images || [];

        // Delete the post from database
        const deleted = await db.delete(postTable).where(
            eq(postTable.id, id)
        );

        // Initialize response
        const response: any = { 
            success: true, 
            deleted,
            deletedImageCount: 0,
            failedImageCount: 0,
            message: 'Post deleted successfully'
        };

        // If post had images, try to delete them from filesystem
        if (postImageUrls && postImageUrls.length > 0) {
            const deleteResults = await deleteImageFiles(postImageUrls);
            
            response.deletedImageCount = deleteResults.deletedCount;
            response.failedImageCount = deleteResults.failedCount;
            response.imageDeleteResults = deleteResults.results;
            
            if (deleteResults.deletedCount > 0 && deleteResults.failedCount === 0) {
                response.message = `Post and ${deleteResults.deletedCount} image${deleteResults.deletedCount !== 1 ? 's' : ''} deleted successfully`;
                response.allImagesDeleted = true;
            } else if (deleteResults.deletedCount > 0) {
                response.message = `Post deleted, ${deleteResults.deletedCount} image${deleteResults.deletedCount !== 1 ? 's' : ''} deleted, ${deleteResults.failedCount} failed`;
                response.allImagesDeleted = false;
            } else {
                response.message = 'Post deleted, but all image deletions failed';
                response.allImagesDeleted = false;
            }
        }

        return NextResponse.json(response);
        
    } catch (error) {
        console.error('Error in DELETE:', error);
        
        // Clean up: if post was deleted but image deletions failed
        if (postImageUrls && postImageUrls.length > 0) {
            try {
                console.log('Attempting cleanup of images after post deletion error');
                await deleteImageFiles(postImageUrls);
            } catch (cleanupError) {
                console.error('Cleanup deletion also failed:', cleanupError);
            }
        }
        
        return NextResponse.json({ 
            success: false,
            error: 'Failed to delete post',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

async function deleteImageFiles(imageUrls: string[]) {
    const results: Array<{
        url: string;
        success: boolean;
        message?: string;
        error?: string;
    }> = [];

    let deletedCount = 0;
    let failedCount = 0;

    // Process each image URL
    for (const imageUrl of imageUrls) {
        if (!imageUrl) continue;

        try {
            let filename: string;

            // Handle both URL formats
            if (imageUrl.startsWith('/api/images/')) {
                filename = imageUrl.substring('/api/images/'.length);
            } else if (imageUrl.startsWith('/uploads/')) {
                filename = imageUrl.substring('/uploads/'.length);
            } else {
                results.push({
                    url: imageUrl,
                    success: false,
                    error: 'Invalid image URL format'
                });
                failedCount++;
                continue;
            }

            // Security check
            if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                results.push({
                    url: imageUrl,
                    success: false,
                    error: 'Invalid filename'
                });
                failedCount++;
                continue;
            }

            // Use the UPLOAD_DIR
            const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
            const filePath = join(UPLOAD_DIR, filename);
            
            // Check if file exists
            if (!existsSync(filePath)) {
                console.warn(`Image file not found: ${filePath}`);
                results.push({
                    url: imageUrl,
                    success: false,
                    message: 'Image file not found on server',
                });
                failedCount++;
                continue;
            }

            // Delete the file
            await unlink(filePath);
            console.log(`Successfully deleted image: ${filename}`);
            
            results.push({
                url: imageUrl,
                success: true,
                message: `Image file deleted: ${filename}`
            });
            deletedCount++;
            
        } catch (error) {
            console.error(`Error deleting image ${imageUrl}:`, error);
            results.push({
                url: imageUrl,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error deleting image'
            });
            failedCount++;
        }
    }

    return {
        deletedCount,
        failedCount,
        total: imageUrls.length,
        results
    };
}

// Updated helper function to handle both URL formats
// async function deleteImageFile(imageUrl: string) {
//     try {
//         let filename: string;

//         // Handle both URL formats: /uploads/filename.jpg and /api/images/filename.jpg
//         if (imageUrl.startsWith('/api/images/')) {
//             filename = imageUrl.substring('/api/images/'.length);
//         } else if (imageUrl.startsWith('/uploads/')) {
//             filename = imageUrl.substring('/uploads/'.length);
//         } else {
//             return {
//                 success: false,
//                 error: 'Invalid image URL format'
//             };
//         }

//         // Security check
//         if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
//             return {
//                 success: false,
//                 error: 'Invalid filename'
//             };
//         }

//         // Use the UPLOAD_DIR (same as in upload route)
//         const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
//         const filePath = join(UPLOAD_DIR, filename);
        
//         // Check if file exists
//         if (!existsSync(filePath)) {
//             console.warn(`Image file not found: ${filePath}`);
//             return {
//                 success: false,
//                 error: 'Image file not found',
//                 warning: true
//             };
//         }

//         // Delete the file
//         await unlink(filePath);
//         console.log(`Successfully deleted image: ${filename}`);
        
//         return {
//             success: true,
//             message: `Image file deleted: ${filename}`
//         };
        
//     } catch (error) {
//         console.error('Error in deleteImageFile:', error);
//         return {
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error deleting image'
//         };
//     }
// }