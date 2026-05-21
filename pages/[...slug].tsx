import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { getPostBySlug, getAllPosts, getLinksMapping } from '../lib/api'
import { markdownToHtml } from '../lib/markdownToHtml'
import type PostType from '../interfaces/post'
import path from 'path'
import PostSingle from '../components/blog/post-single'
import Layout from '../components/misc/layout'
import { NextSeo } from 'next-seo'
import Link from 'next/link'

type Items = {
  title: string,
  excerpt: string,
}

type Props = {
  post: PostType
  slug: string
  backlinks: { [k: string]: Items }
  allPostsGrouped?: { [folder: string]: { title: string, slug: string }[] }
}

export default function Post({ post, backlinks, allPostsGrouped }: Props) {
  const router = useRouter()
  const description = post?.excerpt?.slice(0, 155) || ''
  
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  return (
    <>
      {router.isFallback ? (
        <h1>Loading…</h1>
      ) : (
        <Layout>
          <NextSeo
            title={post.title}
            description={description}
            openGraph={{
              title: post.title,
              description,
              type: 'article',
              images: [{
                url: (post.ogImage?.url) ? post.ogImage.url : "https://fleetingnotes.app/favicon/512.png",
                width: (post.ogImage?.url) ? null: 512,
                height: (post.ogImage?.url) ? null: 512,
                type: null
              }]
            }}
          />
          
          {/* Renders the markdown content from your .md file */}
          <PostSingle
            title={post.title}
            content={post.content}
            date={post.date}
            author={post.author}
            backlinks={backlinks}
          />

          {/* DYNAMIC DIRECTORY GRID: Only renders on the Home page */}
          {allPostsGrouped && Object.keys(allPostsGrouped).length > 0 && (
             <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-gray-200">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Directory</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {Object.entries(allPostsGrouped).map(([folder, notes]) => (
                   <div key={folder} className="p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                     <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize">
                       {folder === 'Root' ? 'General Documents' : folder.replace('-', ' ')}
                     </h3>
                     <ul className="space-y-2">
                       {notes.map(note => (
                         <li key={note.slug}>
                           <Link href={`/${note.slug}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                             {note.title || note.slug.split('/').pop()}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </Layout>
      )}
    </>
  )
}

type Params = {
  params: {
    slug: string[]
  }
}

export async function getStaticProps({ params }: Params) {
  const slug = path.join(...params.slug)
  const post = await getPostBySlug(slug, [
    'title',
    'excerpt',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
  ])
  const content = await markdownToHtml(post.content || '', slug)
  const linkMapping = await getLinksMapping()
  const backlinks = Object.keys(linkMapping).filter(k => linkMapping[k].includes(post.slug) && k !== post.slug)
  
  const backlinkNodes = Object.fromEntries(await Promise.all(backlinks.map(async (slug) => {
    const post = await getPostBySlug(slug, ['title', 'excerpt']);
    return [slug, post]
  })));

  // --- NEW: DYNAMIC FOLDER LOGIC ---
  // If we are generating the home page, fetch all posts and group them by folder.
  let allPostsGrouped = null;
  if (slug === 'home') {
    const allPosts = await getAllPosts(['title', 'slug']);
    allPostsGrouped = {};
    
    allPosts.forEach((p) => {
      // Don't list the home page or specific attachments inside the directory grid
      if (p.slug === 'home' || p.slug.includes('attachments/')) return; 
      
      const parts = p.slug.split(path.sep);
      // If there are multiple parts (e.g., fluidics/note1), the folder is the first part. Otherwise, it's Root.
      const folder = parts.length > 1 ? parts[0] : 'Root';
      
      if (!allPostsGrouped[folder]) {
        allPostsGrouped[folder] = [];
      }
      allPostsGrouped[folder].push(p);
    });
  }

  return {
    props: {
      post: {
        ...post,
        content,
      },
      backlinks: backlinkNodes,
      allPostsGrouped, // Pass the grouped directory to the component
    },
  }
}

export async function getStaticPaths() {
  const posts = await getAllPosts(['slug'])
  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug.split(path.sep),
        },
      } 
    }),
    fallback: false,
  }
}