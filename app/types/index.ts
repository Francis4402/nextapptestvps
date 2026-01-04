export interface CompressedImageInfo {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  url: string;
  filename: string;
}

export interface PostFormProps {
    className?: string;
    initialData?: {
        id?: string;
        title?: string;
        content?: string;
        image?: string[] | null;
    };
    mode?: 'create' | 'edit';
}

export interface Post {
  id: string
  title: string
  content: string
  images?: string[] // Array of image URLs
  createdAt: Date
  updatedAt: Date
}

export interface User {
    user?: {
        id?: string | null | undefined;
        name?: string | null | undefined;
        image?: string | null | undefined;
        email?: string | null | undefined;
        role?: string | null | undefined;
    }
}


export interface registerType {
    name: string;
    email: string;
    password: string;
}

export interface loginType {
    email: string;
    password: string;
}

export interface ForgotPasswordType {
    email: string;
};
  
export interface ResetPasswordType {
    token: string;
    newPassword: string;
};
  