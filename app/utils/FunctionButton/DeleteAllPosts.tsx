"use client"

import { deleteAllPosts } from '@/app/services/postservices'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'


const DeleteAllButton = () => {

    const handleDelete = async () => {
        const res = await deleteAllPosts()

        if (res.success) {
            toast.success("Delete Successful")
        } else {
            toast.error('delete failed')
        }
    }

  return (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button variant={'destructive'}>Delete All</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                You Want to delete this post
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
                Confirm
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteAllButton