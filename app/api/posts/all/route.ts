import { db } from "@/db/db";
import { postTable } from "@/db/schema";
import { NextResponse } from "next/server";
import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

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
      .filter(post => post.images)
      .flatMap(post => {
        try {
          const images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
          return Array.isArray(images) ? images : [];
        } catch {
          return [];
        }
      });
    
    
    // Delete all posts from database
    await db.delete(postTable);
    
    // Delete associated image files
    let imagesDeleted = 0;
    let imagesFailed = 0;
    const deletionResults: any[] = [];
    
    const deletionPromises = imageUrls.map(async (imageUrl) => {
      try {
        let filename: string | null = null;

        // Handle both URL formats: /uploads/filename.jpg and /api/images/filename.jpg
        if (imageUrl.startsWith('/api/images/')) {
          filename = imageUrl.substring('/api/images/'.length);
        } else if (imageUrl.startsWith('/uploads/')) {
          filename = imageUrl.substring('/uploads/'.length);
        }

        if (!filename) {
          console.warn(`Invalid image URL format: ${imageUrl}`);
          imagesFailed++;
          return { success: false, filename: imageUrl, error: 'Invalid URL format' };
        }

        // Security check
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          console.warn(`Suspicious filename detected: ${filename}`);
          imagesFailed++;
          return { success: false, filename, error: 'Invalid filename' };
        }

        const filePath = join(UPLOAD_DIR, filename);
        console.log(`Attempting to delete: ${filePath}`);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
          imagesDeleted++;
          return { success: true, filename };
        } else {
          console.warn(`File not found: ${filePath}`);
          imagesFailed++;
          return { success: false, filename, error: 'File not found' };
        }
      } catch (error) {
        console.error(`Failed to delete image ${imageUrl}:`, error);
        imagesFailed++;
        return { 
          success: false, 
          filename: imageUrl, 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    const results = await Promise.allSettled(deletionPromises);
    
    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        deletionResults.push(result.value);
      } else {
        deletionResults.push({ success: false, error: result.reason });
      }
    });

    const response = { 
      success: true, 
      postsDeleted: allPosts.length,
      imagesDeleted: imagesDeleted,
      imagesFailed: imagesFailed,
      totalImagesFound: imageUrls.length,
      message: `Successfully deleted ${allPosts.length} posts and ${imagesDeleted}/${imageUrls.length} associated images`,
      deletionResults: deletionResults // Include detailed results for debugging
    };

    console.log('Delete all operation complete:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in delete all posts:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete all posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}