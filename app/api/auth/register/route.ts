
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'User with the same email already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);

        const user = await db.insert(usersTable).values({
            name: body.name,
            email: body.email,
            password: hashedPassword,
            image: body.image,
            role: "User",
        }).returning({
            name: usersTable.name,
            email: usersTable.email,
            image: usersTable.image,
            role: usersTable.role,
        });

        return NextResponse.json(user);
    } catch (error) {
        console.log(error);
    }
}
