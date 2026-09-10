import { defineCollection } from 'astro:content';
import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blocs = ({ image }: SchemaContext) =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('paragraphe'),
      titre: z.string().optional(),
      texte: z.string(),
    }),
    z.object({
      type: z.literal('texte-image'),
      titre: z.string().optional(),
      texte: z.string(),
      image: image(),
      alt: z.string(),
      position_image: z.enum(['gauche', 'droite']).default('droite'),
      legende: z.string().optional(),
    }),
    z.object({
      type: z.literal('image'),
      image: image(),
      alt: z.string(),
      legende: z.string().optional(),
    }),
    z.object({
      type: z.literal('galerie'),
      titre: z.string().optional(),
      images: z
        .array(
          z.object({
            image: image(),
            alt: z.string(),
            legende: z.string().optional(),
          }),
        )
        .min(1),
    }),
    z.object({
      type: z.literal('citation'),
      texte: z.string(),
      auteur: z.string().optional(),
    }),
    z.object({
      type: z.literal('chiffres'),
      titre: z.string().optional(),
      items: z
        .array(z.object({ valeur: z.string(), label: z.string() }))
        .min(1),
    }),
    z.object({
      type: z.literal('bouton'),
      texte: z.string(),
      url: z.string(),
      style: z.enum(['plein', 'contour']).default('plein'),
    }),
    z.object({
      type: z.literal('video'),
      titre: z.string().optional(),
      url: z.string().url(),
    }),
    z.object({
      type: z.literal('separateur'),
    }),
  ]);

const projets = defineCollection({
  loader: glob({ base: './src/content/projets', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      titre: z.string(),
      accroche: z.string(),
      couverture: image(),
      alt_couverture: z.string(),
      date: z.coerce.date(),
      publie: z.boolean().default(true),
      blocs: z.array(blocs({ image })).default([]),
    }),
});

const membres = defineCollection({
  loader: glob({ base: './src/content/membres', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      nom: z.string(),
      role: z.string().optional(),
      bio: z.string(),
      photo: image().optional(),
      alt_photo: z.string().optional(),
      ordre: z.number().default(100),
    }),
});

export const collections = { projets, membres };
