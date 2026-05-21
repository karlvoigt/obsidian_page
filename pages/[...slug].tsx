import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { getPostBySlug, getAllPosts, getLinksMapping } from '../lib/api'
import { markdownToHtml } from '../lib/markdownToHtml'
import path from 'path'
import fs from 'fs'
import PostSingle from '../components/blog/post-single'
import Layout from '../components/misc/layout'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import Cite from 'citation-js'

export default function Post({ post, backlinks, allPostsGrouped, globalReferences, isHome }) {
  const router = useRouter()
  if (!router.isFallback && !post?.slug) return <ErrorPage statusCode={404} />

  // --- THE MASTER'S DASHBOARD UI ---
  if (isHome) {
    return (
      <Layout>
        <NextSeo title="Dashboard | Autonomous Flow Cytometry" />
        <div className="max-w-6xl mx-auto px-5 pt-32 pb-20">
          
          <header className="mb-16 text-center border-b border-gray-200 pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
              {post.title}
            </h1>
            {/* Renders the top portion of home.md (Intro, Embeds, etc.) */}
            <div className="max-w-3xl mx-auto prose prose-lg text-left" dangerouslySetInnerHTML={{ __html: post.content }} />
          </header>

          {/* DYNAMIC FOLDER DIRECTORY */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-2">System Directory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allPostsGrouped && Object.entries(allPostsGrouped).map(([folder, notes]) => (
                <div key={folder} className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-6">
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
          </section>

          {/* DYNAMIC IEEE BIBLIOGRAPHY */}
          {globalReferences && (
            <section className="max-w-3xl mx-auto mt-20 pt-10 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Global Reference List</h2>
              <div 
                className="prose prose-sm text-gray-600 break-words" 
                dangerouslySetInnerHTML={{ __html: globalReferences }} 
              />
            </section>
          )}
        </div>
      </Layout>
    )
  }

  // --- STANDARD NOTE UI ---
  return (
    <Layout>
      <NextSeo title={post.title} />
      <PostSingle title={post.title} content={post.content} date={post.date} author={post.author} backlinks={backlinks} />
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
  const backlinkNodes = Object.fromEntries(await Promise.all(backlinks.map(async (s) => [s, await getPostBySlug(s, ['title', 'excerpt'])])));

  let allPostsGrouped = null;
  let formattedBibliography = null;
  
  if (isHome) {
    const allPosts = await getAllPosts(['title', 'slug', 'content']);
    allPostsGrouped = {};
    const usedCitationKeys = new Set<string>();
    
    allPosts.forEach((p) => {
      // 1. Grouping Logic
      if (p.slug !== 'home' && !p.slug.includes('attachments/') && !p.slug.includes('public/')) {
        const parts = p.slug.split(path.sep);
        const folder = parts.length > 1 ? parts[0] : 'Root';
        if (!allPostsGrouped[folder]) allPostsGrouped[folder] = [];
        allPostsGrouped[folder].push({ title: p.title, slug: p.slug });
      }
      
      // 2. Extract Pandoc Citations from raw markdown (e.g., [@author2020])
      const matches = Array.from(p.content.matchAll(/\[@([a-zA-Z0-9_:-]+)\]/g));
      for (const match of matches) usedCitationKeys.add(match[1]);
    });

    // 3. Generate IEEE Bibliography
    if (usedCitationKeys.size > 0) {
      try {
        // Path to your Zotero export in the publish folder
        const libPath = path.join(process.cwd(), process.env.COMMON_MD_DIR, 'master-library.json');
        if (fs.existsSync(libPath)) {
          const libraryData = JSON.parse(fs.readFileSync(libPath, 'utf8'));
          
          // Filter to only items cited in the markdown files
          const usedItems = libraryData.filter(item => usedCitationKeys.has(item.id));
          
          // Render IEEE HTML via citation-js
          const cite = new Cite(usedItems);
          formattedBibliography = cite.format('bibliography', {
            format: 'html',
            template: 'ieee',
            lang: 'en-US'
          });
        }
      } catch (error) {
        console.error("Bibliography generation failed:", error);
      }
    }
  }

  return {
    props: {
      post: { ...post, content },
      backlinks: backlinkNodes,
      allPostsGrouped,
      globalReferences: formattedBibliography,
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