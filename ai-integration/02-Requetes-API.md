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

La durée du plan (`duree_semaines`) n'est **jamais saisie librement** ni laissée telle quelle au
prompt de génération : elle passe systématiquement par une étape de vérification en amont.

**Choix de conception : la faisabilité est vérifiée par un agent LLM avec exécution de code réelle,
pas par un algorithme backend.** Une première piste envisagée était un algorithme déterministe
classique côté code (calcul de seuils en JavaScript/Python, sans appel LLM). Ce choix a été écarté
en cours de conception : la décision produit retenue est que **le LLM doit porter l'intégralité de
la logique de faisabilité** (bandes de volume par distance et par niveau, règle de progression,
planchers d'expérience, limites de sécurité), plutôt que de dupliquer cette logique métier dans du
code applicatif difficile à faire évoluer sans redéploiement. Le détail des tests ayant mené à ce
choix — et de ses limites — est documenté en [04-Synthese.md](./04-Synthese.md) §3.1 et Annexe B.

**Architecture retenue : un Agent Mistral par type d'objectif, avec l'outil `code_interpreter`.**

- **4 agents** sont créés une fois (`POST /v1/agents`), un par `type_objectif` (`course`,
  `perte_poids`, `endurance`, `forme_generale`). Les instructions de chaque agent encodent
  l'intégralité des règles métier de faisabilité pour ce type d'objectif (bandes de volume issues
  de recherche documentaire, règle de progression ≤ 10 %/semaine, planchers d'expérience coach,
  limites de sécurité perte de poids).
- Chaque agent a l'obligation, dans ses instructions, d'**écrire et d'exécuter du code Python**
  (via `code_interpreter`) pour tout calcul numérique — jamais un calcul "pensé" dans le corps de
  la réponse. C'est ce changement précis qui a résolu la quasi-totalité des erreurs de calcul
  observées sur le prototype antérieur (voir Annexe B).
- Chaque vérification (un cas utilisateur donné) est un appel `POST /v1/conversations` avec
  l'`agent_id` correspondant et les données du cas en `inputs`.
- La réponse renvoyée par chaque agent suit un schéma minimal commun :
  ```json
  {
    "detail_calcul": "string — trace du raisonnement et du calcul, a des fins de debug",
    "semaines_minimum_recommandees": "number ou null",
    "faisable": "boolean"
  }
  ```
  Le champ `faisable` est délibérément placé **en dernier** dans le schéma demandé : les tests ont
  montré qu'un LLM qui doit écrire ce booléen *avant* d'avoir formulé son raisonnement peut
  produire une décision décorrélée du calcul qu'il énonce ensuite (voir Annexe B) — le forcer en
  dernier champ oblige le modèle à recopier une conclusion déjà posée par écrit, plutôt que de la
  deviner en tête de réponse.
- Pour l'objectif `course` spécifiquement, un champ additionnel purement informatif
  `semaines_recommandees_coach` est renvoyé à côté de `semaines_minimum_recommandees` : il reflète
  une recommandation de coach indépendante de la seule tolérance de progression de volume (temps
  d'adaptation tendineuse/articulaire, apprentissage de l'allure), sans influencer le calcul de
  `faisable`, qui reste basé uniquement sur la progression de volume calculée.

**Le seul garde-fou qui reste côté backend applicatif — et pourquoi il n'est pas une exception au
choix ci-dessus.** Un contrôle minimal intercepte les cas d'entrée **dégénérés** (ex.
`volume_reference_km <= 0`) **avant même d'appeler l'agent**. Ce n'est **pas** un jugement métier
sur la faisabilité sportive — "impossible de calculer une progression sans point de départ" est une
évidence mathématique, pas une question d'entraînement — et ce n'est pas non plus motivé par une
méfiance envers le LLM sur ce point précis. C'est une mesure de robustesse **opérationnelle** : ces
entrées dégénérées ont provoqué, à plusieurs reprises pendant les tests, des réponses vides ou
structurellement invalides de l'API Conversations elle-même (voir Annexe B) — un problème de
stabilité d'API sur un cas qui n'a de toute façon qu'une réponse triviale, pas un problème de
prompt à corriger.

