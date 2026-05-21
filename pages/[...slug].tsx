import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { useState, useEffect } from 'react'
import { getPostBySlug, getAllPosts, getLinksMapping, getProjectExplorerData } from '../lib/api'
import { markdownToHtml } from '../lib/markdownToHtml'
import path from 'path'
import fs from 'fs'
import PostSingle from '../components/blog/post-single'
import Layout from '../components/misc/layout'
import { NextSeo } from 'next-seo'
import Link from 'next/link'
import Cite from 'citation-js'
import Backlinks from '../components/misc/backlinks'
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

// Collapsible Section Helper Component
const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full text-left mb-2 group"
      >
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-800 transition-colors">{title}</h3>
        <span className="text-gray-400 text-[10px] transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      {isOpen && <div className="space-y-1 mb-4">{children}</div>}
    </div>
  );
};

// Sidebar Sub-Component
const ProjectSidebar = ({ data }: { data: any }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleLeftSidebar', toggle);
    return () => window.removeEventListener('toggleLeftSidebar', toggle);
  }, []);

  return (
    <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 border-r border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col pt-24 pb-10 overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
       <div className="flex-1 overflow-y-auto px-5 space-y-2">
        {/* Markdown Files */}
            {data?.markdown && Object.keys(data.markdown).length > 0 && (
            <CollapsibleSection title="Vault Pages">
              {Object.entries(data.markdown).map(([folder, links]) => (
                <div key={folder} className="mb-3">
                   <h4 className="text-sm font-semibold text-gray-800 capitalize mb-1">{folder === 'Root' ? 'General' : folder.replace('-', ' ')}</h4>
                   <ul className="ml-2 space-y-1 border-l-2 border-gray-200 pl-2">
                      {(links as any[]).map(link => (
                        <li key={link.url}>
                          <Link href={link.url} className="text-sm text-gray-600 hover:text-blue-600 block truncate transition-colors">
                            {link.title}
                          </Link>
                        </li>
                      ))}
                   </ul>
                </div>
              ))}
            </CollapsibleSection>
          )}

            {/* Fusion Files */}
            {data?.fusion?.length > 0 && (
              <CollapsibleSection title="Fusion 360 Models">
               <ul className="space-y-1">
                 {data.fusion.map((link: any, i: number) => (
                   <li key={i}>
                     <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-blue-600 block truncate transition-colors">
                       {link.title}
                     </a>
                   </li>
                 ))}
               </ul>
            </CollapsibleSection>
            )}

            {/* GitHub Links */}
            {data?.github?.length > 0 && (
              <CollapsibleSection title="GitHub Repositories">
               <ul className="space-y-1">
                 {data.github.map((link: any, i: number) => (
                   <li key={i}>
                     <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-blue-600 block truncate transition-colors">
                       {link.title}
                     </a>
                   </li>
                 ))}
               </ul>
            </CollapsibleSection>
            )}

            {/* PDFs */}
            {data?.pdf?.length > 0 && (
             <CollapsibleSection title="Datasheets">
               <ul className="space-y-1">
                 {data.pdf.map((link: any, i: number) => (
                   <li key={i}>
                     <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-blue-600 block truncate transition-colors">
                       {link.title}
                     </a>
                   </li>
                 ))}
               </ul>
            </CollapsibleSection>
            )}
         </div>
      </div>
  );
};

