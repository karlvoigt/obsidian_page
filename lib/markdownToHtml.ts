import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import rehypeRewrite from 'rehype-rewrite';
import rehypeStringify from 'rehype-stringify'
import { getLinksMapping, getPostBySlug, getSlugFromHref, updateMarkdownLinks } from './api'
import removeMd from 'remove-markdown'
import {Element} from 'hast-util-select'
import { renderToStaticMarkup } from "react-dom/server"
import NotePreview from '../components/misc/note-preview'
import { fromHtml } from 'hast-util-from-html'


export async function markdownToHtml(markdown: string, currSlug: string) {
  markdown = updateMarkdownLinks(markdown, currSlug);

  // get mapping of current links
  const links = (getLinksMapping())[currSlug] as string[]
  const linkNodeMapping = new Map<string, Element>();
  for (const l of links) {
    const post = getPostBySlug(l, ['title', 'content']);
    const node = createNoteNode(post.title, post.content)
    linkNodeMapping[l] = node
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath) // MUST BE BEFORE remarkRehype
    .use(remarkRehype)
    .use(rehypeKatex) // MUST BE AFTER remarkRehype
    // Note: If equations render weirdly, temporarily comment out the next line, as sanitize sometimes strips math classes.
    .use(rehypeSanitize) 
    .use(rehypeRewrite, {
      selector: 'a',
      rewrite: async (node) => rewriteLinkNodes(node, linkNodeMapping, currSlug)
    })
    .use(rehypeStringify)
    .process(markdown)
    
  return file.toString();
}

export function getMDExcerpt(markdown: string, length: number = 500) {
  const text = removeMd(markdown, {
    stripListLeaders: false, 
    gfm: true,
  }) as string
  return text.slice(0, length).trim();
}

export function createNoteNode(title: string, content: string) {
  const mdContentStr = getMDExcerpt(content);
  const htmlStr = renderToStaticMarkup(NotePreview({ title, content: mdContentStr }))
  const noteNode = fromHtml(htmlStr);
  return noteNode;
}

function rewriteLinkNodes (node: any, linkNodeMapping: Map<string, any>, currSlug: string) {
  if (node.type === 'element' && node.tagName === 'a') {
    
    // --- NEW: CUSTOM EMBED INTERCEPTOR ---
    const linkText = node.children[0]?.value?.toLowerCase();
    const href = node.properties.href;

    // 1. Fusion 360 Embed
    if (linkText === 'fusion') {
      node.tagName = 'div';
      node.properties = { className: 'my-8 w-full aspect-video rounded-xl overflow-hidden border border-gray-300 shadow-md bg-gray-50' };
      node.children = [{
        type: 'element',
        tagName: 'iframe',
        properties: { src: href, width: '100%', height: '100%', allowFullScreen: true, frameBorder: "0" },
        children: []
      }];
      return;
    }

    // 2. PDF Viewer Embed
    if (linkText === 'pdf') {
      node.tagName = 'div';
      node.properties = { className: 'my-6 w-full h-[600px] rounded-lg overflow-hidden border border-gray-300 shadow-sm' };
      // Ensure the PDF path routes correctly to the public folder
      const cleanHref = href.startsWith('http') ? href : `/${href}`;
      node.children = [{
        type: 'element',
        tagName: 'iframe',
        properties: { src: cleanHref, width: '100%', height: '100%', frameBorder: "0" },
        children: []
      }];
      return;
    }

    // 3. GitHub Repository Card
    if (linkText === 'github') {
      // Extracts "username/repo" from a standard github.com URL
      const repoPath = href.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
      node.tagName = 'div';
      node.properties = { className: 'my-6 p-5 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow flex items-center' };
      node.children = [{
        type: 'element',
        tagName: 'a',
        properties: { href: href, target: '_blank', rel: 'noopener noreferrer', className: 'text-lg font-semibold text-blue-600 no-underline' },
        children: [{ type: 'text', value: `🐙 GitHub Repository: ${repoPath}` }]
      }];
      return;
    }
    // --- END CUSTOM EMBEDS ---

    // Standard Obsidian internal link hover logic
    const slug = getSlugFromHref(currSlug, href)
    const noteCardNode = linkNodeMapping[slug]
    if (noteCardNode) {
      const anchorNode = {...node}
      anchorNode.properties.className = 'internal-link'
      node.tagName = 'span'
      node.properties = { className: 'internal-link-container' }
      node.children = [ anchorNode, noteCardNode ]
    }
  }
}
