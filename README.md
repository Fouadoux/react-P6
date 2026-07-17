# SportSee

Tableau de bord React affichant les statistiques d'activité sportive d'un utilisateur (profil, activité quotidienne, sessions, performances), avec authentification par token.

## Stack technique

- **React 19** + **React Router 7** (mode framework, rendu client uniquement — `ssr: false`)
- **Vite 8** pour le dev server et le build
- **Tailwind CSS 4**
- **Recharts** pour les graphiques

## Structure du projet

```
app/                  Point d'entrée React Router (root.jsx, routes.js)
src/
  api/                api.js (API réelle) et apiMock.js (données simulées)
  service/            service.js : aiguille vers api ou apiMock selon VITE_USE_MOCK
  mock/               Jeux de données simulées (profil, activité)
  component/          Composants partagés (Header, Footer, ProtectedRoute, Spinner, PageLoader)
  context/            AuthContext : gestion du token d'authentification
  hooks/              useAuth, useUserActivity, useUserProfile
  models/             Modèles de données (UserActivity, UserProfile)
  pages/              login, dashboard, profile, notFound (+ leurs composants locaux)
  utils/              Calculs par semaine / par 4 semaines, utilitaires de dates
ai-integration/       Étude exploratoire d'une intégration IA (API Mistral) + collections Postman
```

## Prérequis

- Node.js et npm
- Le back-end (voir ci-dessous), sauf si vous utilisez les données simulées

## Back-end

Le back-end n'est pas dans ce dépôt. L'application attend une API exposant `/api/login`,
`/api/user-info` et `/api/user-activity` sur `http://localhost:8000` (voir `src/api/api.js`).

Utilisez cette version : **https://github.com/Fouadoux/P6js**

> ⚠️ Il s'agit d'un fork corrigé de la micro-API fournie par OpenClassrooms. La version d'origine
> est incomplète : des champs de l'objet `userProfile` manquent dans son `routes.js`, ce qui empêche
> le front d'afficher le profil correctement. Le fork ci-dessus corrige ce point — c'est celui à
> utiliser, pas le dépôt OpenClassrooms d'origine.

Lancement (le back-end utilise **yarn**) :

```bash
git clone https://github.com/Fouadoux/P6js
cd P6js
yarn
yarn dev
```

Ou via Docker :

```bash
docker image build --no-cache -t micro-api .
docker container run --name micro-api -p 8000:8000 -dt micro-api yarn
```

L'API écoute sur le port **8000**. Comptes de démonstration :

| Identifiant | Mot de passe |
|---|---|
| `sophiemartin` | `password123` |
| `emmaleroy` | `password789` |
| `marcdubois` | `password456` |

## Installation

```bash
npm install
```

## Configuration

Variables d'environnement (`.env`) :

```
VITE_USE_MOCK=false
```

- `VITE_USE_MOCK=true` : utilise les données simulées de `src/mock/` via `apiMock.js` — permet de lancer l'app sans back-end
- `VITE_USE_MOCK=false` : utilise l'API réelle (`api.js`)

L'aiguillage est fait une seule fois dans `src/service/service.js` ; le reste de l'app importe toujours depuis ce module.

## Développement

```bash
npm run dev
```

## Build & production

```bash
npm run build
npm start
```

## Lint

```bash
npm run lint
```

## Routes

| Route | Page | Accès |
|---|---|---|
| `/` | Connexion | public |
| `/dashboard` | Tableau de bord | protégé (token requis) |
| `/profile` | Profil utilisateur | protégé (token requis) |
| `*` | Page 404 | public |

Les routes protégées passent par le layout `src/component/ProtectedRoute.jsx`. Le token est obtenu via `/api/login`, stocké dans `localStorage` et exposé par `AuthContext`.

## Intégration IA (exploratoire)

Le dossier `ai-integration/` documente une étude de faisabilité d'une fonctionnalité de plan
d'entraînement personnalisé généré par l'API Mistral. Il s'agit d'une étude de conception —
aucun code de cette intégration n'est présent dans l'application.

**Commencer par `00-Vue-Ensemble.md`** : document autoportant qui couvre l'ensemble de la
pré-conception (architecture, données, prompts, résultats de tests, limites). Les documents
numérotés `01` à `04` sont les documents détaillés par étape, dont il fait la synthèse.

- `00-Vue-Ensemble.md` — vue d'ensemble autoportante, corps + annexes détaillées
- `01-Comprehension-API-Mistral.md` — modèles, coûts, quotas
- `02-Requetes-API.md` — structure des requêtes et des données envoyées
- `03-Conception-Prompts.md` — prompts spécialisés par objectif, agents `code_interpreter`
- `04-Synthese.md` — synthèse de faisabilité, limites, questions éthiques, métriques
- `postman/` — collections et environnements ayant servi aux campagnes de tests
