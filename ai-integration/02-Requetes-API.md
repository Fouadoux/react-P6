# Étape 2 — Structure des requêtes API (Sportsee × Mistral)

Documentation technique de la requête utilisée pour générer un plan d'entraînement
personnalisé sur 6 semaines via l'API Mistral. Collection Postman associée :
[`postman/Sportsee-Mistral.postman_collection.json`](./postman/Sportsee-Mistral.postman_collection.json).

## 1. Origine des données envoyées à l'API

### 1.a Données déjà disponibles dans l'application (aucune saisie requise)

Ces champs existent déjà dans les modèles Sportsee (`src/models/UserProfile.js`,
`src/models/UserActivity.js`) et peuvent être envoyés à Mistral sans rien construire de nouveau :

| Champ | Source | Exemple |
|---|---|---|
| `age`, `gender`, `weight`, `height` | `UserProfile` | `32`, `"male"`, `72`, `180` |
| `totalDistance`, `totalSessions`, `totalDuration` | `UserProfile.statistics` | `128 km`, `24`, `1200 min` |
| `weeklyGoal` | `UserProfile.profile.weeklyGoal` | `15` (objectif hebdo en km, existant) |
| Historique de séances (`date`, `distance`, `duration`, `heartRate.min/max/average`, `caloriesBurned`) | `UserActivity` | voir étape 3 §5 pour le formatage envoyé |

### 1.b Nouvelles données à collecter (n'existent pas encore dans l'app)

La fonctionnalité "plan sur 6 semaines" a besoin d'informations que Sportsee ne demande pas
aujourd'hui (aucun formulaire d'objectif, aucune notion de disponibilité/agenda dans le modèle
actuel). **Il faudra créer un nouveau formulaire** pour les collecter.

**Choix de conception : un `type_objectif` plutôt qu'un objectif unique**

Un plan "10 km en moins d'1h" et un plan "perte de poids" n'ont pas les mêmes besoins de
données : le premier a une distance et un temps chronométré à respecter, le second n'en a pas
et a besoin d'un poids actuel/visé à la place. Un schéma unique avec tous les champs
optionnels aurait rendu le prompt ambigu (que fait l'IA d'un `tempsCible` vide sur un plan
perte de poids ?). On structure donc les données en un **socle commun** + des **champs
spécifiques selon le type d'objectif choisi**.

**Socle commun (tous les objectifs)**

| Champ à créer | Type | Exemple |
|---|---|---|
| `type_objectif` | select : `"course"` \| `"perte_poids"` \| `"endurance"` \| `"forme_generale"` | `"course"` |
| `joursDispo` | multi-select | `["lundi", "mercredi", "samedi"]` |
| `momentPrefere` | select | `"matin"` |
| `dureeSeance` | number (min) | `60` |
| `contraintes` | text | `"genou sensible"` |
| `conseilsNutrition` | bool | `true` |
| `dateDebut` | date | `"2026-06-22"` |

**Champs spécifiques selon `type_objectif`**

| `type_objectif` | Champs supplémentaires | Exemple |
|---|---|---|
| `"course"` (semi-marathon, 10 km, marathon...) | `distance_course` (select), `temps_cible` (text), `dateCourse` (date) | `"10km"`, `"0h55"`, `"2026-08-03"` |
| `"perte_poids"` | `poids_actuel` (number, kg), `poids_vise` (number, kg) | `78`, `73` |
| `"endurance"` | `objectif_endurance` (text libre) | `"courir 45 min sans s'arrêter"` |
| `"forme_generale"` | *(aucun champ supplémentaire)* | — |

Concrètement, le formulaire affiche dynamiquement les champs spécifiques une fois que
l'utilisateur a choisi son `type_objectif` — un pattern de formulaire conditionnel classique.

> Point à trancher avec Charles : est-ce un nouveau formulaire dédié (ex. avant génération du
> plan), ou des champs ajoutés au profil existant ? Ça a un impact sur l'estimation de temps
> (étape 4, §8).

## 2. Endpoint

```
POST https://api.mistral.ai/v1/chat/completions
```

## 3. Headers

```http
Authorization: Bearer {{MISTRAL_API_KEY}}
Content-Type: application/json
Accept: application/json
```

> La clé API n'est jamais écrite en dur : dans Postman elle vit dans la variable
> d'environnement `MISTRAL_API_KEY` (type `secret`) ; côté application, elle vit uniquement
> côté serveur (variable d'environnement backend), jamais dans le code React exécuté
> dans le navigateur.

## 4. Modèle de corps de requête (body)

```json
{
  "model": "mistral-small-latest",
  "temperature": 0.3,
  "max_tokens": 4000,
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "<prompt système, cf. étape 3>" },
    { "role": "user", "content": "<profil coureur + historique + schéma JSON attendu, cf. étape 3>" }
  ]
}
```

## 5. Réponse attendue (succès)

```json
{
  "id": "cmpl-...",
  "object": "chat.completion",
  "model": "mistral-small-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"objectif\":\"semi-marathon\",\"duree_semaines\":6,\"semaines\":[...]}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 480, "completion_tokens": 1120, "total_tokens": 1600 }
}
```

Le plan généré se trouve dans `choices[0].message.content`, sous forme de **chaîne JSON**
(pas un objet JSON imbriqué) : il faut donc faire un `JSON.parse()` côté application avant de
l'utiliser.

## 6. Gestion des erreurs

| Code HTTP | Cas | Comportement côté Sportsee |
|---|---|---|
| `401` | Clé API invalide ou absente | Ne jamais exposer l'erreur brute à l'utilisateur ; logguer côté serveur et afficher un message générique |
| `422` | Corps de requête mal formé (champ manquant, JSON invalide) | Erreur de développement à corriger avant mise en prod, valider le payload avant envoi |
| `429` | Trop de requêtes (rate limit dépassé) | Retenter avec un backoff, ou mettre l'utilisateur en file d'attente (voir § rate limiting) |
| `500` / `503` | Erreur ou indisponibilité côté Mistral | Retry avec backoff exponentiel (2-3 tentatives max), puis message d'erreur clair à l'utilisateur |
| Réponse `200` mais JSON invalide/hors schéma | Le modèle n'a pas respecté le format demandé | Valider le JSON reçu contre le schéma attendu avant de l'afficher ; si invalide, retenter une fois avec un rappel du format dans le prompt |

Dans tous les cas, le comportement doit être **explicite** côté React (état `loading` / `error`
/ `success`), sur le même principe que les hooks existants (`useUserActivity`,
`useUserProfile`) qui gèrent déjà `loading`/`error`/`data`.

## 7. Limitation des requêtes (contrôle des coûts)

Chaque génération de plan a un coût (tokens facturés). Pour éviter les abus et maîtriser le
budget :

- **Limiter côté backend** : un utilisateur ne peut générer qu'un nombre limité de plans par
  jour (ex. 3 générations / 24h), vérifié côté serveur (pas côté front, qui peut être contourné).
- **Debounce côté front** : désactiver le bouton de génération pendant l'appel, empêcher les
  double-clics.
- **Cache** : si les données d'entrée n'ont pas changé depuis la dernière génération, renvoyer
  le plan déjà généré plutôt que de rappeler l'API.
- **Respecter les rate limits de Mistral** (requêtes/minute selon le plan tarifaire du compte) :
  implémenter un backoff exponentiel en cas de `429`.

## 8. Vérification avant documentation finale

Avant d'intégrer les captures d'écran au document de synthèse (étape 4), chaque requête de la
collection Postman doit être exécutée avec une vraie clé API et donner un statut `200` avec une
réponse conforme au schéma attendu.
