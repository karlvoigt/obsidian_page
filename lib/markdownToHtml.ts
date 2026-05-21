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
      selector: 'a, h1, h2, h3, h4, h5, h6',
      rewrite: async (node) => rewriteNodes(node, linkNodeMapping, currSlug)
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

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function getText(node: any): string {
  if (node.type === 'text') return node.value || '';
  if (node.children) return node.children.map(getText).join('');
  return '';
}

function rewriteNodes (node: any, linkNodeMapping: Map<string, any>, currSlug: string) {
  if (/^h[1-6]$/.test(node.tagName)) {
    const text = getText(node);
    node.properties = node.properties || {};
    node.properties.id = slugify(text);
    return;
  }

  if (node.type === 'element' && node.tagName === 'a') {
    const href = node.properties?.href || '';
    const originalNode = { ...node };

    // --- 1. FUSION 360 WIDE DROPDOWN ---
    if (href.includes('a360.co') || href.includes('autodesk')) {
      node.tagName = 'details';
      node.properties = { className: 'my-6 w-full group relative' };
      node.children = [
        {
          type: 'element',
          tagName: 'summary',
          properties: { className: 'cursor-pointer list-none flex items-center w-fit select-none' },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { className: 'mr-6 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm border border-gray-300 transition-colors' },
              children: [{ type: 'text', value: 'Preview ▼' }]
            },
            originalNode
          ]
        },
        {
          type: 'element',
          tagName: 'div',
          properties: { className: 'w-full aspect-video mt-4 border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-gray-50' },
          children: [{
            type: 'element',
            tagName: 'iframe',
            properties: { src: href, className: 'w-full h-full', frameBorder: '0', allowFullScreen: true },
            children: []
          }]
        }
      ];
      return; 
    }

    // --- 2. GITHUB HOVER CARDS ---
    if (href.includes('github.com')) {
      const repoPath = href.replace('https://github.com/', '').split('/').slice(0, 2).join('/');
      node.tagName = 'span';
      node.properties = { className: 'group relative inline-block' };
      // Ensure the text itself still looks like a link
      originalNode.properties.className = 'text-blue-600 hover:underline';
      
      node.children = [
        originalNode,
        {
          type: 'element',
          tagName: 'span',
          properties: { className: 'absolute left-0 bottom-full mb-2 w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity z-50 p-3 bg-white border border-gray-200 shadow-xl rounded-lg pointer-events-none' },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { className: 'block font-semibold text-gray-900 mb-1 text-sm' },
              children: [{ type: 'text', value: '🐙 GitHub Repository' }]
            },
            {
              type: 'element',
              tagName: 'span',
              properties: { className: 'block text-gray-600 text-xs' },
              children: [{ type: 'text', value: repoPath }]
            }
          ]
        }
      ];
      return; 
    }

    // --- 3. PDF DATASHEETS ---
    if (href.endsWith('.pdf')) {
      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';
      return; 
    }

    // --- 4. STANDARD INTERNAL LINK PREVIEWS ---
    const slug = getSlugFromHref(currSlug, href)
    const noteCardNode = linkNodeMapping[slug]
    if (noteCardNode) {
      const anchorNode = {...originalNode}
      anchorNode.properties.className = 'internal-link'
      node.tagName = 'span'
      node.properties = { className: 'internal-link-container' }
      node.children = [ anchorNode, noteCardNode ]
    }
  }
}