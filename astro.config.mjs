import { defineConfig } from 'astro/config';

export default defineConfig({
  // Hébergement provisoire, le temps que l'association crée son organisation
  // GitHub. Au transfert : site: 'https://synapscie.github.io' et supprimer
  // `base`. Les liens internes passent par src/lib/lien.ts et suivent seuls.
  site: 'https://jgvalence.github.io',
  base: '/synapscie',
  build: { format: 'directory' },
});
