import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const placesDataPath = path.resolve(__dirname, '../../../data/places');

const blog = defineCollection({
    type: 'content',
    // Type-check frontmatter using a schema
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        // Support both local images from assets and string URLs
        heroImage: z.union([image(), z.string()]).optional(),
        author: z.string().default('Mrrakc Team'),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        showToc: z.boolean().default(false),
        tocOpen: z.boolean().default(true),
    }),
});

const places = defineCollection({
    loader: glob({ pattern: "**/*.json", base: placesDataPath }),
    schema: z.object({
        version: z.string(),
        kind: z.string(),
        metadata: z.object({
            tags: z.array(z.string()).default([]),
        }).optional(),
        spec: z.object({
            name: z.string(),
            id: z.string(),
            description: z.string(),
            location: z.object({
                longitude: z.number(),
                latitude: z.number(),
                province: z.string().optional(),
            }),
            people: z.array(z.object({
                id: z.string(),
                relationship: z.array(z.string()),
                comment: z.string().optional(),
            })).optional(),
            timeline: z.array(z.object({
                title: z.string(),
                date: z.string(),
                description: z.string(),
            })).optional(),
            links: z.array(z.object({
                url: z.string(),
                type: z.string(),
                title: z.string(),
            })).optional(),
            activities: z.array(z.string()).optional(),
            items: z.array(z.string()).optional(),
            access: z.object({
                type: z.string(),
                options: z.array(z.object({
                    title: z.string(),
                    modality: z.string(),
                    audience: z.string(),
                    entranceFee: z.number().optional(),
                })).optional(),
                status: z.string().optional(),
            }).optional(),
            timePeriods: z.array(z.string()).optional(),
        }),
    }),
});

export const collections = { blog, places };
