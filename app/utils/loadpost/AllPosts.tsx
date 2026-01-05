import { getPosts } from '@/app/services/postservices'
import { Post } from '@/app/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import DeleteButton from '../FunctionButton/DeleteButton';
import Image from 'next/image';
import DeleteAllButton from '../FunctionButton/DeleteAllPosts';




const AllPosts = async () => {

  const data = await getPosts();


  return (
    <div className='container mx-auto px-0 sm:px-5'>
      <div className='flex justify-end mt-10 items-center gap-5'>
        <Link href={'/post'}><Button><Plus />Create Post</Button></Link>
        <DeleteAllButton />
      </div>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">View Posts</h2>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {data.map((product: Post) => (
            <div key={product.id} className="group relative">
              <Image
                alt={'i'}
                width={500}
                height={500}
                src={product.images ? product.images[0] : ''}
                className="aspect-square w-full rounded-md bg-gray-200 object-cover group-hover:opacity-75 lg:aspect-auto lg:h-80"
              />
              <div className="mt-4 flex justify-between">
                <div>
                  <h3 className="text-sm text-gray-700">
                    <Link href={`/post/${product.id}`}>
                      {product.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{product.content}</p>
                </div>
                <div>
                  <DeleteButton id={product.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AllPosts