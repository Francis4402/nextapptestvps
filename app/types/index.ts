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
        price: string
    };
    mode?: 'create' | 'edit';
}

export interface Post {
  id: string
  title: string
  content: string
  images?: string[]
  price: string
  createdAt?: Date
  updatedAt?: Date
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

export interface CartItems {
  id: string
  title: string
  content: string
  images?: string[]
  price: string
}


export interface CartStore {
    cart: CartItems[],
    addToCart: (product: CartItems) => void
    removeFromCart: (id: string) => void
    clearCart: () => void
    getTotalItems: () => number
    getItemById: (id: string) => CartItems | undefined
    getSubTotal: () => number
    getTax: () => number
    getShipping: () => number
    getTotal: () => number
}