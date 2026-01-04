"use client"

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { X, Image as ImageIcon, Upload, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createPost, updatePost } from '@/app/services/postservices'
import { useRouter } from 'next/navigation'
import { postValidation, PostValidation } from '../postvalidation/postvalidation'
import { PostFormProps } from '@/app/types'
import imageCompression from 'browser-image-compression'
import { uploadMultipleImages, validateMultipleImages, validateImageFile } from '@/app/services/uploadservices'

interface ImagePreview {
  file: File | null
  previewUrl: string
  uploadInfo?: {
    originalSize: number
    compressedSize?: number
    compressionRatio?: number
  }
  isExisting?: boolean
}

const PostForm = ({ className, initialData, mode = 'create', ...props }: PostFormProps) => {
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const router = useRouter()

  // Initialize form with initial data
  const form = useForm<PostValidation>({
    resolver: zodResolver(postValidation),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      images: initialData?.image || [], // Initialize as array
    }
  })

  // Initialize image previews from existing images
  useEffect(() => {
    if (initialData?.image && initialData.image.length > 0) {
      const existingPreviews: ImagePreview[] = initialData.image.map(url => ({
        file: null,
        previewUrl: url,
        isExisting: true,
        uploadInfo: {
          originalSize: 0, // We don't know the original size for existing images
        }
      }))
      setImagePreviews(existingPreviews)
    }
  }, [initialData?.image])

  const { formState: { isSubmitting } } = form

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return

    // Check if adding these files would exceed the limit
    const currentCount = imagePreviews.filter(p => !p.isExisting).length
    if (currentCount + files.length > 5) {
      toast.error(`Maximum 5 images allowed. You already have ${currentCount} new images.`)
      return
    }

    // Validate all files
    const validation = validateMultipleImages(files)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid files')
      return
    }

    const newPreviews: ImagePreview[] = []

    for (const file of files) {
      try {
        // Show compression message if needed
        if (file.size > 2 * 1024 * 1024) {
          toast.info('Large image detected. It will be compressed to under 2MB.')
        }

        // Create preview (compressed for faster loading)
        const previewFile = await imageCompression(file, {
          maxSizeMB: 1, // Smaller for preview
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: file.type,
        })
        
        const previewUrl = URL.createObjectURL(previewFile)
        
        newPreviews.push({
          file,
          previewUrl,
          uploadInfo: {
            originalSize: file.size,
          }
        })
        
      } catch (error) {
        console.error('Error processing image:', error)
        toast.error(`Failed to process ${file.name}`)
      }
    }

    setImagePreviews(prev => [...prev, ...newPreviews])
    
    if (newPreviews.length > 0) {
      toast.success(`${newPreviews.length} image(s) selected successfully`)
    }
  }

  const removeImage = (index: number) => {
    const previewToRemove = imagePreviews[index]
    
    // Clean up preview URL if it's a blob URL
    if (previewToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewToRemove.previewUrl)
    }
    
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllImages = () => {
    // Clean up all blob preview URLs
    imagePreviews.forEach(preview => {
      if (preview.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(preview.previewUrl)
      }
    })
    
    setImagePreviews([])
  }

  const onSubmit: SubmitHandler<PostValidation> = async (data) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Filter new images that need to be uploaded (have File objects)
      const newImages = imagePreviews.filter(preview => preview.file)
      const existingImageUrls = imagePreviews
        .filter(preview => !preview.file && preview.isExisting)
        .map(preview => preview.previewUrl)

      let uploadedUrls: string[] = [...existingImageUrls]

      // Upload new images if any
      if (newImages.length > 0) {
        const uploadToastId = toast.loading(`Uploading ${newImages.length} image(s)...`)
        
        try {
          const filesToUpload = newImages.map(preview => preview.file!).filter(Boolean)
          const uploadResults = await uploadMultipleImages(filesToUpload)
          
          // Update progress
          setUploadProgress(100)
          
          // Collect uploaded URLs
          const newUrls = uploadResults.map(result => result.url)
          uploadedUrls = [...existingImageUrls, ...newUrls]
          
          toast.success(`${uploadResults.length} image(s) uploaded successfully`, { 
            id: uploadToastId,
          })
        } catch (error: any) {
          toast.error('Failed to upload images', { 
            id: uploadToastId,
            description: error.message || 'Please try again with different images'
          })
          setIsUploading(false)
          return
        }
      }

      // Prepare post data
      const postData = {
        title: data.title,
        content: data.content,
        images: uploadedUrls,
      }

      // Add ID for update mode
      const postDataWithId = mode === 'edit' && initialData?.id 
        ? { ...postData, id: initialData.id }
        : postData

      let result
      if (mode === 'create') {
        result = await createPost(postDataWithId as any)
      } else {
        result = await updatePost(postDataWithId as any)
      }
      
      if (result) {
        toast.success(`Post ${mode === 'create' ? 'created' : 'updated'} successfully`)
        
        // Clean up all blob preview URLs
        imagePreviews.forEach(preview => {
          if (preview.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(preview.previewUrl)
          }
        })
        
        if (mode === 'create') {
          form.reset()
          setImagePreviews([])
        }
        
        router.push('/')
      } else {
        toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} post`)
      }
    } catch (error: any) {
      console.error('Error submitting form:', error)
      toast.error(error.message || 'An error occurred while saving the post')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  // Update form value when imagePreviews change
  useEffect(() => {
    const imageUrls = imagePreviews
      .filter(preview => !preview.file) // Only include URLs (not blobs)
      .map(preview => preview.previewUrl)
    
    form.setValue('images', imageUrls)
  }, [imagePreviews, form])

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
              
              {/* Title Field */}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content Field */}
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

              {/* Images Field */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Images (Optional, Max 5)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                disabled={isSubmitting || isUploading || imagePreviews.length >= 5}
                                className="cursor-pointer"
                                multiple
                              />
                            </div>
                            {imagePreviews.length > 0 && (
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={clearAllImages}
                                disabled={isSubmitting || isUploading}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear All
                              </Button>
                            )}
                          </div>

                          {/* Upload Progress */}
                          {isUploading && uploadProgress > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Uploading images...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Images Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <div className="relative rounded-lg border overflow-hidden bg-muted aspect-square">
                                  <img 
                                    src={preview.previewUrl} 
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      removeImage(index)
                                      toast.error('Failed to load image preview')
                                    }}
                                  />
                                  {preview.file && preview.uploadInfo && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                                      <div className="truncate">{preview.file.name}</div>
                                      <div>{formatFileSize(preview.uploadInfo.originalSize)}</div>
                                    </div>
                                  )}
                                  {preview.isExisting && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600/70 text-white text-xs p-2">
                                      <div>Existing Image</div>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeImage(index)}
                                  disabled={isSubmitting || isUploading}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            
                            {/* Add More Button */}
                            {imagePreviews.length < 5 && (
                              <label 
                                className={cn(
                                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer aspect-square",
                                  (isSubmitting || isUploading) && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-500">Add Image</span>
                                  <span className="text-xs text-gray-400 mt-1">
                                    {imagePreviews.length}/5
                                  </span>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageSelect}
                                  disabled={isSubmitting || isUploading || imagePreviews.length >= 5}
                                  className="hidden"
                                  multiple
                                />
                              </label>
                            )}
                          </div>

                          {/* Empty State */}
                          {imagePreviews.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed bg-muted/50">
                              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                              <p className="text-sm text-muted-foreground mb-2">
                                No images selected
                              </p>
                              <p className="text-xs text-muted-foreground text-center px-4">
                                Upload up to 5 images. PNG, JPG, WEBP up to 10MB each (will be compressed to under 2MB)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload up to 5 images. Large images will be automatically compressed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading Images...
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
                    // Clean up all blob preview URLs on cancel
                    imagePreviews.forEach(preview => {
                      if (preview.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(preview.previewUrl)
                      }
                    })
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