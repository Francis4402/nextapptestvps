import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";


export async function POST(req: NextRequest) {
    try {
        const {email} = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

        if (user.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        const foundUser = user[0];

        const resetToken = jwt.sign(
            {sub: foundUser.id, email: foundUser.email},
            process.env.AUTH_SECRET as string,
            {expiresIn: "1h"}
        );

        const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Your App" <${process.env.SMTP_FROM}>`,
            to: foundUser.email,
            subject: "Password Reset Request",
            text: `Click the link to reset your password: ${resetUrl}`,
            html: `<p>Click the link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
        });

        return NextResponse.json({ message: "If that email exists, a reset link was sent." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
    }
}