# Mise en service

À faire une seule fois, comptez 20 à 30 minutes.

Les étapes 1, 2 et 5 suffisent à mettre le site en ligne. Les étapes 3 et 4
activent l'interface d'administration, l'étape 6 le formulaire de contact.

## 1. Créer l'organisation et le dépôt

Sur GitHub : **New organization**, offre gratuite, nom `SynapScie`. Une
organisation plutôt qu'un compte personnel, pour que le site ne dépende de
personne en particulier.

Créer ensuite un dépôt **public** dans cette organisation. Attention, son nom
détermine l'adresse du site :

- `synapscie.github.io` donne `https://synapscie.github.io`. C'est ce que
  suppose la configuration actuelle.
- tout autre nom, par exemple `site`, donne `https://synapscie.github.io/site/`.
  Il faut alors ajouter `base: '/site',` à côté de `site` dans
  `astro.config.mjs`. Les liens internes passent tous par `src/lib/lien.ts` et
  s'adaptent seuls.

Puis, depuis ce dossier :

```bash
git add .
git commit -m "Mise en place du site"
git remote add origin https://github.com/SynapScie/synapscie.github.io.git
git push -u origin main
```

## 2. Activer GitHub Pages

Dépôt → **Settings** → **Pages** → *Source* : **GitHub Actions**.

Le premier déploiement démarre au push suivant, l'onglet **Actions** montre son
avancement.

## 3. Créer l'application OAuth GitHub

Elle permet aux administrateurs de se connecter à `/admin` avec leur compte
GitHub.

Organisation → **Settings** → **Developer settings** → **OAuth Apps** →
**New OAuth App** :

| Champ | Valeur |
| --- | --- |
| Application name | `Administration SynapScie` |
| Homepage URL | `https://synapscie.github.io` |
| Authorization callback URL | `https://synapscie-auth.VOTRE-SOUS-DOMAINE.workers.dev/callback` |

Le sous-domaine exact n'est connu qu'à l'étape 4 : mettre une valeur provisoire
et revenir la corriger.

Générer un **Client secret**, garder l'identifiant et le secret sous la main.

## 4. Déployer le service d'authentification

GitHub Pages ne sert que des fichiers, il ne peut pas gérer une connexion OAuth.
Un petit service séparé s'en charge, gratuit et sans maintenance une fois posé.

1. Créer un compte sur [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Déployer [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)
   avec le bouton **Deploy to Cloudflare** de son README.
3. Nommer le worker `synapscie-auth`.
4. Dans ses **Settings** → **Variables and Secrets**, ajouter :

   | Nom | Valeur |
   | --- | --- |
   | `GITHUB_CLIENT_ID` | l'identifiant de l'étape 3 |
   | `GITHUB_CLIENT_SECRET` | le secret de l'étape 3 |
   | `ALLOWED_DOMAINS` | `synapscie.github.io` |

5. Noter l'adresse du worker, de la forme
   `https://synapscie-auth.xxxx.workers.dev`.
6. La reporter à deux endroits : l'*Authorization callback URL* de l'étape 3,
   suivie de `/callback`, et le champ `base_url` de `public/admin/config.yml`.

Corriger aussi la ligne `repo:` du même fichier si le dépôt ne s'appelle pas
`synapscie.github.io`.

## 5. Inviter les administrateurs

Chaque administrateur doit avoir un compte GitHub et être invité dans
l'organisation avec le rôle **Write** sur le dépôt.

Ils vont ensuite sur `https://synapscie.github.io/admin` et cliquent sur
**Se connecter avec GitHub**. Ils ne verront ni Git ni Markdown, seulement des
formulaires et un bouton « Ajouter un bloc ». Chaque enregistrement crée un
commit au nom de son auteur : l'historique est complet et tout est réversible.

Sveltia n'a ni comptes ni rôles, l'autorisation est déléguée à GitHub. La liste
des administrateurs, c'est **Settings → Collaborators and teams**, rien d'autre.
Quelques conséquences :

- la page `/admin` est publique, c'est du HTML statique que personne ne protège.
  N'importe qui peut voir l'écran de connexion et s'authentifier, ce n'est pas
  un problème puisque le verrou est ailleurs : sans droit d'écriture, GitHub
  refuse les enregistrements.
- le rôle minimum est **Write**, `Read` et `Triage` ne suffisent pas.
- `ALLOWED_DOMAINS` sur le worker n'est pas une liste d'utilisateurs, c'est une
  protection contre l'usage du worker par un autre site.
- pour retirer un accès, retirer la personne du dépôt ou de l'organisation.
  L'effet est immédiat.
- pas de permission par rubrique : qui peut écrire peut modifier les Projets
  comme les Membres.
- si l'organisation active *OAuth App access restrictions*, un propriétaire doit
  approuver l'application. Symptôme sinon : la connexion réussit mais les
  enregistrements échouent.

### Pas d'aperçu dans l'admin

Le volet d'aperçu de Sveltia est désactivé (`editor: preview: false` sur les
deux collections). Il affiche les champs avec un rendu générique, sans connaître
les composants ni la feuille de style du site, qui sont compilés à la
construction : le résultat ne ressemblait pas aux pages réelles. Le rendre
fidèle supposerait de réécrire les neuf blocs en JavaScript dans la page
d'admin, soit deux implémentations à maintenir en parallèle.

