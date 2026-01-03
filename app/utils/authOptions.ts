import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                try {
                    const user = await db
                        .select()
                        .from(usersTable)
                        .where(eq(usersTable.email, credentials.email))
                        .limit(1);

                    if (user.length === 0) {
                        throw new Error("Invalid email or password");
                    }

                    const foundUser = user[0];

                    if (!foundUser.password) {
                        throw new Error("Invalid account configuration");
                    }

                    const passwordMatch = await bcrypt.compare(
                        credentials.password,
                        foundUser.password
                    );

                    if (!passwordMatch) {
                        throw new Error("Invalid email or password");
                    }

                    return {
                        id: foundUser.id,
                        email: foundUser.email,
                        name: foundUser.name,
                        image: foundUser.image || undefined,
                        role: foundUser.role,
                    };
                } catch (error) {
                    console.error("Authorization error:", error);
                    if (error instanceof Error) {
                        throw new Error(error.message);
                    }
                    throw new Error("Authentication failed");
                }
            },
        })
    ],
    pages: {
        signIn: "/login",
        signOut: "/login",
        error: "/login",
        newUser: "/register",
    },
    secret: process.env.AUTH_SECRET,
    
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    debug: process.env.NODE_ENV === "development",
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Use NEXTAUTH_URL if available, otherwise BASE_URL, otherwise the provided baseUrl
            const serverBaseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || baseUrl;
            
            // Ensure the base URL has proper protocol
            let baseUrlWithProtocol = serverBaseUrl;
            if (!serverBaseUrl.startsWith('http://') && !serverBaseUrl.startsWith('https://')) {
                baseUrlWithProtocol = `http://${serverBaseUrl}`;
            }
            
            // Parse the URL to handle relative paths
            if (url.startsWith("/")) {
                // Relative URL - prepend base URL
                return `${baseUrlWithProtocol}${url}`;
            } else if (url.startsWith(baseUrlWithProtocol)) {
                // Already has correct base URL
                return url;
            } else if (new URL(url).origin === baseUrlWithProtocol) {
                // URL from the same origin
                return url;
            }
            
            // Return to home page by default
            return baseUrlWithProtocol;
        },
        
        async signIn({ user, account, profile, email, credentials }) {
            try {
                // Check if user exists
                const existingUser = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.email, user.email!))
                    .limit(1);

                if (existingUser.length === 0 && user.email) {
                    // Create new user if doesn't exist (for social logins or auto-registration)
                    await db.insert(usersTable).values({
                        name: user.name || user.email.split('@')[0],
                        email: user.email,
                        image: user.image || "",
                        role: "User",
                        password: "", // Empty password for OAuth users
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
                
                return true;
            } catch (error) {
                console.error("SignIn callback error:", error);
                return false;
            }
        },

        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.image = user.image;
                token.role = user.role;
            }
            
            // Fetch fresh user data from database
            if (token.email) {
                try {
                    const dbUser = await db
                        .select()
                        .from(usersTable)
                        .where(eq(usersTable.email, token.email as string))
                        .limit(1);

                    if (dbUser.length > 0) {
                        token.id = dbUser[0].id;
                        token.role = dbUser[0].role;
                        
                        // Create access token
                        token.accessToken = jwt.sign(
                            {
                                sub: dbUser[0].id,
                                email: dbUser[0].email,
                                name: dbUser[0].name,
                                role: dbUser[0].role,
                                iat: Math.floor(Date.now() / 1000),
                            },
                            process.env.AUTH_SECRET as string,
                            { expiresIn: "30d" }
                        );
                    }
                } catch (error) {
                    console.error("JWT callback error:", error);
                }
            }
            
            // Handle session update
            if (trigger === "update" && session) {
                token = { ...token, ...session };
            }
            
            return token;
        },

        async session({ session, token, user }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.image = token.image as string;
                session.user.role = token.role as string;
            }
            
            // Pass accessToken to client
            session.accessToken = token.accessToken as string;
            
            // Add error for client-side handling if needed
            if (token.error) {
                session.error = token.error as string;
            }
            
            return session;
        },
    },
    
    // Events for logging and handling errors
    events: {
        async signIn({ user, account, profile, isNewUser }) {
            console.log(`User signed in: ${user.email}, isNewUser: ${isNewUser}`);
        },
        async signOut({ token, session }) {
            console.log(`User signed out: ${token?.email}`);
        },
        async createUser({ user }) {
            console.log(`New user created: ${user.email}`);
        },
        async linkAccount({ user, account, profile }) {
            console.log(`Account linked for user: ${user.email}`);
        },
        async session({ session, token }) {
            // Session callback in events for additional logging
            console.log(`Session active for: ${session.user?.email}`);
        },
    },
    
    // Custom error pages
    theme: {
        colorScheme: "auto",
        brandColor: "#000000",
        logo: "/logo.png",
        buttonText: "#ffffff",
    },
};

// Type augmentation for NextAuth
declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        image?: string | undefined;
    }
    
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession["user"];
        accessToken?: string;
        error?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        accessToken?: string;
        error?: string;
    }
}