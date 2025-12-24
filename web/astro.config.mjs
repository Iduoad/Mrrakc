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

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), react()],
  markdown: {
    remarkPlugins: [remarkGfm, [remarkToc, { heading: 'contents' }], remarkDirective, remarkNote, remarkReadingTime],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }]
    ],
  }
});