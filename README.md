# Site SynapScie

Site vitrine de l'association : Astro, pages statiques publiées sur GitHub
Pages. Les membres et les projets se rédigent depuis `/admin`, sans passer par
le code.

Première installation : [SETUP.md](SETUP.md).

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur local sur http://localhost:4321 |
| `npm run build` | Vérifie les contrastes, puis construit dans `dist/` |
| `npm run preview` | Sert `dist/` |
| `npm run verifier:contrastes` | Contrôle des couleurs (RGAA + daltonisme) |
| `npm run verifier:types` | Contrôle TypeScript et Astro |

## Couleurs

Tout le site descend de quatre valeurs, en haut de
[`src/styles/global.css`](src/styles/global.css) :

```css
--marque-primaire: #0f6a64;
--marque-secondaire: #f0a830;
--marque-primaire-texte: #ffffff;
--marque-secondaire-texte: #16191d;
```

Survols, voiles et bordures en sont dérivés par `color-mix()`. Aucun composant
n'écrit de couleur en dur : re-thémer le site tient dans ces quatre lignes.

Les composants n'utilisent pas ces variables directement, ils passent par des
jetons de rôle qui disent à quoi sert la couleur :

| Jeton | Usage |
| --- | --- |
| `--primaire-lisible` | Texte ou trait sur `--fond` |
| `--primaire-fort` | Texte sur `--primaire-voile` ou `--fond-doux` |
| `--primaire-voile` | Aplat très léger, teinté |
| `--primaire-aplat` | Aplat plein, porte `--primaire-aplat-texte` |
| `--primaire-aplat-survol` | Le même au survol |
| `--secondaire-trait` / `--secondaire-voile` | Bordure et fond des encarts |

Dans un nouveau bloc, utiliser un jeton de rôle et jamais `--marque-*` : c'est
cette indirection qui permet au thème sombre de redéfinir les couleurs sans
toucher aux composants.

### Vérification des contrastes

`npm run verifier:contrastes` recalcule les couples texte/fond dans les deux
thèmes et échoue si l'un passe sous le seuil RGAA. Le script tourne aussi à
chaque build et dans l'intégration continue, donc une couleur non conforme ne
peut pas être mise en ligne. À relancer après tout changement de couleur.

Il vérifie en plus que les deux couleurs de marque restent distinguables en
protanopie, deutéranopie, tritanopie (matrices de Machado et al., 2009) et en
achromatopsie. C'est ce contrôle qui a écarté le couple envisagé au départ
(teal + terre de sienne) : à clarté équivalente, deux couleurs deviennent
identiques en noir et blanc même si leurs teintes sont très éloignées. D'où une
primaire sombre et une secondaire claire. La contrainte vaudra pour tout autre
couple choisi ensuite.

Le contrôle daltonisme porte sur les couleurs de marque, pas sur leurs variantes
lisibles : deux couleurs contraintes au même rapport de contraste sur le même
fond finissent forcément à des luminosités voisines, le test serait rouge en
permanence.

### Thème sombre

Le site suit le réglage du système via `@media (prefers-color-scheme: dark)`.
Pas de bouton de bascule, donc ni script ni stockage sur les pages publiques.

Sur fond sombre, la primaire de marque est trop peu contrastée pour porter du
texte : les rôles sont mélangés vers le blanc au lieu du noir, et l'aplat plein
s'éclaircit en portant du texte sombre.

## Contenu

| Rubrique | Emplacement | Modifiable depuis `/admin` |
| --- | --- | --- |
| Accueil | `src/pages/index.astro` | non, en dur |
| Membres | `src/content/membres/` | oui |
| Projets | `src/content/projets/` | oui |
| Contact | `src/pages/contact.astro` | non, en dur |
| Confirmation d'envoi | `src/pages/merci.astro` | non, en dur |

### Contact : formulaire ou adresse

Le contact a deux états, décidés par la présence de la clé Web3Forms et
centralisés dans [`src/lib/contact.ts`](src/lib/contact.ts).

| | Clé posée | Clé absente |
| --- | --- | --- |
| Page Contact | formulaire | adresse de courriel en bouton |
| Menu | « Nous contacter » | rien |
| Raccourci d'accueil | vers `/contact/` | vers `mailto:` |
| Pied de page | « Nous contacter » | l'adresse |