- **Objectif `course`** : `duree_semaines` découle du délai réel jusqu'à `dateCourse`. L'agent de
  vérification Course est appelé en amont de toute génération avec `distance_cible_km` (saisie
  utilisateur), `volume_reference_km` et `duree_semaines` (calculée depuis `dateCourse`) ; il
  renvoie `faisable` et `semaines_minimum_recommandees`. Si `faisable = false`, l'application
  propose à l'utilisateur d'allonger le délai (à `semaines_minimum_recommandees`) plutôt que
  d'appeler le prompt de génération. C'est ce verdict qui conditionne l'appel au prompt Course —
  jamais les valeurs brutes saisies sans passage par ce contrôle.
- **Autres objectifs** (`perte_poids`, `endurance`, `forme_generale`) : pas de date fixe à tenir.
  `duree_semaines` reste un champ `select` choisi par l'utilisateur, mais passe quand même par
  l'agent de vérification correspondant avant génération (perte de poids : limite de sécurité sur
  le rythme de perte ; endurance et forme générale : cohérence de la progression si un volume
  cible est renseigné, plancher fixe de 4 semaines pour forme générale).

## 2. Endpoints

### 2.a — Génération du plan

```
POST https://api.mistral.ai/v1/chat/completions
```

### 2.b — Vérification de faisabilité

```
POST https://api.mistral.ai/v1/agents         (setup, une fois par type d'objectif)
POST https://api.mistral.ai/v1/conversations  (un appel par vérification)
```

## 3. Headers

Identiques pour les deux familles d'endpoints :

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

### 4.a — Génération du plan

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
`"course"`, aux valeurs validées par l'agent de vérification, §1.c). Le modèle ne reçoit que les
règles pertinentes pour la demande en cours.

`max_tokens` est dimensionné selon le nombre de séances attendu dans le plan
(`duree_semaines × séances/semaine`), à raison d'environ 120 à 180 tokens par séance —
`8000` est une base sûre pour les plans les plus denses testés, en attendant un calcul
dynamique côté code.

### 4.b — Vérification de faisabilité

