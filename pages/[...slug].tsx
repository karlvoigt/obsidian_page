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
import markdownStyles from '../components/blog/markdown-styles.module.css' // FIXED: Brought back standard markdown CSS

// Directory Sub-Component
const ProjectDirectory = ({ groupedNotes }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-10 w-full not-prose">
    {groupedNotes && Object.entries(groupedNotes).map(([folder, notes]) => (
      <div key={folder} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-xl font-bold text-gray-800 capitalize mb-3 border-b pb-2">
          {folder === 'Root' ? 'General' : folder.replace('-', ' ')}
        </h3>
        <ul className="space-y-2">
          {(notes as any[]).map(note => (
            <li key={note.slug} className="flex items-start">
              <span className="text-blue-500 mr-2">↳</span>
              <Link href={`/${note.slug}`} className="text-gray-700 hover:text-blue-600 font-medium text-sm">
                {note.title || note.slug.split('/').pop()}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default function Post({ post, backlinks, allPostsGrouped, globalReferences, isHome }) {
  const router = useRouter()
  if (!router.isFallback && !post?.slug) return <ErrorPage statusCode={404} />

  if (isHome) {
    const contentBlocks = post.content.split(/(\|\|\|DIR\|\|\||\|\|\|BIB\|\|\|)/);
    
    return (
      <Layout>
        <NextSeo title={post.title} />
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
          <article className="w-full">
            <header className="mb-12 text-center border-b border-gray-200 pb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">{post.title}</h1>
            </header>

            <div className="w-full max-w-5xl mx-auto">
              {contentBlocks.map((block, i) => {
                if (block === '|||DIR|||') return <ProjectDirectory key={i} groupedNotes={allPostsGrouped} />;
                if (block === '|||BIB|||') return (
                  <div key={i} className="mt-12 border-t border-gray-200 pt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Global Reference List</h2>
                    <div className="prose prose-sm text-gray-700 max-w-none break-words" dangerouslySetInnerHTML={{ __html: globalReferences }} />
                  </div>
                );
                // FIXED: Wrapped markdown blocks precisely in the original CSS module to restore bold, headers, etc.
                return <div key={i} className={markdownStyles['markdown-body']} dangerouslySetInnerHTML={{ __html: block }} />;
              })}
            </div>
          </article>
        </section>
      </Layout>
    )
  }

  // STANDARD NOTE UI
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
  let content = await markdownToHtml(post.content || '', slug)
  
  // Replace Markdown Macros (ensures we catch it whether it was wrapped in a paragraph or not)
  content = content.replace(/<p>\s*{{\s*PROJECT_DIRECTORY\s*}}\s*<\/p>/g, '|||DIR|||');
  content = content.replace(/{{\s*PROJECT_DIRECTORY\s*}}/g, '|||DIR|||');
  content = content.replace(/<p>\s*{{\s*GLOBAL_BIBLIOGRAPHY\s*}}\s*<\/p>/g, '|||BIB|||');
  content = content.replace(/{{\s*GLOBAL_BIBLIOGRAPHY\s*}}/g, '|||BIB|||');

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
      if (p.slug !== 'home' && !p.slug.includes('attachments/') && !p.slug.includes('public/')) {
        const parts = p.slug.split(path.sep);
        const folder = parts.length > 1 ? parts[0] : 'Root';
        if (!allPostsGrouped[folder]) allPostsGrouped[folder] = [];
        allPostsGrouped[folder].push({ title: p.title, slug: p.slug });
      }
      
      // FIXED: Added Array.from to satisfy TypeScript Iterator bounds
      const matches = Array.from(p.content.matchAll(/\[@([a-zA-Z0-9_:-]+)\]/g));
      for (const match of matches) usedCitationKeys.add(match[1]);
    });

    if (usedCitationKeys.size > 0) {
      try {
        const libPath = path.join(process.cwd(), process.env.COMMON_MD_DIR, 'master-library.json');
        if (fs.existsSync(libPath)) {
          const libraryData = JSON.parse(fs.readFileSync(libPath, 'utf8'));
          const usedItems = libraryData.filter(item => usedCitationKeys.has(item.id));
          const cite = new Cite(usedItems);
          formattedBibliography = cite.format('bibliography', { format: 'html', template: 'ieee', lang: 'en-US' });
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