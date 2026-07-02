# SportSee

Tableau de bord React affichant les statistiques d'activité sportive d'un utilisateur (profil, activité quotidienne, sessions, performances), avec authentification par token.

## Stack technique

- **React 19** + **React Router 7** (mode framework / SSR)
- **Vite** pour le dev server et le build
- **Tailwind CSS**
- **Recharts** pour les graphiques

## Structure du projet

```
app/                  Point d'entrée React Router (root, routes)
src/
  api/                Appels API réels (api.js) et données simulées (apiMock.js)
  component/          Composants partagés (Header, Footer, ProtectedRoute, Spinner...)
  context/            AuthContext : gestion du token d'authentification
  hooks/              useAuth, useUserActivity, useUserProfile
  models/             Modèles de données (UserActivity, UserProfile)
  pages/              Pages : login, dashboard, profile, notFound
  utils/              Fonctions utilitaires (calculs par semaine, dates)
docs/ai-integration/  Documentation d'une intégration exploratoire avec l'API Mistral
```

## Prérequis

- Une API back-end exposant `/api/login`, `/api/user-info` et `/api/user-activity` sur `http://localhost:8000` (voir `src/api/api.js`)

## Installation

```bash
npm install
```

## Configuration

Variables d'environnement (`.env`) :

```
VITE_USE_MOCK=false
```

- `VITE_USE_MOCK=true` : utilise les données simulées de `src/mock/` via `apiMock.js`
- `VITE_USE_MOCK=false` : utilise l'API réelle (`api.js`)

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

- `/` : page de connexion
- `/dashboard` : tableau de bord (protégé, nécessite un token)
- `/profile` : profil utilisateur (protégé, nécessite un token)

