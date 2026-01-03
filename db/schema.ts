import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const userRoleEnum = pgEnum('user_role', ['User', 'Admin']);

export const usersTable = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    password: varchar({ length: 255 }).notNull(),
    image: varchar("image", { length: 255 }),
    role: userRoleEnum('role').notNull().default('User'),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postTable = pgTable("posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    content: varchar("content", { length: 5000 }).notNull(),
    image: varchar("image", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
