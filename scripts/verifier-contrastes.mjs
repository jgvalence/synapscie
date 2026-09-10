/**
 * Verifie le systeme de couleurs de src/styles/global.css.
 *
 * Le script ne connait aucune couleur : il lit les jetons dans le CSS, resout
 * les var() et les color-mix(), puis applique la meme grille de controles au
 * theme clair et au theme sombre. Ajouter un jeton ou changer une teinte ne
 * demande donc jamais de modifier ce fichier.
 *
 * Controles :
 *  - contrastes RGAA 4.1 / WCAG 2.1 AA (4.5:1 pour le texte, 3:1 pour le reste)
 *  - lisibilite conservee sous quatre formes de daltonisme
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(racine, 'src/styles/global.css'), 'utf8');

/* -------------------------------------------------------------------------
   Lecture du CSS
   ------------------------------------------------------------------------- */

/** Renvoie le contenu du bloc { } qui commence a partir de `depuis`. */
function corpsDuBloc(texte, depuis) {
  const ouvrant = texte.indexOf('{', depuis);
  if (ouvrant === -1) return null;
  let profondeur = 0;
  for (let i = ouvrant; i < texte.length; i++) {
    if (texte[i] === '{') profondeur++;
    else if (texte[i] === '}' && --profondeur === 0) {
      return { corps: texte.slice(ouvrant + 1, i), fin: i };
    }
  }
  return null;
}

/** Extrait les declarations `--nom: valeur;` d'un corps de regle. */
function declarations(corps) {
  const sansCommentaires = corps.replace(/\/\*[\s\S]*?\*\//g, '');
  const jetons = {};
  for (const [, nom, valeur] of sansCommentaires.matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  )) {
    jetons[nom] = valeur.trim();
  }
  return jetons;
}

function blocRacine(texte, depuis = 0) {
  const i = texte.indexOf(':root', depuis);
  if (i === -1) return null;
  const bloc = corpsDuBloc(texte, i);
  return bloc && { jetons: declarations(bloc.corps), fin: bloc.fin };
}

const clair = blocRacine(css);
if (!clair) throw new Error('Aucun bloc :root trouve dans global.css');

const iSombre = css.indexOf('@media (prefers-color-scheme: dark)');
if (iSombre === -1) {
  throw new Error(
    'Aucun bloc @media (prefers-color-scheme: dark) trouve : le theme sombre ' +
      'ne serait plus verifie.',
  );
}
const sombre = blocRacine(css, iSombre);
if (!sombre) throw new Error('Le bloc sombre ne contient pas de :root');

/* Le theme sombre existe en deux exemplaires dans global.css : le @media
   ci-dessus, qui suit le systeme, et :root[data-theme='sombre'], qu'active le
   bouton de bascule. CSS ne sait pas partager un corps de regle entre un
   @media et un selecteur ordinaire, la duplication est donc inevitable.
   On verifie ici qu'ils declarent exactement les memes jetons : sans ce
   controle, modifier une couleur dans l'un et pas dans l'autre donnerait deux
   themes sombres differents selon la facon dont il a ete active. */
const SELECTEUR_FORCE = ":root[data-theme='sombre']";
const iForce = css.indexOf(SELECTEUR_FORCE);
if (iForce === -1) {
  throw new Error(
    `Aucun bloc ${SELECTEUR_FORCE} trouve : le theme sombre choisi au bouton ` +
      'ne serait plus verifie.',
  );
}
const blocForce = corpsDuBloc(css, iForce);
if (!blocForce) throw new Error(`Le bloc ${SELECTEUR_FORCE} est mal forme.`);

const jetonsForces = declarations(blocForce.corps);
const ecarts = [];
for (const nom of new Set([...Object.keys(sombre.jetons), ...Object.keys(jetonsForces)])) {
  const a = sombre.jetons[nom];
  const b = jetonsForces[nom];
  if (a !== b) {
    // `nom` porte deja son prefixe `--`, declarations() le conserve.
    ecarts.push(`  ${nom}\n    @media : ${a ?? 'absent'}\n    bouton : ${b ?? 'absent'}`);
  }
}
if (ecarts.length > 0) {
  console.error(
    `\nLes deux blocs du theme sombre divergent sur ${ecarts.length} jeton(s).\n` +
      `Ils doivent rester identiques mot pour mot (voir la section 3 de\n` +
      `src/styles/global.css).\n\n${ecarts.join('\n')}\n`,
  );
  process.exit(1);
}

