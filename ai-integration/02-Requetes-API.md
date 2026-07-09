# Étape 2 — Structure des requêtes API (Sportsee × Mistral)

Documentation technique de la requête utilisée pour générer un plan d'entraînement
personnalisé, de durée variable (selon l'objectif et l'échéance), via l'API Mistral. Collection Postman associée :
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

La fonctionnalité de génération de plan a besoin d'informations que Sportsee ne demande pas
aujourd'hui (aucun formulaire d'objectif, aucune notion de disponibilité/agenda dans le modèle
actuel). **Il faudra créer un nouveau formulaire** pour les collecter.

**Choix de conception : un `type_objectif` plutôt qu'un objectif unique**

Un plan "10 km en moins d'1h" et un plan "perte de poids" n'ont pas les mêmes besoins de
données : le premier a une distance et un temps chronométré à respecter, le second n'en a pas
et a besoin d'un poids actuel/visé à la place. On structure donc les données en un **socle
commun** + des **champs spécifiques selon le type d'objectif choisi**. Ce `type_objectif` est
aussi la clé qui détermine, côté code, **quel prompt spécialisé** sera utilisé pour la
génération (voir [03-Conception-Prompts.md](./03-Conception-Prompts.md)).

**Principe de saisie : des options préenregistrées, pas du texte libre.** Chaque champ qui sert
au routing vers un prompt, à un calcul déterministe (dates, faisabilité) ou à une contrainte
métier précise (distance, jours, durée) est saisi via une liste fermée (`select` /
multi-select), pas dictée en texte libre par l'utilisateur. Ça garantit des entrées normalisées
et non ambiguës, indispensable pour que le code puisse router de façon fiable et précalculer
dates et volumes. Seul le champ `contraintes` (description d'une gêne ou d'une blessure) reste
en texte libre : la diversité des contraintes physiques possibles ne se prête pas à une liste
fermée.

**Socle commun (tous les objectifs)**

| Champ à créer | Type | Exemple |
|---|---|---|
| `type_objectif` | select : `"course"` \| `"perte_poids"` \| `"endurance"` \| `"forme_generale"` | `"course"` |
| `joursDispo` | multi-select | `["lundi", "mercredi", "samedi"]` |
| `momentPrefere` | select | `"matin"` |
| `dureeSeance` | select (paliers, min) | `60` |
| `contraintes` | text (libre, guidé — limite de caractères) | `"genou sensible"` |
| `conseilsNutrition` | bool | `true` |
| `dateDebut` | date | `"2026-06-22"` |

**Champs spécifiques selon `type_objectif`**

