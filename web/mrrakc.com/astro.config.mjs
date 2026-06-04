// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkDirective from 'remark-directive';
import { remarkNote } from './src/plugins/remark-note.js';
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mrrakc.com',
  image: {
    domains: ['images.unsplash.com', 'upload.wikimedia.org'],
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm, [remarkToc, { heading: 'contents' }], remarkDirective, remarkNote, remarkReadingTime],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [rehypeExternalLinks, { 
        target: '_blank', 
        rel: (el) => {
          const href = el.properties?.href;
          const highAuthority = ['wikipedia.org', 'unesco.org', 'visitmorocco.com', 'fnm.ma'];
          if (typeof href === 'string' && highAuthority.some(domain => href.includes(domain))) {
             return ['noopener', 'noreferrer'];
          }
          return ['nofollow', 'noopener', 'noreferrer'];
        }
      }]
    ],
  }
});