Sans clé, une page Contact réduite à une adresse n'a pas sa place dans le menu :
l'adresse remonte au pied de page, où elle est visible partout. La page reste
construite et accessible pour qui a le lien. Poser la clé rallume les quatre
lignes d'un coup, il n'y a rien à décommenter.

Les images envoyées depuis l'admin arrivent dans `src/assets/`, pas dans
`public/` : elles sont ainsi recompressées à la construction et déclinées en
AVIF, WebP et JPEG à plusieurs largeurs. Une photo de 8 Mo sortie d'un téléphone
est servie autour de 30 ko.

### Blocs d'une fiche projet

Une fiche projet n'est pas un texte libre mais une suite de blocs empilés depuis
l'admin, chacun avec ses champs et son rendu, pour que la mise en page reste
cohérente quelle que soit la saisie.

Blocs disponibles : paragraphe, texte + image, image seule, galerie, citation,
chiffres clés, bouton, vidéo, séparateur.

[`src/content/projets/ateliers-itinerants.md`](src/content/projets/ateliers-itinerants.md)
les utilise tous et sert de référence.

Pour ajouter un type de bloc, quatre fichiers dans cet ordre :

1. `src/content.config.ts` : décrire les champs dans l'union `blocs`. Ce schéma
   valide le contenu, un bloc mal rempli fait échouer la construction au lieu de
   produire une page cassée en ligne.
2. `src/components/blocs/<Nom>.astro` : le rendu.
3. `src/components/RenduBlocs.astro` : un `case` dans l'aiguillage.
4. `public/admin/config.yml` : les mêmes champs sous `types:`, pour que le bloc
   apparaisse dans le menu « Ajouter un bloc ».

Les noms de champs doivent être identiques dans les quatre fichiers.

## Accessibilité

Cible : RGAA 4.1, équivalent WCAG 2.1 niveau AA.

- Contrastes vérifiés automatiquement, éléments non textuels compris.
- Aucune information portée par la seule couleur : l'onglet actif est signalé
  par la couleur, la graisse et un trait, les liens dans le texte sont soulignés.
- Lien d'évitement, régions `header` / `nav` / `main` / `footer`, `aria-current`
  sur la page courante, hiérarchie de titres continue.
- Texte alternatif obligatoire dans le schéma : publier une image sans
  description est impossible.
- Formulaire de contact : étiquettes visibles et reliées, champs obligatoires
  annoncés par du texte, mention de confidentialité rattachée par
  `aria-describedby`. Pas de captcha, mais un piège à robots invisible et hors
  du parcours clavier.
- `prefers-reduced-motion`, `prefers-contrast` et `prefers-color-scheme`
  respectés. Les surcharges de `prefers-contrast` sont déclarées après le thème
  sombre, pour gagner dans les deux thèmes.
- Cibles tactiles de 44 px minimum.

Restent à faire avant une mise en ligne officielle : la déclaration
d'accessibilité, et un audit sur les pages réelles une fois le contenu définitif
en place.

## Écoconception

Repères mesurés sur la construction actuelle :

- Aucun fichier JavaScript servi aux visiteurs. Le seul script du site (le
  chargement différé des vidéos) fait une quinzaine de lignes, est intégré à la
  page et n'apparaît que sur les pages qui contiennent une vidéo.
- Une seule feuille de style, environ 5 ko, thème sombre compris.
- Pages HTML de 3 à 19 ko.
- Aucune police téléchargée, la typographie utilise la pile système.
- Aucune requête vers un tiers sur les pages publiques : pas de CDN, pas de
  mesure d'audience, pas de cookie.
- Vidéos en chargement différé. Un lecteur YouTube intégré pèse près d'un
  mégaoctet et dépose des traceurs dès l'affichage, même si personne ne regarde.
  Ici la page n'affiche qu'un bouton, et le lecteur (sur le domaine
  `youtube-nocookie`) n'est inséré qu'au clic.
- Images recompressées et déclinées en AVIF / WebP / JPEG responsives.

Seule la page `/admin` charge une ressource externe. Elle n'est jamais servie
aux visiteurs et ne pèse pas sur l'empreinte des pages publiques.

## Déploiement

Chaque `git push` sur `main` déclenche
[`.github/workflows/deploiement.yml`](.github/workflows/deploiement.yml), qui
vérifie les contrastes, construit le site et le publie sur GitHub Pages. Un
enregistrement depuis `/admin` produit un commit, donc le site se met à jour
seul en une à deux minutes.
