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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import Link from 'next/link'
import { Calendar, Clock, Image as ImageIcon, MoreVertical, Edit, Trash2, Plus, Eye, Search, Filter, Grid, List, ChevronRight, User, Tag, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const postsPerPage = 9

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }

  const getFirstImage = (images?: string[]) => {
    return images && images.length > 0 ? images[0] : null
  }

  const getImageCount = (images?: string[]) => {
    return images?.length || 0
  }

  // Filter posts based on search query
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination
  const indexOfLastPost = currentPage * postsPerPage
  const indexOfFirstPost = indexOfLastPost - postsPerPage
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost)
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col gap-8">
          {/* Hero Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
          </div>

          {/* Controls Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Posts Grid Skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="space-y-3 pt-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between items-center pt-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-12 md:py-20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="container relative mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to Our Blog
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover stories, thinking, and expertise from writers on any topic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/post">
                  <Plus className="h-5 w-5" />
                  Create Post
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="#trending">
                  <Eye className="h-5 w-5" />
                  Explore Trending
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Stats & Controls */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Latest Articles</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>{posts.length} Total Posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{filteredPosts.length} Showing</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Delete All (Admin) */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isDeletingAll || posts.length === 0}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Posts?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          This will permanently delete all {posts.length} posts
                          {posts.some(p => p.images?.length) && " and their associated images"}.
                          This action cannot be undone.
                        </p>
                        <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                          <p className="text-sm font-medium text-destructive flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            Warning: This is a destructive operation!
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
                      className="bg-destructive hover:bg-destructive/90 gap-2"
                    >
                      {isDeletingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete All Posts
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Separator />
        </div>

        {filteredPosts.length > 0 ? (
          <>
            {/* Featured Post */}
            {currentPosts[0] && (
              <div className="mb-12">
                <Card className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="grid lg:grid-cols-2 gap-0">
                    <div className="relative h-80 lg:h-[400px] overflow-hidden">
                      {getFirstImage(currentPosts[0].images) ? (
                        <Image
                          src={getFirstImage(currentPosts[0].images)!}
                          alt={currentPosts[0].title}
                          width={600}
                          height={400}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          priority
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <ImageIcon className="h-20 w-20 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-primary/90 backdrop-blur-sm">Featured</Badge>
                        {getImageCount(currentPosts[0].images) > 1 && (
                          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                            +{getImageCount(currentPosts[0].images) - 1} more
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-4 right-4">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {getReadingTime(currentPosts[0].content)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between p-6 lg:p-8">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <CardTitle className="text-2xl lg:text-3xl mb-2 line-clamp-2">
                              {currentPosts[0].title}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(currentPosts[0].createdAt)}</span>
                              </div>
                              {currentPosts[0].createdAt !== currentPosts[0].updatedAt && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Updated {formatDate(currentPosts[0].updatedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/post/${currentPosts[0].id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/post/edit/${currentPosts[0].id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(currentPosts[0].id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="text-base mb-6 line-clamp-3">
                          {getExcerpt(currentPosts[0].content, 200)}
                        </CardDescription>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Heart className="h-4 w-4" />
                              <span>24</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <MessageCircle className="h-4 w-4" />
                              <span>12</span>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Bookmark className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button asChild size="lg" className="gap-2">
                            <Link href={`/post/${currentPosts[0].id}`}>
                              Read More
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Posts Grid/List */}
            {currentPosts.length > 1 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Recent Posts</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-6"}>
                  {currentPosts.slice(1).map((post: Post) => (
                    <Card 
                      key={post.id} 
                      className={`
                        overflow-hidden border hover:border-primary/50 transition-all duration-300
                        ${viewMode === 'list' ? 'flex flex-col md:flex-row gap-4' : 'flex flex-col'}
                        hover:shadow-lg
                      `}
                    >
                      {viewMode === 'list' ? (
                        <>
                          {/* List View */}
                          <div className="relative w-full md:w-64 h-48 md:h-auto">
                            {getFirstImage(post.images) ? (
                              <Image
                                src={getFirstImage(post.images)!}
                                alt={post.title}
                                width={256}
                                height={192}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {getImageCount(post.images) > 1 && (
                              <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                                +{getImageCount(post.images) - 1}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex justify-between items-start mb-2">
                              <CardTitle className="text-xl line-clamp-2 hover:text-primary transition-colors">
                                <Link href={`/post/${post.id}`}>
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
                                  <DropdownMenuItem asChild>
                                    <Link href={`/post/${post.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/post/edit/${post.id}`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
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
                            <CardDescription className="line-clamp-2 mb-4">
                              {getExcerpt(post.content, 120)}
                            </CardDescription>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(post.createdAt)}</span>
                                  <Separator orientation="vertical" className="h-4" />
                                  <Clock className="h-4 w-4" />
                                  <span>{getReadingTime(post.content)}</span>
                                </div>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/post/${post.id}`}>
                                  Read More
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Grid View */}
                          <div className="relative h-48 overflow-hidden">
                            {getFirstImage(post.images) ? (
                              <Image
                                src={getFirstImage(post.images)!}
                                alt={post.title}
                                width={400}
                                height={192}
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {getImageCount(post.images) > 1 && (
                              <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                                +{getImageCount(post.images) - 1}
                              </Badge>
                            )}
                            <div className="absolute bottom-2 left-2">
                              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {getReadingTime(post.content)}
                              </Badge>
                            </div>
                          </div>
                          <CardHeader className="flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="line-clamp-2 hover:text-primary transition-colors flex-1">
                                <Link href={`/post/${post.id}`}>
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
                                  <DropdownMenuItem asChild>
                                    <Link href={`/post/${post.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/post/edit/${post.id}`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
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
                            <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(post.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Heart className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Button asChild variant="outline" className="w-full gap-2">
                              <Link href={`/post/${post.id}`}>
                                Read Article
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => handlePageChange(totalPages)}
                                className="cursor-pointer"
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <Card className="py-16 border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <ImageIcon className="h-20 w-20 text-muted-foreground" />
                <div className="absolute -top-2 -right-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">No posts yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Be the first to share your thoughts and stories with the community.
                  Create engaging content that inspires others.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2">
                <Link href="/post">
                  <Plus className="h-5 w-5" />
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
              <AlertDialogTitle>Delete Post?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this post and all associated images.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Post
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats Footer */}
      <div className="mt-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">{posts.length}</div>
              <div className="text-sm text-muted-foreground">Total Posts</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">
                {posts.reduce((acc, post) => acc + (post.images?.length || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">
                {posts.reduce((acc, post) => acc + Math.ceil(post.content.split(/\s+/).length / 200), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Read Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add this loader component
const Loader2 = ({ className }: { className?: string }) => (
  <div className={className}>
    <svg className="animate-spin" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  </div>
)