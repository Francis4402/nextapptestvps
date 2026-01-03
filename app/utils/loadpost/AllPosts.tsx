"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { Calendar, Clock, Image as ImageIcon, MoreVertical, Edit, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAllPosts, deletePost, getPosts } from '@/app/services/postservices'
import { Post } from '@/app/types'
import Image from 'next/image'



export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const data = await getPosts()
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (postId: string) => {
    setPostToDelete(postId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return

    setIsDeleting(true)
    try {
      const result = await deletePost(postToDelete)
      
      if (result.success) {
        setPosts(posts.filter(post => post.id !== postToDelete))
        toast.success('Post deleted successfully')
        setDeleteDialogOpen(false)
        setPostToDelete(null)
      } else {
        toast.error(result.error || 'Failed to delete post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAllPosts = async () => {
    setIsDeletingAll(true)
    try {
      const result = await deleteAllPosts()
      
      if (result.success) {
        setPosts([])
        toast.success('All posts deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete all posts')
      }
    } catch (error) {
      console.error('Error deleting all posts:', error)
      toast.error('Failed to delete all posts')
    } finally {
      setIsDeletingAll(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Welcome to Our Blog</h1>
          <p className="text-xl text-muted-foreground">
            Discover stories, thinking, and expertise from writers on any topic
          </p>
        </div>
        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingAll || posts.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div>
                    <p>
                        This action cannot be undone. This will permanently delete all {posts.length} post{posts.length !== 1 ? 's' : ''}
                        {posts.some(p => p.image) && " and their associated images"}.
                    </p>
                    <div className="mt-4 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                        <p className="text-sm font-medium text-destructive">
                        ⚠️ Warning: This is a destructive operation!
                        </p>
                    </div>
                    </div>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDeleteAllPosts}
                    disabled={isDeletingAll}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isDeletingAll ? 'Deleting...' : 'Delete All Posts'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>

          <Button asChild>
            <Link href="/post">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      </div>

      {posts && posts.length > 0 ? (
        <>
          <div className="mb-6">
            <p className="text-muted-foreground">
              Total posts: <span className="font-semibold text-primary">{posts.length}</span>
            </p>
          </div>

          {/* Featured Post */}
          {posts[0] && (
            <Card className="mb-10 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="grid md:grid-cols-2 gap-0">
                {posts[0].image ? (
                  <div className="relative h-80 md:h-auto overflow-hidden bg-muted">
                    <Image
                      src={posts[0].image}
                      alt={posts[0].title}
                      width={500}
                      height={500}
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute top-4 left-4">Featured</Badge>
                  </div>
                ) : (
                  <div className="relative h-80 md:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <ImageIcon className="h-20 w-20 text-muted-foreground" />
                    <Badge className="absolute top-4 left-4">Featured</Badge>
                  </div>
                )}
                <div className="flex flex-col justify-between p-8">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <CardTitle className="text-3xl flex-1">{posts[0].title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">

                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(posts[0].id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="text-base mb-6">
                      {getExcerpt(posts[0].content, 200)}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(posts[0].createdAt)}</span>
                      </div>
                      {posts[0].createdAt !== posts[0].updatedAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Updated {formatDate(posts[0].updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button asChild size="lg">
                    <Link href={`/posts/${posts[0].id}`}>Read More</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Rest of Posts Grid */}
          {posts.length > 1 && (
            <>
              <h2 className="text-2xl font-bold mb-6">Recent Posts</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.slice(1).map((post: Post) => (
                  <Card key={post.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                    {post.image ? (
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <Image
                          src={post.image}
                          alt={post.title}
                          width={500}
                          height={500}
                          className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardHeader className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="line-clamp-2 hover:text-primary transition-colors flex-1">
                          <Link href={`/posts/${post.id}`}>
                            {post.title}
                          </Link>
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(post.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="line-clamp-3 mt-2">
                        {getExcerpt(post.content)}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-3 border-t pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/posts/${post.id}`}>Read More</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Be the first to share your thoughts and stories with the community
            </p>
            <Button asChild size="lg">
              <Link href="/post">
                <Plus className="mr-2 h-4 w-4" />
                Create First Post
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}