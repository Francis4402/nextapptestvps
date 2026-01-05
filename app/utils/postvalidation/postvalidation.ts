import z from "zod";

export const postValidation = z.object({
    title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
    content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
    images: z.array(z.string().url("Invalid image URL")).max(5, "Maximum 5 images allowed").optional(),
    price: z.string(),
});

export type PostValidation = z.infer<typeof postValidation>;