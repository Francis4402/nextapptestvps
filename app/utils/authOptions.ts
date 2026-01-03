import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                return null;
            }

            try {
                const user = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.email, credentials.email))
                    .limit(1);

                if (user.length === 0) return null;

                const foundUser = user[0];

                if (!foundUser.password) return null;

                const passwordMatch = await bcrypt.compare(
                    credentials.password,
                    foundUser.password
                );

                if (!passwordMatch) return null;

                return {
                    id: foundUser.id,
                    email: foundUser.email,
                    name: foundUser.name,
                    image: foundUser.image,
                    role: foundUser.role,
                };
                } catch (error) {
                    console.error("Authorization error:", error);
                    return null;
                }
            },
        })
    ],
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET as string,
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async signIn({ user }) {
            const existingUser = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.email, user.email!))
                .limit(1);

            if (existingUser.length === 0) {
                await db.insert(usersTable).values({
                    name: user.name ?? "",
                    email: user.email ?? "",
                    image: user.image ?? "",
                    role: "User",
                    password: "",
                });
            }

            return true;
        },

        async jwt({ token, user }) {
      
        if (user?.email) {
            const dbUser = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, user.email))
            .limit(1);

            if (dbUser.length > 0) {
            token.id = dbUser[0].id;
            token.role = dbUser[0].role;

            
            token.accessToken = jwt.sign(
                {
                sub: dbUser[0].id,
                email: dbUser[0].email,
                role: dbUser[0].role,
                },
                process.env.AUTH_SECRET as string,
                { expiresIn: "30d" }
            );
            }
        }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            // Pass accessToken to client
            session.accessToken = token.accessToken as string;
            return session;
        },
    }
}