À la place, chaque fiche porte un lien « Voir sur le site » (`preview_path`) qui
ouvre la vraie page. À expliquer aux rédacteurs : ce lien pointe vers le site
publié, il faut une à deux minutes de reconstruction après un enregistrement
pour que la modification y apparaisse.

## 6. Activer le formulaire de contact

Un site statique ne peut pas envoyer de courriel. Le formulaire est relayé par
Web3Forms (gratuit, environ 250 envois par mois).

1. Sur [web3forms.com](https://web3forms.com), saisir l'adresse de courriel de
   l'association pour recevoir une clé d'accès.
2. Dépôt → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret** : nom `CLE_FORMULAIRE`, valeur la clé reçue.
3. Pour le développement local, copier `.env.example` vers `.env` et y coller la
   même clé.

Tant que la clé est absente, le site bascule en mode « adresse de courriel »
plutôt que d'afficher un formulaire qui échouerait sans le dire :

- la page Contact affiche l'adresse en gros bouton, à la place du formulaire ;
- elle sort du menu de navigation et du raccourci « Nous écrire » de l'accueil,
  puisqu'elle ne porte plus qu'une adresse ;
- cette adresse passe au pied de page, donc visible sur toutes les pages.

Poser `CLE_FORMULAIRE` rallume les trois d'un coup, sans toucher au code. La
bascule tient dans [`src/lib/contact.ts`](src/lib/contact.ts).

Renseigner donc `courriel` dans `src/config.ts` : sans lui, le site n'a aucune
adresse à proposer et la page Contact se contente d'annoncer qu'elle arrive.

Après l'envoi, Web3Forms renvoie le visiteur sur `/merci`, une page du site.
L'adresse est calculée à la construction à partir de `site` (et `base`) dans
`astro.config.mjs` : si ces valeurs changent, la redirection suit, il n'y a rien
à modifier ailleurs. Sans ce réglage, Web3Forms afficherait sa propre page de
confirmation, sur son domaine.

## Tester l'admin sans les étapes 3 et 4

Sveltia sait travailler directement sur les fichiers du disque, sans
authentification.

1. `npm run dev`
2. Ouvrir `http://localhost:4321/admin` sous Chrome ou Edge (Firefox ne prend
   pas en charge l'accès au système de fichiers).
3. Cliquer sur **Work with Local Repository** et désigner ce dossier.

Les modifications s'écrivent dans les fichiers du projet et apparaissent
immédiatement dans le site.

## Valeurs à personnaliser

| Fichier | Ligne | Valeur actuelle |
| --- | --- | --- |
| `astro.config.mjs` | `site` | `https://synapscie.github.io` |
| `astro.config.mjs` | `base` | absente (site à la racine) |
| `public/admin/config.yml` | `repo` | `SynapScie/synapscie.github.io` |
| `public/admin/config.yml` | `base_url` | adresse du worker |
| `public/admin/config.yml` | `site_url`, `display_url` | `https://synapscie.github.io` |
| `src/config.ts` | `nom`, `statutJuridique`, `courriel` | à compléter |

## À vérifier avant mise en ligne

Ces informations ne figuraient ni dans la maquette ni dans le cahier des
charges. Elles sont laissées vides plutôt que devinées, pour qu'aucune
affirmation non vérifiée ne parte en production. Tout est dans
[`src/config.ts`](src/config.ts) :

| Champ | État | Remarque |
| --- | --- | --- |
| `nom` | `SynapScie` | tiré du nom du document de maquette, à confirmer |
| `statutJuridique` | vide | tant qu'il est vide, le pied de page n'affiche aucune mention. Par exemple `association loi 1901`, ou `association de droit local` en Alsace-Moselle, une fois le statut vérifié |
| `courriel` | `contact@synapscie.org` | **provisoire, à confirmer.** Adresse posée en attendant la vraie : elle est affichée aux visiteurs (page Contact et pied de page) et doit donc exister avant la mise en ligne, sinon les messages se perdent |

Sont aussi inventés, donc à réécrire : le slogan et le texte de présentation de
l'accueil (`src/pages/index.astro`), ainsi que le contenu d'exemple (noms,
biographies, dates, chiffres des projets).

Enfin, le contenu provisoire :

- les onze images de `src/assets/` portent la mention « image provisoire ». Le
  script qui les a produites (`npm run images:provisoires`) pourra être supprimé
  une fois les vraies photos en place.
- les deux projets et les trois membres d'exemple sont supprimables depuis
  `/admin`. Garder « Les ateliers itinérants » le temps de la prise en main, il
  utilise tous les types de blocs.
