// app/api/post/all/route.ts (selective deletion)
import { db } from "@/db/db";
import { postTable } from "@/db/schema";
import { NextResponse } from "next/server";
import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

export async function DELETE() {
  try {
    console.log('Starting selective delete all posts operation...');
    
    // Get all posts first to collect image URLs
    const allPosts = await db.select().from(postTable);
    console.log(`Found ${allPosts.length} posts to delete`);
    
    if (allPosts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No posts to delete" 
      });
    }
    
    // Collect all image URLs from posts
    const imageUrls = allPosts
      .filter(post => post.image && typeof post.image === 'string')
      .map(post => post.image as string);
    
    console.log(`Found ${imageUrls.length} images to delete`);
    
    // Delete all posts from database
    await db.delete(postTable);
    console.log('Posts deleted from database');
    
    // Delete associated image files
    let imagesDeleted = 0;
    const deletionPromises = imageUrls.map(async (imageUrl) => {
      try {
        if (imageUrl.startsWith('/uploads/')) {
          const filename = imageUrl.split('/').pop();
          if (filename) {
            const filePath = join(process.cwd(), 'public', 'uploads', filename);
            if (existsSync(filePath)) {
              await unlink(filePath);
              imagesDeleted++;
              return { success: true, filename };
            }
          }
        }
        return { success: false, filename: 'unknown' };
      } catch (error) {
        console.error(`Failed to delete image ${imageUrl}:`, error);
        return { success: false, filename: imageUrl, error };
      }
    });
    
    await Promise.allSettled(deletionPromises);
    
    return NextResponse.json({ 
      success: true, 
      postsDeleted: allPosts.length,
      imagesDeleted: imagesDeleted,
      totalImagesFound: imageUrls.length,
      message: `Successfully deleted ${allPosts.length} posts and ${imagesDeleted} associated images`
    });
    
  } catch (error) {
    console.error('Error in delete all posts:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete all posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}