| `type_objectif` | Champs supplémentaires | Exemple |
|---|---|---|
| `"course"` (semi-marathon, 10 km, marathon...) | `distance_course` (select), `temps_cible` (select — paliers par distance), `dateCourse` (date) | `"10km"`, `"< 55 min"`, `"2026-08-03"` |
| `"perte_poids"` | `poids_actuel` (number, kg), `poids_vise` (number, kg) | `78`, `73` |
| `"endurance"` | `objectif_endurance` (select — paliers de durée sans s'arrêter) | `"45 min"` |
| `"forme_generale"` | *(aucun champ supplémentaire)* — `dureePlan` (select, en semaines) | `8` |

Concrètement, le formulaire affiche dynamiquement les champs spécifiques une fois que
l'utilisateur a choisi son `type_objectif` — un pattern de formulaire conditionnel classique.

> Point à trancher avec Charles : est-ce un nouveau formulaire dédié (ex. avant génération du
> plan), ou des champs ajoutés au profil existant ? Ça a un impact sur l'estimation de temps
> (étape 4, §8).

### 1.c Durée du plan et faisabilité

La durée du plan (`duree_semaines`) n'est **jamais saisie librement** ni laissée au modèle : elle
est déterminée côté code, selon deux cas.

- **Objectif `course`** : `duree_semaines` découle du délai réel jusqu'à `dateCourse`. Un
  **algorithme de faisabilité déterministe** (`faisabilite.py`, voir
  [04-Synthese.md](./04-Synthese.md) §3.1) doit obligatoirement être exécuté en amont de toute
  génération : il vérifie que l'objectif (distance + délai) est atteignable en respectant une
  progression de volume sûre, et sinon calcule une alternative (distance revue à la baisse et/ou
  délai minimal requis). C'est cet algorithme qui fournit la `distance_cible_km` et la
  `duree_semaines` finalement injectées dans le prompt Course — jamais les valeurs brutes saisies
  par l'utilisateur sans passage par ce contrôle.
- **Autres objectifs** (`perte_poids`, `endurance`, `forme_generale`) : pas de date fixe à tenir,
  donc pas de calcul de faisabilité nécessaire. `duree_semaines` est un champ `select` choisi
  directement par l'utilisateur (ex. 4, 6, 8 ou 12 semaines).

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
  "temperature": 0.2,
  "max_tokens": 8000,
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "<prompt système spécialisé selon type_objectif, cf. étape 3>" },
    { "role": "user", "content": "<profil coureur + historique + dates précalculées + schéma JSON attendu, cf. étape 3>" }
  ]
}
```

Le prompt `system` n'est **pas un template unique avec des branches conditionnelles** : le code
sélectionne, avant l'appel, le prompt spécialisé correspondant au `type_objectif` (et, pour
`"course"`, aux valeurs validées par l'algorithme de faisabilité). Le modèle ne reçoit que les
règles pertinentes pour la demande en cours.

`max_tokens` est dimensionné selon le nombre de séances attendu dans le plan
(`duree_semaines × séances/semaine`), à raison d'environ 120 à 180 tokens par séance —
`8000` est une base sûre pour les plans les plus denses testés, en attendant un calcul
dynamique côté code.

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
        "content": "{\"objectif\":\"semi-marathon\",\"duree_semaines\":12,\"semaines\":[...]}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 950, "completion_tokens": 3800, "total_tokens": 4750 }
}
```

Le plan généré se trouve dans `choices[0].message.content`, sous forme de **chaîne JSON**
(pas un objet JSON imbriqué) : il faut donc faire un `JSON.parse()` côté application avant de
l'utiliser. Le volume de tokens réel dépend fortement de la durée du plan et du nombre de
séances par semaine (voir [04-Synthese.md](./04-Synthese.md) §3 pour des exemples mesurés).

## 6. Gestion des erreurs

| Code HTTP | Cas | Comportement côté Sportsee |
|---|---|---|
| `401` | Clé API invalide ou absente | Ne jamais exposer l'erreur brute à l'utilisateur ; logguer côté serveur et afficher un message générique |
| `422` | Corps de requête mal formé (champ manquant, JSON invalide) | Erreur de développement à corriger avant mise en prod, valider le payload avant envoi |
| `429` | Trop de requêtes (rate limit dépassé) | Retenter avec un backoff, ou mettre l'utilisateur en file d'attente (voir § rate limiting) |
| `500` / `503` | Erreur ou indisponibilité côté Mistral | Retry avec backoff exponentiel (2-3 tentatives max), puis message d'erreur clair à l'utilisateur |
| Réponse `200` mais JSON invalide/hors schéma | Le modèle n'a pas respecté le format demandé | Valider le JSON reçu contre le schéma attendu avant de l'afficher ; si invalide, retenter une fois avec un rappel du format dans le prompt |
| Réponse `200`, JSON valide et conforme au schéma, mais incohérent sur le fond (ex. progression de volume hors règle, champ vide alors que la donnée liée est renseignée) | Une validation de schéma seule ne suffit pas | Ajouter une validation **sémantique** dédiée (règles métier) en plus de la validation de structure, avant tout affichage — voir [04-Synthese.md](./04-Synthese.md) §4 |

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

Chaque requête de la collection Postman (une par prompt spécialisé) a été exécutée avec une
vraie clé API ; les résultats détaillés (statuts, conformité des réponses) sont documentés dans
[04-Synthese.md](./04-Synthese.md).