**Setup (une fois par type d'objectif) :**
```json
{
  "model": "mistral-large-latest",
  "name": "Verification Faisabilite - Course (Code Interpreter)",
  "instructions": "<regles metier completes : bandes de volume, progression, planchers, garde-fous>",
  "tools": [{ "type": "code_interpreter" }],
  "completion_args": { "temperature": 0 }
}
```
La réponse contient un champ `id` (l'`agent_id`) à conserver côté application — c'est lui qui est
réutilisé pour chaque vérification ultérieure, sans avoir à renvoyer les instructions à chaque
appel.

**Vérification (un appel par cas à évaluer) :**
```json
{
  "agent_id": "ag_...",
  "store": false,
  "inputs": "Evalue la faisabilite de cet objectif : distance_cible=..., volume_reference_km=..., ..."
}
```
`inputs` peut être une simple chaîne de texte structurée (comme illustré ici) — l'agent applique
ses instructions figées à la création pour interpréter ces données et produire son verdict.

## 5. Réponse attendue (succès)

### 5.a — Génération du plan

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

### 5.b — Vérification de faisabilité

```json
{
  "object": "conversation.response",
  "conversation_id": "conv_...",
  "outputs": [
    {
      "object": "entry",
      "type": "tool.execution",
      "name": "code_interpreter",
      "arguments": { "code": "def evaluer_faisabilite(...): ..." },
      "info": {
        "code": "...",
        "code_output": "{'detail_calcul': '...', 'semaines_minimum_recommandees': 16, 'faisable': True}"
      }
    },
    {
      "object": "entry",
      "type": "message.output",
      "content": "{\n  \"detail_calcul\": \"...\",\n  \"semaines_minimum_recommandees\": 16,\n  \"faisable\": true\n}"
    }
  ],
  "usage": { "prompt_tokens": 1600, "completion_tokens": 400, "total_tokens": 2000, "connector_tokens": 80 }
}
```

Points importants pour le parsing côté application :
- `outputs` est un **tableau**, potentiellement avec plusieurs entrées de type `tool.execution`
  (une par tentative de code, y compris les tentatives ratées que l'agent corrige lui-même — voir
  [04-Synthese.md](./04-Synthese.md) Annexe B) et plusieurs `message.output` (le modèle peut
  s'excuser d'une erreur avant de la corriger). **Il faut toujours prendre la dernière entrée de
  type `message.output`**, jamais la première.
- Le contenu de cette dernière entrée est parfois enveloppé dans un bloc Markdown (` ```json `)
  malgré une instruction contraire — un nettoyage défensif est nécessaire avant `JSON.parse` (voir
  §6).
- Les entrées `tool.execution` contiennent le code réellement exécuté (`info.code`) et son
  résultat brut (`info.code_output`) — précieux pour le debug, mais pas destinées à être affichées
  à l'utilisateur final.
- `usage.connector_tokens` reflète la consommation additionnelle liée à `code_interpreter`,
  distincte des tokens de génération classiques — à inclure dans le suivi de coût (§7).

## 6. Gestion des erreurs

| Cas | Comportement côté Sportsee |
|---|---|
| `401` | Ne jamais exposer l'erreur brute à l'utilisateur ; logguer côté serveur et afficher un message générique |
| `422` | Corps de requête mal formé — erreur de développement à corriger avant mise en prod, valider le payload avant envoi |
| `429` (général) | Retenter avec un backoff, ou mettre l'utilisateur en file d'attente (voir § rate limiting) |
| `429` spécifique `code_interpreter` (`"code_interpreter rate limit reached"`) | Quota séparé, plus restrictif, en particulier en Free mode (voir [01-Comprehension-API-Mistral.md](./01-Comprehension-API-Mistral.md) §5) — backoff plus long que pour le rate limit général, et vérifier le tier du compte avant montée en charge |
| `500` / `503` | Retry avec backoff exponentiel (2-3 tentatives max), puis message d'erreur clair à l'utilisateur |
| Réponse `200` mais JSON invalide/hors schéma (génération du plan) | Valider le JSON reçu contre le schéma attendu avant de l'afficher ; si invalide, retenter une fois avec un rappel du format dans le prompt |
| Réponse `200`, JSON valide et conforme au schéma, mais incohérent sur le fond (génération du plan) | Ajouter une validation **sémantique** dédiée (règles métier) en plus de la validation de structure, avant tout affichage — voir [04-Synthese.md](./04-Synthese.md) §4 |
| Réponse `200` (vérification) mais `message.output` enveloppé de balises Markdown | Nettoyage défensif systématique avant parsing (retirer ` ```json ` / ` ``` `) — comportement intermittent du modèle, pas corrigeable de façon garantie côté prompt (voir [04-Synthese.md](./04-Synthese.md) Annexe B) |
| Réponse `200` (vérification) mais `outputs: []` (vide) ou entrée malformée | Observé sur des entrées dégénérées (ex. `volume_reference_km = 0` et un autre champ numérique nul simultanément) — traiter comme une erreur technique (retry une fois), et surtout **intercepter ces entrées en amont** côté backend avant l'appel (voir §1.c et [04-Synthese.md](./04-Synthese.md) Annexe B) |
| `tool.execution` avec une exception Python (`SyntaxError`, `NameError`...) suivie d'une nouvelle tentative | Comportement **normal et attendu** de `code_interpreter` : l'agent se corrige lui-même. Ne pas traiter comme une erreur tant qu'un `message.output` final valide est bien obtenu ; logguer si le nombre de tentatives dépasse un seuil (ex. 3) pour détecter une dérive |

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
- **Cas particulier de `code_interpreter`** : quota séparé, sensiblement plus bas que les limites
  générales, en particulier en Free mode. À espacer/limiter spécifiquement pour les appels de
  vérification de faisabilité, et à revoir avec un tier de compte adapté avant un déploiement à
  l'échelle des utilisateurs Sportsee.

## 8. Vérification avant documentation finale

Chaque requête des deux collections Postman (génération du plan, et vérification de faisabilité
via `code_interpreter`) a été exécutée avec une vraie clé API ; les résultats détaillés (statuts,
conformité des réponses, bugs trouvés et corrigés) sont documentés dans
[04-Synthese.md](./04-Synthese.md), corps du document et Annexe B.
