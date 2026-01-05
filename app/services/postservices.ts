"use server"


import { getServerSession } from "next-auth";
import { authOptions } from "../utils/authOptions";
import { PostFormProps } from "../types";
import { revalidateTag } from "next/cache";



const baseUrl = process.env.BASE_URL;

export const getPosts = async () => {
    
    const session = await getServerSession(authOptions);

    const response = await fetch(`${baseUrl}/api/posts`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
        },
        next: {
            tags: ['posts']
        },
    });


    return response.json();
}

export const getPost = async (id: string) => {
    try {
        const res = await fetch(`${baseUrl}/api/posts/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            next: {
                tags: ['posts']
            },
        });
        return res.json();
    } catch (error) {
        console.log(error);
    }
}

export const createPost = async (postData: PostFormProps) => {
    try {
        const session = await getServerSession(authOptions)

        const res = await fetch(`${baseUrl}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(postData),
            cache: 'no-store',
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || 'Failed to create post')
        }

        revalidateTag('posts', 'max')

        return data
    } catch (error) {
        console.error("Service error:", error)
        throw error
    }
}

export const updatePost = async (postData: PostFormProps & { id: string }) => {
    try {
        const session = await getServerSession(authOptions)

        const res = await fetch(`${baseUrl}/api/posts`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(postData),
            cache: 'no-store',
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || 'Failed to update post')
        }

        revalidateTag('posts', 'max')

        return data
    } catch (error) {
        console.error("Service error:", error)
        throw error
    }
}

export const deletePost = async (id: string) => {
    try {
        const res = await fetch(`${baseUrl}/api/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        revalidateTag('posts', 'max')

        return res.json();
    } catch (error) {
        console.log(error);
    }
}

export async function deleteAllPosts() {
  try {
    const response = await fetch(`${baseUrl}/api/posts/all`, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete all posts');
    }

    revalidateTag('posts', 'max')

    return await response.json();
  } catch (error) {
    console.error('Error deleting all posts:', error);
    throw error;
  }
}