const THEMES = {
  clair: clair.jetons,
  sombre: { ...clair.jetons, ...sombre.jetons },
};

/* -------------------------------------------------------------------------
   Resolution des valeurs (var, color-mix)
   ------------------------------------------------------------------------- */

/** Decoupe une liste d'arguments sur les virgules de premier niveau. */
function decouper(texte) {
  const parts = [];
  let profondeur = 0;
  let courant = '';
  for (const c of texte) {
    if (c === '(') profondeur++;
    if (c === ')') profondeur--;
    if (c === ',' && profondeur === 0) {
      parts.push(courant);
      courant = '';
    } else courant += c;
  }
  parts.push(courant);
  return parts.map((p) => p.trim());
}

function resoudre(valeur, jetons, vus = []) {
  const v = valeur.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return normaliser(v);

  const ref = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (ref) {
    const nom = ref[1];
    if (vus.includes(nom)) throw new Error(`Reference circulaire sur ${nom}`);
    if (!(nom in jetons)) throw new Error(`Jeton ${nom} introuvable`);
    return resoudre(jetons[nom], jetons, [...vus, nom]);
  }

  if (v.startsWith('color-mix(')) {
    const args = decouper(v.slice('color-mix('.length, -1));
    if (args.length !== 3 || args[0] !== 'in srgb') {
      throw new Error(`color-mix non gere : ${v}`);
    }
    const part = args[1].match(/^(.*?)\s+([\d.]+)%$/);
    if (!part) throw new Error(`Pourcentage absent dans : ${v}`);
    return melange(
      resoudre(part[1], jetons, vus),
      resoudre(args[2], jetons, vus),
      Number(part[2]),
    );
  }

  throw new Error(`Valeur de couleur non geree : ${v}`);
}

const lire = (theme, nom) => {
  const jetons = THEMES[theme];
  if (!(`--${nom}` in jetons)) {
    throw new Error(`Jeton --${nom} absent du theme ${theme}`);
  }
  return resoudre(`var(--${nom})`, jetons);
};

/* -------------------------------------------------------------------------
   Couleur
   ------------------------------------------------------------------------- */

function versRvb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const versHex = (rvb) =>
  '#' +
  rvb
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('');

const normaliser = (hex) => versHex(versRvb(hex));

function melange(a, b, partA) {
  const [ar, ag, ab] = versRvb(a);
  const [br, bg, bb] = versRvb(b);
  const t = partA / 100;
  return versHex([ar * t + br * (1 - t), ag * t + bg * (1 - t), ab * t + bb * (1 - t)]);
}

const versLineaire = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const depuisLineaire = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return v * 255;
};

