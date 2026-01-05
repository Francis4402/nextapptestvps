/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db/db";
import { postTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { existsSync } from 'fs'
import { join } from "path";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization")

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    
        const token = authHeader.split(" ")[1]

        let decoded
        
        try {
          decoded = jwt.verify(token, process.env.AUTH_SECRET as string)
        } catch {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }
        
        const posts = await db.select().from(postTable)

        return NextResponse.json(posts)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}


export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.AUTH_SECRET as string)
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await req.json();

    // Check for duplicate posts
    const existingPost = await db
      .select()
      .from(postTable)
      .where(
        and(eq(postTable.title, body.title), eq(postTable.content, body.content))
    )

    if (existingPost.length > 0) {
      return NextResponse.json(
        { error: "Post with the same title and content already exists" },
        { status: 400 }
      )
    }

    // Validate image URLs if provided
    let imageUrls: string[] = []
    if (body.images && Array.isArray(body.images)) {
      // Filter out invalid URLs and check if files exist
      for (const imageUrl of body.images) {
        if (imageUrl && imageUrl.startsWith('/api/images/')) {
          const filename = imageUrl.split('/').pop()
          const filePath = join(process.cwd(), 'uploads', filename || '')
          
          if (existsSync(filePath)) {
            imageUrls.push(imageUrl)
          } else {
            console.warn(`Image file not found: ${filePath}`)
          }
        }
      }
      
      // Limit to 5 images
      imageUrls = imageUrls.slice(0, 5)
    }

    // Create new post with images
    const newPost = await db
      .insert(postTable)
      .values({
        title: body.title,
        content: body.content,
        images: imageUrls.length > 0 ? imageUrls : null,
        price: body.price
      })
      .returning({
        id: postTable.id,
        title: postTable.title,
        content: postTable.content,
        images: postTable.images,
        price: postTable.price,
        createdAt: postTable.createdAt,
        updatedAt: postTable.updatedAt,
      })

    return NextResponse.json(newPost[0])
    
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}