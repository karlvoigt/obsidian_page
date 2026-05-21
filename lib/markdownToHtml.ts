import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
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
  const links = (getLinksMapping())[currSlug] as string[]
  const linkNodeMapping = new Map<string, Element>();
  
  for (const l of links) {
    const post = getPostBySlug(l, ['title', 'content']);
    const node = createNoteNode(post.title, post.content)
    linkNodeMapping[l] = node
  }

  const file = await (unified() as any)
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeRewrite, {
      selector: 'a',
      rewrite: async (node) => rewriteLinkNodes(node, linkNodeMapping, currSlug)
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)
    
  return file.toString();
}

export function getMDExcerpt(markdown: string, length: number = 500) {
  const text = removeMd(markdown, { stripListLeaders: false, gfm: true }) as string
  return text.slice(0, length).trim();
}

export function createNoteNode(title: string, content: string) {
  const mdContentStr = getMDExcerpt(content);
  const htmlStr = renderToStaticMarkup(NotePreview({ title, content: mdContentStr }))
  return fromHtml(htmlStr);
}

function rewriteLinkNodes (node: any, linkNodeMapping: Map<string, any>, currSlug: string) {
  if (node.type === 'element' && node.tagName === 'a') {
    const linkText = node.children[0]?.value?.toLowerCase();
    const href = node.properties.href || '';

    // --- 1. FUSION 360 WIDE DROPDOWN ---
    if (linkText === 'fusion') {
      node.tagName = 'details';
      node.properties = { className: 'w-full my-8 group relative' };
      node.children = [
        {
          type: 'element',
          tagName: 'summary',
          properties: { className: 'cursor-pointer inline-flex items-center px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all list-none' },
          children: [{ type: 'text', value: '👁️ Expand Fusion 360 Model' }]
        },
        {
          type: 'element',
          tagName: 'div',
          // CSS trick to break out of the container and span 90% of screen width
          properties: { className: 'relative w-[90vw] h-[85vh] left-1/2 -translate-x-1/2 mt-6 border border-gray-300 rounded-xl overflow-hidden shadow-2xl z-50 bg-white' },
          children: [{
            type: 'element',
            tagName: 'iframe',
            properties: { src: href, width: '100%', height: '100%', frameBorder: '0', allowFullScreen: true },
            children: []
          }]
        }
      ];
      return; 
    }

    // --- 2. PDF VIEWER ---
    if (linkText === 'pdf') {
      const cleanHref = href.startsWith('http') ? href : `/${href}`;
      node.tagName = 'div';
      node.properties = { className: 'my-6 w-full h-[700px] rounded-lg overflow-hidden border border-gray-300 shadow-sm' };
      node.children = [{
        type: 'element',
        tagName: 'iframe',
        properties: { src: cleanHref, width: '100%', height: '100%', frameBorder: '0' },
        children: []
      }];
      return; 
    }

    // --- 3. STANDARD INTERNAL LINK PREVIEWS ---
    // This will only run for internal file links, restoring your hover functionality
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