// Right Sidebar Sub-Component (Tabs)
const RightSidebar = ({ backlinks, forwardlinks, outline }: { backlinks: any, forwardlinks: any, outline: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('outline'); // 'outline', 'backlinks', 'forwardlinks'

  useEffect(() => {
    const toggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleRightSidebar', toggle);
    return () => window.removeEventListener('toggleRightSidebar', toggle);
  }, []);

  return (
    <div className={`fixed inset-y-0 right-0 z-40 w-80 bg-gray-50 border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col pt-24 pb-10 overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
       
       {/* Tabs Header */}
       <div className="px-5 mb-4 border-b border-gray-200 flex space-x-4">
         <button onClick={() => setActiveTab('outline')} className={`pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'outline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Outline</button>
         <button onClick={() => setActiveTab('backlinks')} className={`pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'backlinks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Backlinks</button>
         <button onClick={() => setActiveTab('forwardlinks')} className={`pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'forwardlinks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Forward</button>
       </div>

       <div className="flex-1 overflow-y-auto px-5">
          
          {/* Outline Tab */}
          {activeTab === 'outline' && (
            <div className="space-y-1">
              {outline.length === 0 ? <p className="text-sm text-gray-400">No outline available.</p> : (
                <ul className="space-y-1.5">
                  {outline.map((heading, i) => (
                    <li key={i} style={{ marginLeft: `${(heading.level - 1) * 12}px` }}>
                      <a href={`#${heading.id}`} className="text-sm text-gray-600 hover:text-blue-600 block truncate transition-colors">
                        {heading.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Backlinks Tab */}
          {activeTab === 'backlinks' && (
             Object.keys(backlinks).length === 0 ? <p className="text-sm text-gray-400">No backlinks found.</p> : <div className="flex flex-col gap-4"><Backlinks backlinks={backlinks} /></div>
          )}

          {/* Forward links Tab */}
          {activeTab === 'forwardlinks' && (
             Object.keys(forwardlinks).length === 0 ? <p className="text-sm text-gray-400">No forward links found.</p> : <div className="flex flex-col gap-4"><Backlinks backlinks={forwardlinks} /></div>
          )}
       </div>
    </div>
  );
};

export default function Post({ post, backlinks, forwardlinks, allPostsGrouped, globalReferences, isHome, explorerData, outline }) {
  const router = useRouter()
  if (!router.isFallback && !post?.slug) return <ErrorPage statusCode={404} />

  // Collapsible Headings Initializer
  useEffect(() => {
    const article = document.querySelector('article');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach((heading: any) => {
      // Prevent re-attaching on soft re-renders
      if (heading.querySelector('.collapse-indicator')) return;

      heading.style.cursor = 'pointer';
      heading.title = 'Click to collapse/expand';
      
      const indicator = document.createElement('span');
      indicator.innerHTML = '&#9660;'; // Down-pointing triangle
      indicator.className = 'collapse-indicator inline-block ml-2 text-gray-400 text-[10px] transition-transform duration-200';
      heading.appendChild(indicator);

      heading.addEventListener('click', () => {
        const isCollapsed = heading.classList.toggle('is-collapsed');
        indicator.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';

        const level = parseInt(heading.tagName[1]);
        let sibling = heading.nextElementSibling;
        let skipUntilLevel = 0;
        
        while (sibling) {
          const isHeading = /^H[1-6]$/.test(sibling.tagName);
          let siblingLevel = 10;

          if (isHeading) {
            siblingLevel = parseInt(sibling.tagName[1]);
            if (siblingLevel <= level) break; // Reached next section of equal/higher rank
          }
          
          if (isCollapsed) {
            sibling.style.display = 'none';
          } else {
            // Expanding: check if we are currently skipping a nested collapsed section
            if (skipUntilLevel > 0) {
              if (isHeading && siblingLevel <= skipUntilLevel) {
                skipUntilLevel = 0; // Exited the collapsed sub-section
              }
            }

            if (skipUntilLevel === 0) {
              sibling.style.display = '';
              // If this sibling is a collapsed heading itself, skip its children
              if (isHeading && sibling.classList.contains('is-collapsed')) {
                skipUntilLevel = siblingLevel;
              }
            }
          }
          sibling = sibling.nextElementSibling;
        }
      });
    });
  }, [post?.slug]);

  if (isHome) {
    const contentBlocks = post.content.split(/(\|\|\|DIR\|\|\||\|\|\|BIB\|\|\|)/);
    
    return (
      <Layout hasSidebars={true}>
        <ProjectSidebar data={explorerData} />
        <RightSidebar backlinks={backlinks} forwardlinks={forwardlinks} outline={outline} />
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
    <Layout hasSidebars={true}>
      <ProjectSidebar data={explorerData} />
      <RightSidebar backlinks={backlinks} forwardlinks={forwardlinks} outline={outline} />
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

  const explorerData = getProjectExplorerData();
  const linkMapping = await getLinksMapping()
  const backlinks = Object.keys(linkMapping).filter(k => linkMapping[k].includes(post.slug) && k !== post.slug)
  const backlinkNodes = Object.fromEntries(await Promise.all(backlinks.map(async (s) => [s, await getPostBySlug(s, ['title', 'excerpt'])])));

  // Extract Forward Links (gracefully handling missing/dangling links)
  const forwardlinksSlugs = linkMapping[post.slug] || [];
  const forwardlinkNodes = {};
  for (const s of forwardlinksSlugs) {
    try {
      forwardlinkNodes[s] = await getPostBySlug(s, ['title', 'excerpt']);
    } catch (e) {
      // Ignore dangling links to notes that haven't been created yet
    }
  }

  // Extract Document Outline
  const outline = [];
  const headingRegex = /^(#{1,6})\s+(.*)$/gm;
  let match;
  
  const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  while ((match = headingRegex.exec(post.content || '')) !== null) {
    const rawTitle = match[2].replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/[*_~`]/g, '');
    outline.push({
      level: match[1].length,
      title: rawTitle,
      id: slugify(rawTitle)
    });
  }

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
      forwardlinks: forwardlinkNodes,
      allPostsGrouped,
      globalReferences: formattedBibliography,
      isHome,
      explorerData,
      outline
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