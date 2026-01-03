"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createPost, updatePost } from '@/app/services/postservices'
import { useRouter } from 'next/navigation'
import { postValidation, PostValidation } from '../postvalidation/postvalidation'
import { PostFormProps } from '@/app/types'

const PostForm = ({ className, initialData, mode = 'create', ...props }: PostFormProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initialData?.image || '')

  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(postValidation),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      image: initialData?.image || '',
    }
  })

  const { formState: { isSubmitting } } = form

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    // Store the file for later upload
    setImageFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    
    toast.success('Image selected. It will be uploaded when you submit the post.')
  }

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview('')
    form.setValue('image', '')
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.url
  }

  const onSubmit: SubmitHandler<PostValidation> = async (data) => {
    try {
      let imageUrl = data.image || null

      // Upload image only if a new file is selected
      if (imageFile) {
        toast.info('Uploading image...')
        imageUrl = await uploadImage(imageFile)
      }

      if (mode === 'create') {
        const result = await createPost({
          title: data.title,
          content: data.content,
          image: imageUrl,
        } as any)

        if (result) {
          toast.success('Post created successfully')
          
          // Clean up preview URL
          if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview)
          }
          
          form.reset()
          setImageFile(null)
          setImagePreview('')
          router.push('/')
        } else {
          toast.error('Failed to create post')
        }
      } else {
        const result = await updatePost({
          id: initialData?.id,
          title: data.title,
          content: data.content,
          image: imageUrl,
        } as any)

        if (result) {
          toast.success('Post updated successfully')
          
          // Clean up preview URL
          if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview)
          }
          
          router.push('/')
        } else {
          toast.error('Failed to update post')
        }
      }
    } catch (error: any) {
      console.error('Error submitting form:', error)
      toast.error(error.message || 'An error occurred')
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create New Post' : 'Edit Post'}</CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Fill in the details below to create a new blog post' 
              : 'Update your post details below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="Enter your post title" 
                      />
                    </FormControl>
                    <FormDescription>
                      A catchy title for your blog post (max 255 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="Write your post content here..."
                        className="min-h-[250px] resize-y"
                      />
                    </FormControl>
                    <FormDescription className="flex justify-between">
                      <span>Your main post content</span>
                      <span>{field.value ? field.value.length : 0} / 5000</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              disabled={isSubmitting}
                              className="cursor-pointer"
                            />
                          </div>
                          {imagePreview && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={clearImage}
                              disabled={isSubmitting}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {imagePreview ? (
                          <div className="relative rounded-lg border overflow-hidden bg-muted">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="w-full h-64 object-cover"
                              onError={() => {
                                setImagePreview('')
                                toast.error('Failed to load image preview')
                              }}
                            />
                            {imageFile && (
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Will be uploaded on submit
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 rounded-lg border border-dashed bg-muted/50">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">
                                No image selected
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                PNG, JPG, WEBP up to 5MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select an image for your post (max 5MB). It will be uploaded when you submit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    imageFile ? 'Uploading & Saving...' : 'Saving...'
                  ) : (
                    mode === 'create' ? 'Create Post' : 'Update Post'
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    // Clean up preview URL on cancel
                    if (imagePreview && imagePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(imagePreview)
                    }
                    router.back()
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Fields marked with * are required
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PostForm