function luminance(hex) {
  const [r, g, b] = versRvb(hex).map(versLineaire);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function versLab(hex) {
  const [r, g, b] = versRvb(hex).map(versLineaire);
  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  let z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function ecart(a, b) {
  const [l1, a1, b1] = versLab(a);
  const [l2, a2, b2] = versLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const MATRICES = {
  protanopie: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopie: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopie: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simuler(hex, type) {
  if (type === 'achromatopsie') {
    const g = depuisLineaire(luminance(hex));
    return versHex([g, g, g]);
  }
  const m = MATRICES[type];
  const [r, g, b] = versRvb(hex).map(versLineaire);
  return versHex([
    depuisLineaire(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    depuisLineaire(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    depuisLineaire(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  ]);
}

/* -------------------------------------------------------------------------
   Grille de controles
   Chaque ligne dit : ou la couleur apparait, quel jeton par-dessus, quel jeton
   par-dessous, et le seuil RGAA applicable.
   ------------------------------------------------------------------------- */

const TEXTE = 4.5;
const NON_TEXTE = 3.0;

const COUPLES = [
  ['Texte courant sur le fond', 'texte', 'fond', TEXTE],
  ['Texte courant sur le fond doux', 'texte', 'fond-doux', TEXTE],
  ['Texte secondaire sur le fond', 'texte-doux', 'fond', TEXTE],
  ['Texte secondaire (pied de page, legendes)', 'texte-doux', 'fond-doux', TEXTE],
  ['Lien dans le texte', 'lien', 'fond', TEXTE],
  ['Lien dans le pied de page', 'lien', 'fond-doux', TEXTE],
  ['Libelle du bouton plein', 'primaire-aplat-texte', 'primaire-aplat', TEXTE],
  ['Libelle du bouton plein au survol', 'primaire-aplat-texte', 'primaire-aplat-survol', TEXTE],
  ['Lien d-evitement au clavier', 'primaire-aplat-texte', 'primaire-aplat', TEXTE],
  ['Libelle du bouton contour', 'primaire-fort', 'fond', TEXTE],
  ['Onglet actif de la navigation', 'primaire-fort', 'primaire-voile', TEXTE],
  ['Valeur des chiffres cles', 'primaire-fort', 'fond-doux', TEXTE],
  ['Texte sur le voile secondaire (citation)', 'texte', 'secondaire-voile', TEXTE],
  ['Texte sur la surface secondaire', 'marque-secondaire-texte', 'marque-secondaire', TEXTE],

  ['Bordure porteuse de sens', 'trait', 'fond', NON_TEXTE],
  ['Bordure de champ de formulaire', 'trait', 'fond-doux', NON_TEXTE],
  ['Contour de focus', 'focus', 'fond', NON_TEXTE],
  ['Contour de focus sur le fond doux', 'focus', 'fond-doux', NON_TEXTE],
  ['Bordure du bouton contour', 'primaire-lisible', 'fond', NON_TEXTE],
  ['Trait de l-onglet actif', 'primaire-lisible', 'primaire-voile', NON_TEXTE],
  ['Filet des cartes de raccourci', 'primaire-lisible', 'fond-doux', NON_TEXTE],
  ['Bordure des surfaces secondaires', 'secondaire-trait', 'fond', NON_TEXTE],
  ['Bordure du voile secondaire', 'secondaire-trait', 'secondaire-voile', NON_TEXTE],
];

/* Les deux couleurs d'identite doivent rester distinguables l'une de l'autre :
   le seuil porte sur l'ecart perceptuel une fois la vision simulee.
   Le controle porte sur --marque-primaire et --marque-secondaire, pas sur leurs
   variantes lisibles. Ce serait un faux positif : deux couleurs contraintes a
   atteindre le meme rapport de contraste sur le meme fond finissent
   necessairement a des luminances voisines, donc identiques en achromatopsie.
   Ce que ce controle protege, c'est l'identite visuelle ; le fait qu'aucune
   information ne repose sur la teinte est garanti autrement (liens soulignes,
   onglet actif signale aussi par la graisse et un trait). */
const VISIONS = ['deuteranopie', 'protanopie', 'tritanopie', 'achromatopsie'];
const SEUIL_ECART = 20;

let echecs = 0;
const ligne = (ok, texte) => {
  if (!ok) echecs++;
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'}  ${texte}`);
};

for (const theme of ['clair', 'sombre']) {
  console.log(`\n================  THEME ${theme.toUpperCase()}  ================`);
  console.log(
    `  fond ${lire(theme, 'fond')}   texte ${lire(theme, 'texte')}   ` +
      `primaire ${lire(theme, 'primaire-lisible')}   ` +
      `secondaire ${lire(theme, 'secondaire-trait')}`,
  );

  console.log('\n  Contrastes - RGAA 4.1 / WCAG 2.1 niveau AA\n');
  for (const [nom, dessus, dessous, seuil] of COUPLES) {
    const a = lire(theme, dessus);
    const b = lire(theme, dessous);
    const r = contraste(a, b);
    ligne(
      r >= seuil,
      `${r.toFixed(2).padStart(5)}:1  (min ${seuil.toFixed(1)})  ${nom}  [${a} sur ${b}]`,
    );
  }

  console.log('\n  Daltonisme - primaire et secondaire restent-elles distinctes ?\n');
  const p = lire(theme, 'marque-primaire');
  const s = lire(theme, 'marque-secondaire');
  for (const vision of VISIONS) {
    const d = ecart(simuler(p, vision), simuler(s, vision));
    ligne(
      d >= SEUIL_ECART,
      `ecart ${d.toFixed(1).padStart(5)}  (min ${SEUIL_ECART})  ${vision.padEnd(14)} ` +
        `${simuler(p, vision)} / ${simuler(s, vision)}`,
    );
  }
}

if (echecs > 0) {
  console.error(
    `\n${echecs} controle(s) en echec. Ajuster les jetons dans src/styles/global.css.\n`,
  );
  process.exit(1);
}
console.log('\nTous les controles passent, dans les deux themes.\n');
