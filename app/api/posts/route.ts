/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db/db";
import { postTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    
        const token = authHeader.split(" ")[1];

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.AUTH_SECRET as string);
        } catch {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = (decoded as any).id || (decoded as any).sub;
        
        const posts = await db.select().from(postTable);

        return NextResponse.json(posts);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}


export async function POST(req: NextRequest) {
    try {

      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const token = authHeader.split(" ")[1];
  
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.AUTH_SECRET as string);
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
  
      const body = await req.json();
  
      const existingPost = await db
        .select()
        .from(postTable)
        .where(
          and(eq(postTable.title, body.title), eq(postTable.content, body.content))
      );
  
      if (existingPost.length > 0) {
        return NextResponse.json(
          { error: "Post with the same title and content already exists" },
          { status: 400 }
        );
      }

      // Include image field in the insert
      const newPost = await db
        .insert(postTable)
        .values({
          title: body.title,
          content: body.content,
          image: body.image || null, // Add image field here
        })
        .returning({
          id: postTable.id,
          title: postTable.title,
          content: postTable.content,
          image: postTable.image, // Return image in response
          createdAt: postTable.createdAt,
          updatedAt: postTable.updatedAt,
        });
  
      return NextResponse.json(newPost[0]);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }
}