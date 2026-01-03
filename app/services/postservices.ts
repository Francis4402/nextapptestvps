"use server"


import { getServerSession } from "next-auth";
import { authOptions } from "../utils/authOptions";
import { PostFormProps } from "../types";



const baseUrl = process.env.BASE_URL;

export const getPosts = async () => {
    
    const session = await getServerSession(authOptions);

    const response = await fetch(`${baseUrl}/api/posts`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
        },
        cache: 'no-store',
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
            cache: 'no-store',
        });
        return res.json();
    } catch (error) {
        console.log(error);
    }
}

export const createPost = async (posts: PostFormProps) => {
    try {
        
        const session = await getServerSession(authOptions);


        const res = await fetch(`${baseUrl}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(posts),
            cache: 'no-store',
        });

        
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to create post');
        }

        return data;
    } catch (error) {
        console.error("Service error:", error)
    }
}


export const updatePost = async (posts: PostFormProps) => {
    try {
        const res = await fetch(`${baseUrl}/api/posts/${posts.initialData?.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(posts),
            cache: 'no-store',
        });


        return res.json();
    } catch (error) {
        console.log(error);
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

    return await response.json();
  } catch (error) {
    console.error('Error deleting all posts:', error);
    throw error;
  }
}