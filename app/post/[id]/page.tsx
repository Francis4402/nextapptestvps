import { getPost } from '@/app/services/postservices';
import Image from 'next/image';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postData = await getPost(id);
  const postDataDetail = postData.data[0];

  return {
    title: postDataDetail.title,
    description: postDataDetail.content,
  }
}

const DetailPage = async ({params} : {params: Promise<{id: string}>}) => {
  const {id} = await params;

  const data = await getPost(id);

  if (!data?.data?.[0]) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

    const post = data.data[0];
    const images = post.images || [];


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href="/" 
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Posts
      </Link>

      {/* Post Title */}
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

      {/* Post Metadata */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Created:</p>
            <p>{new Date(post.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Updated:</p>
            <p>{new Date(post.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* All Images */}
      {images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Images ({images.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((image: string, index: number) => (
              <div key={index} className="relative h-92 rounded-lg overflow-hidden border">
                <Image
                  src={image}
                  alt={`${post.title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Image {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Content</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>

    </div>
  )
}

export default DetailPage