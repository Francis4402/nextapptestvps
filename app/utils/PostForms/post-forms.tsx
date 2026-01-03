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
import { X, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createPost, updatePost } from '@/app/services/postservices'
import { useRouter } from 'next/navigation'
import { postValidation, PostValidation } from '../postvalidation/postvalidation'
import { PostFormProps } from '@/app/types'
import imageCompression from 'browser-image-compression'
import { uploadImage, validateImageFile } from '@/app/services/uploadservices'


const PostForm = ({ className, initialData, mode = 'create', ...props }: PostFormProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initialData?.image || '')
  const [isUploading, setIsUploading] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    compressionRatio: number
  } | null>(null)

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous compression info
    setCompressionInfo(null)

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file')
      return
    }

    // Show compression message if needed
    if (file.size > 2 * 1024 * 1024) {
      toast.info('Large image detected. It will be compressed to under 2MB.')
    }

    try {
      // Create preview (compressed for faster loading)
      const previewToastId = toast.loading('Generating preview...')
      
      const previewFile = await imageCompression(file, {
        maxSizeMB: 1, // Smaller for preview
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: file.type,
      })
      
      const previewUrl = URL.createObjectURL(previewFile)
      setImagePreview(previewUrl)
      
      // Store the original file for upload
      setImageFile(file)
      
      toast.dismiss(previewToastId)
      toast.success('Image selected successfully')
      
      // Calculate and show compression info
      if (file.size > 2 * 1024 * 1024) {
        const compressedPreview = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        })
        
        setCompressionInfo({
          originalSize: file.size,
          compressedSize: compressedPreview.size,
          compressionRatio: Math.round((1 - compressedPreview.size / file.size) * 100)
        })
      }
      
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Failed to process image')
    }
  }

  const clearImage = () => {
    // Clean up preview URL
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    
    setImageFile(null)
    setImagePreview('')
    setCompressionInfo(null)
    form.setValue('image', '')
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const onSubmit: SubmitHandler<PostValidation> = async (data) => {
    try {
      let imageUrl = data.image || null
      let uploadError = false

      // Upload image only if a new file is selected
      if (imageFile) {
        setIsUploading(true)
        const uploadToastId = toast.loading('Compressing and uploading image...')
        
        try {
          const uploadResult = await uploadImage(imageFile)
          imageUrl = uploadResult.url
          
          toast.success('Image uploaded successfully', { 
            id: uploadToastId,
            description: compressionInfo 
              ? `Compressed from ${(compressionInfo.originalSize / 1024 / 1024).toFixed(1)}MB to ${(compressionInfo.compressedSize / 1024 / 1024).toFixed(1)}MB (${compressionInfo.compressionRatio}% reduction)`
              : undefined
          })
        } catch (error: any) {
          toast.error('Failed to upload image', { 
            id: uploadToastId,
            description: error.message || 'Please try again with a different image'
          })
          uploadError = true
          setIsUploading(false)
          return // Stop form submission if image upload fails
        } finally {
          setIsUploading(false)
        }
      }

      // Prepare post data
      const postData = {
        title: data.title,
        content: data.content,
        image: imageUrl,
      }

      if (mode === 'create') {
        const result = await createPost(postData as any)
        
        if (result) {
          toast.success('Post created successfully')
          
          // Clean up
          if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview)
          }
          
          form.reset()
          setImageFile(null)
          setImagePreview('')
          setCompressionInfo(null)
          router.push('/')
        } else {
          toast.error('Failed to create post')
        }
      } else {
        const result = await updatePost({
          id: initialData?.id,
          ...postData,
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
      toast.error(error.message || 'An error occurred while saving the post')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
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
                        disabled={isSubmitting || isUploading}
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
                        disabled={isSubmitting || isUploading}
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
                              disabled={isSubmitting || isUploading}
                              className="cursor-pointer"
                            />
                          </div>
                          {imagePreview && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={clearImage}
                              disabled={isSubmitting || isUploading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Compression Info */}
                        {compressionInfo && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium">Compression Applied</span>
                              </div>
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                {compressionInfo.compressionRatio}% smaller
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">Original:</span>{' '}
                                {formatFileSize(compressionInfo.originalSize)}
                              </div>
                              <div>
                                <span className="font-medium">After compression:</span>{' '}
                                {formatFileSize(compressionInfo.compressedSize)}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                              Image will be automatically optimized for web
                            </div>
                          </div>
                        )}

                        {/* Image Preview */}
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
                                Will be compressed and uploaded on submit
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
                                PNG, JPG, WEBP up to 10MB (will be compressed to under 2MB)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select an image for your post. Large images will be automatically compressed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Compressing & Uploading Image...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'create' ? 'Creating Post...' : 'Updating Post...'}
                    </>
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
                  disabled={isSubmitting || isUploading}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Fields marked with * are required. Images over 2MB will be automatically compressed.
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PostForm