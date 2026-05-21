import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { getPostBySlug, getAllPosts, getLinksMapping } from '../lib/api'
import { markdownToHtml } from '../lib/markdownToHtml'
import path from 'path'
import PostSingle from '../components/blog/post-single'
import Layout from '../components/misc/layout'
import { NextSeo } from 'next-seo'
import Link from 'next/link'

export default function Post({ post, backlinks, allPostsGrouped, isHome }) {
  const router = useRouter()
  
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  // --- THE NEW DASHBOARD UI FOR THE HOME PAGE ---
  if (isHome) {
    return (
      <Layout>
        <NextSeo title="Dashboard | The FlowCytometry Project" />
        <div className="max-w-5xl mx-auto px-5 pt-32 pb-20">
          
          <header className="mb-16 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
              Autonomous Microfluidic Flow Cytometry
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              System design, theoretical framework, and technical documentation dashboard.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allPostsGrouped && Object.entries(allPostsGrouped).map(([folder, notes]) => (
              <div key={folder} className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 capitalize tracking-tight">
                    {folder === 'Root' ? 'General Resources' : folder.replace('-', ' ')}
                  </h3>
                </div>
                <ul className="space-y-3 grow">
                  {(notes as any[]).map(note => (
                    <li key={note.slug} className="flex items-start">
                      <span className="text-blue-500 mr-2 mt-0.5">↳</span>
                      <Link href={`/${note.slug}`} className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">
                        {note.title || note.slug.split('/').pop()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // --- STANDARD NOTE UI ---
  return (
    <Layout>
      <NextSeo title={post.title} description={post.excerpt?.slice(0, 155)} />
      <PostSingle
        title={post.title}
        content={post.content}
        date={post.date}
        author={post.author}
        backlinks={backlinks}
      />
    </Layout>
  )
}

export async function getStaticProps({ params }) {
  const slug = path.join(...params.slug)
  const isHome = slug === 'home'
  
  const post = await getPostBySlug(slug, ['title', 'excerpt', 'date', 'slug', 'author', 'content'])
  const content = await markdownToHtml(post.content || '', slug)
  
  const linkMapping = await getLinksMapping()
  const backlinks = Object.keys(linkMapping).filter(k => linkMapping[k].includes(post.slug) && k !== post.slug)
  const backlinkNodes = Object.fromEntries(await Promise.all(backlinks.map(async (slug) => {
    return [slug, await getPostBySlug(slug, ['title', 'excerpt'])]
  })));

  let allPostsGrouped = null;
  
  if (isHome) {
    const allPosts = await getAllPosts(['title', 'slug']);
    allPostsGrouped = {};
    
    allPosts.forEach((p) => {
      // Ignore the home page itself and any attachments/images
      if (p.slug === 'home' || p.slug.includes('attachments/') || p.slug.includes('public/')) return; 
      
      const parts = p.slug.split(path.sep);
      const folder = parts.length > 1 ? parts[0] : 'Root';
      
      if (!allPostsGrouped[folder]) allPostsGrouped[folder] = [];
      allPostsGrouped[folder].push(p);
    });
  }

  return {
    props: {
      post: { ...post, content },
      backlinks: backlinkNodes,
      allPostsGrouped,
      isHome 
    },
  }
}

export async function getStaticPaths() {
  const posts = await getAllPosts(['slug'])
  return {
    paths: posts.map((post) => ({ params: { slug: post.slug.split(path.sep) } })),
    fallback: false,
  }
}