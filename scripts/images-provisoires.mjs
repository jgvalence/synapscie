import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const IMAGES = [
  ['src/assets/site/accueil.jpg', 1200, 800, '#0f6a64', 'Accueil'],
  ['src/assets/membres/membre-1.jpg', 600, 600, '#4f565e', 'Portrait 1'],
  ['src/assets/membres/membre-2.jpg', 600, 600, '#785418', 'Portrait 2'],
  ['src/assets/membres/membre-3.jpg', 600, 600, '#0f6a64', 'Portrait 3'],
  ['src/assets/projets/atelier-couverture.jpg', 1400, 900, '#0f6a64', 'Atelier - couverture'],
  ['src/assets/projets/atelier-salle.jpg', 1200, 900, '#4f565e', 'Atelier - salle'],
  ['src/assets/projets/atelier-maquette.jpg', 1200, 900, '#785418', 'Atelier - maquette'],
  ['src/assets/projets/atelier-public.jpg', 1200, 900, '#0c5550', 'Atelier - public'],
  ['src/assets/projets/atelier-affiche.jpg', 1200, 900, '#8c9094', 'Atelier - affiche'],
  ['src/assets/projets/expo-couverture.jpg', 1400, 900, '#785418', 'Expo - couverture'],
  ['src/assets/projets/expo-vue.jpg', 1200, 900, '#4f565e', 'Expo - vue'],
];

function svg(largeur, hauteur, fond, libelle) {
  const corps = Math.round(Math.min(largeur, hauteur) / 14);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">
  <defs>
    <pattern id="q" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0v48" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${fond}"/>
  <rect width="100%" height="100%" fill="url(#q)"/>
  <text x="50%" y="50%" fill="#ffffff" fill-opacity="0.92"
        font-family="Segoe UI, system-ui, sans-serif" font-size="${corps}" font-weight="600"
        text-anchor="middle" dominant-baseline="middle">${libelle}</text>
  <text x="50%" y="${hauteur / 2 + corps * 1.3}" fill="#ffffff" fill-opacity="0.65"
        font-family="Segoe UI, system-ui, sans-serif" font-size="${corps * 0.5}"
        text-anchor="middle" dominant-baseline="middle">image provisoire</text>
</svg>`);
}

for (const [chemin, l, h, fond, libelle] of IMAGES) {
  const sortie = join(racine, chemin);
  mkdirSync(dirname(sortie), { recursive: true });
  await sharp(svg(l, h, fond, libelle)).jpeg({ quality: 82 }).toFile(sortie);
  console.log(`  ${chemin}  ${l}x${h}`);
}

console.log(`\n${IMAGES.length} images provisoires generees.\n`);
