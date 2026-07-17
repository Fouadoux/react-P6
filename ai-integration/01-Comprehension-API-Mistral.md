# Étape 1 — Comprendre l'API Mistral et ses capacités

Contexte : Sportsee veut proposer des plans d'entraînement personnalisés, générés par IA à partir
du profil et de l'historique du coureur (cf. notes d'Antoine). La durée du plan n'est pas figée :
elle dépend de l'objectif visé et de l'échéance de l'utilisateur (une course à date, un objectif
sans deadline…).
Avant de concevoir la requête, il faut comprendre ce que l'API Mistral permet et ses limites.

## 1. Fonctionnement général d'une API de LLM

Un appel à un LLM (Large Language Model) via API fonctionne toujours sur le même principe :

1. On envoie une **conversation** (une liste de messages avec un rôle : `system`, `user`, `assistant`).
2. Le modèle **complète** cette conversation en générant le prochain message `assistant`.
3. Le modèle ne "sait" que ce qu'on lui donne dans la requête : il n'a pas de mémoire entre deux
   appels (sauf si on renvoie l'historique des messages précédents nous-mêmes).
4. La réponse est facturée en **tokens** (unité ≈ un mot ou un morceau de mot), à la fois pour
   ce qu'on envoie (input) et ce que le modèle renvoie (output).

C'est ce qui justifie l'étape 3 (« formatage des données ») : plus on envoie de texte, plus ça
coûte cher et plus on risque de dépasser la taille de contexte disponible.

## 2. Deux familles d'endpoints utilisées

Le projet s'appuie sur **deux endpoints Mistral distincts, pour deux besoins différents** :

```
POST https://api.mistral.ai/v1/chat/completions
```
Utilisé pour la **génération du plan d'entraînement** (les 4 prompts spécialisés, voir
[03-Conception-Prompts.md](./03-Conception-Prompts.md)). C'est l'équivalent de l'endpoint
`chat/completions` d'OpenAI : on lui envoie une liste de messages, il renvoie un message généré.

```
POST https://api.mistral.ai/v1/agents        (création, une fois par type d'objectif)
POST https://api.mistral.ai/v1/conversations (un appel par vérification)
```
Utilisé pour la **vérification de faisabilité** (voir [02-Requetes-API.md](./02-Requetes-API.md)
§1.c). Un **Agent** Mistral est créé une seule fois par type d'objectif, avec l'outil natif
`code_interpreter` activé. Cet outil permet à l'agent d'écrire **et d'exécuter réellement** du
code Python dans un bac à sable isolé côté Mistral, plutôt que de se contenter de "raisonner" un
calcul en langage naturel. Chaque vérification ultérieure se fait via `/v1/conversations` en
réutilisant l'`agent_id` déjà créé — ce choix architectural est directement issu des tests décrits
en [04-Synthese.md](./04-Synthese.md) §3.1 et Annexe B : une première approche sans exécution de
code réelle (calcul "pensé" par le modèle dans le corps de la réponse) s'est montrée trop peu
fiable sur des calculs pourtant simples (progression géométrique, comparaisons de seuils).

Endpoint annexe utile : `GET https://api.mistral.ai/v1/models` — liste les modèles disponibles
sur le compte et leur `max_context_length`, utile pour choisir le bon modèle.

## 3. Modèles disponibles (pertinents pour notre cas)

| Modèle | Contexte | Usage typique | Coût relatif |
|---|---|---|---|
| `mistral-small-latest` | ~128k tokens | tâches structurées, JSON, coût maîtrisé | € |
| `mistral-medium-latest` | ~128k tokens | raisonnement plus fin | €€ |
| `mistral-large-latest` | ~128k tokens | tâches complexes, multi-étapes | €€€ |

**Deux choix de modèle différents selon l'usage**, validés par les tests ([04-Synthese.md](./04-Synthese.md)) :
- **Génération du plan** (`/v1/chat/completions`) : `mistral-small-latest` suffit largement — la
  tâche (habiller de contenu sportif une structure déjà cadrée par des règles précises) ne demande
  pas un raisonnement complexe, et ça limite le coût par requête.
- **Vérification de faisabilité** (`/v1/agents` + `/v1/conversations`, avec `code_interpreter`) :
  `mistral-large-latest` est retenu, car cette tâche est plus exigeante (écrire un code correct
  du premier coup, se corriger soi-même face à une erreur d'exécution) et la fiabilité y est
  critique : un mauvais verdict de faisabilité a un impact direct sur la sécurité de l'utilisateur.

## 4. Paramètres qui influencent la qualité des réponses

### 4.a — Génération du plan (`/v1/chat/completions`)

| Paramètre | Rôle | Valeur retenue pour Sportsee | Pourquoi |
|---|---|---|---|
| `temperature` | Contrôle le hasard / la créativité (0 = très déterministe, 1+ = très créatif) | `0.2` | On veut un plan cohérent, pas une réponse créative |
| `top_p` | Alternative à la température : restreint le tirage aux tokens les plus probables (nucleus sampling) | non utilisé (on ne combine pas `top_p` et `temperature`) | Un seul levier de contrôle de l'aléa suffit, pour rester prévisible |
| `max_tokens` | Limite la taille de la réponse générée | `8000`, dimensionné dynamiquement selon le nombre de séances attendu (~120-180 tokens/séance) | Un plan dense (plusieurs semaines, plusieurs séances/semaine) peut dépasser 4 000 tokens en sortie ; la valeur doit suivre la taille réelle du plan pour éviter une réponse tronquée |
| `response_format` | Force le modèle à répondre en JSON strict (`{"type": "json_object"}`) | activé | Indispensable pour parser la réponse côté React sans avoir à extraire du texte libre |

### 4.b — Vérification de faisabilité (`/v1/agents` + `/v1/conversations`)

| Paramètre | Rôle | Valeur retenue pour Sportsee | Pourquoi |
|---|---|---|---|
| `completion_args.temperature` | Même rôle que `temperature` en Chat Completions, réglé au niveau de l'agent | `0` | Calcul, pas de créativité recherchée — voir note ci-dessous sur les limites de ce réglage |
| `tools` | Active des capacités supplémentaires pour l'agent | `[{"type": "code_interpreter"}]` | Autorise l'agent à écrire et exécuter du vrai code Python plutôt que de "penser" un calcul en langage naturel — voir [04-Synthese.md](./04-Synthese.md) §3.1 |
| Format de sortie | Pas de `response_format` structuré natif sur cet endpoint au moment des tests | JSON demandé explicitement dans les instructions de l'agent | Une validation défensive côté appelant reste nécessaire (voir note ci-dessous) |

**Sur la température, dans les deux cas.** Même à `0.2` ou à `0`, une certaine variabilité entre
deux générations avec les mêmes données d'entrée reste possible (cf.
[04-Synthese.md](./04-Synthese.md) §3 et Annexe B) : un LLM n'offre pas de garantie stricte de
reproductibilité, quel que soit le réglage. C'est pour cette raison que les éléments critiques du
plan — dates, et désormais faisabilité de l'objectif — sont calculés côté code ou par exécution
réelle de code plutôt que "pensés" par le modèle en langage naturel (voir
[02-Requetes-API.md](./02-Requetes-API.md) et [04-Synthese.md](./04-Synthese.md) §3.1) : la
température réduit l'aléa sur la formulation, elle ne l'élimine pas sur les valeurs numériques
structurantes — et même l'exécution de code réelle, plus fiable, n'élimine que les erreurs
d'arithmétique, pas les erreurs de logique dans le code écrit par le modèle (voir Annexe B).

**Sur le format de sortie de l'agent.** Malgré une instruction explicite demandant un JSON brut
sans balises Markdown, l'agent enveloppe parfois sa réponse finale dans un bloc ` ```json ` de
façon non systématique (observé de façon intermittente sur les mêmes instructions, cf. Annexe B).
Un nettoyage défensif (suppression des balises avant `JSON.parse`) est donc nécessaire côté code
appelant, quelle que soit la qualité du prompt — voir [02-Requetes-API.md](./02-Requetes-API.md) §6.

## 5. Limites de l'API à connaître

- **Taille de contexte** : ~128k tokens sur les modèles retenus — largement suffisant pour
  notre cas d'usage, mais à surveiller si on envoie un historique de sessions trop long
  (voir étape « Formatage des données »).
- **Coût par requête** : facturé au token (input + output). Avec `mistral-small-latest`,
  un plan de plusieurs semaines reste peu coûteux, mais un usage à grande échelle (tous les
  utilisateurs Sportsee, plusieurs générations par utilisateur) doit être chiffré avant mise
  en prod.
- **Pas de garantie absolue de format** : même avec `response_format: json_object`, il faut
  toujours valider/parser la réponse côté serveur avant de l'afficher (le modèle peut renvoyer
  un JSON valide mais qui ne respecte pas exactement notre schéma, ou qui soit valide mais
  incohérent sur le fond — voir [04-Synthese.md](./04-Synthese.md) §4).
- **Rate limiting** : l'API impose des limites de requêtes par minute/seconde selon le plan
  tarifaire du compte — à prévoir un mécanisme de limitation côté Sportsee (voir étape 2).
- **`code_interpreter` a son propre quota, séparé et plus restrictif** : observé pendant les tests
  (cf. [04-Synthese.md](./04-Synthese.md) Annexe B), le connecteur `code_interpreter` déclenche une
  erreur `rate limit reached` bien avant d'atteindre les limites générales de l'API, en particulier
  en **Free mode** (mode par défaut du compte, pensé pour l'évaluation). À vérifier/upgrader le tier
  du compte avant tout usage en production impliquant des vérifications de faisabilité à volume
  réel.
- **Stabilité de `code_interpreter` sur des entrées dégénérées** : deux occurrences observées d'une
  réponse vide ou malformée (`outputs: []` malgré des tokens consommés, ou une entrée de réponse
  structurellement invalide) sur un même type d'entrée limite (valeurs nulles simultanées) — cf.
  [04-Synthese.md](./04-Synthese.md) Annexe B. Ce n'est pas un problème de formulation de prompt :
  ça justifie d'intercepter ces cas dégénérés **avant** l'appel API plutôt que de compter sur la
  robustesse de l'agent face à toute entrée possible.
- **Pas de mémoire entre les appels** : chaque requête doit contenir tout le contexte utile
  (profil + historique + dates précalculées), le modèle ne se souvient pas des générations
  précédentes. Pour les agents de vérification, seul l'`agent_id` (et ses instructions figées à la
  création) est réutilisé d'un appel à l'autre — les données du cas à évaluer sont, elles,
  renvoyées intégralement à chaque appel via `inputs`.

## 6. Sécurité et confidentialité

- La clé API ne doit **jamais** être exposée côté front (React) : un appel direct depuis le
  navigateur exposerait la clé à tous les utilisateurs. Le bon pattern est un **backend proxy**
  (l'API Sportsee) qui détient la clé et relaie les appels à Mistral.
- Dans Postman, la clé est stockée dans une **variable d'environnement** de type `secret`,
  jamais écrite en dur dans une requête ou committée dans un repo.
- Les données envoyées à Mistral (profil coureur : âge, poids, objectif de course, contraintes
  physiques...) sont des données personnelles. Il faut :
  - n'envoyer que le strict nécessaire au calcul du plan (pas de nom, email, etc.) ;
  - informer l'utilisateur que ses données d'entraînement sont transmises à un service tiers
    (Mistral AI) pour générer la recommandation ;
  - vérifier la politique de rétention des données de Mistral (utilisation ou non des requêtes
    pour l'entraînement de leurs modèles, durée de conservation).

## 7. Collections Postman

**Deux collections Postman dédiées**, une par famille d'endpoints (§2) :

1. **Génération du plan** — [`postman/Sportsee-Mistral.postman_collection.json`](./postman/Sportsee-Mistral.postman_collection.json)
   et son environnement associé. Contient :
   - `GET /v1/models` — pour vérifier l'accès au compte et lister les modèles disponibles.
   - `POST /v1/chat/completions` — une requête par prompt spécialisé de l'architecture retenue
     (un par type d'objectif : course, perte de poids, endurance, forme générale — avec plusieurs
     variantes pour "course" selon la distance visée), conformément à
     [03-Conception-Prompts.md](./03-Conception-Prompts.md).

2. **Vérification de faisabilité** — [`postman/Sportsee-Verification-CodeInterpreter.postman_collection.json`](./postman/Sportsee-Verification-CodeInterpreter.postman_collection.json)
   et ses environnements de test associés (un par scénario : cas faisable, non faisable, cas
   limite, cas incohérent). Contient, pour chacun des 4 types d'objectif, une paire de requêtes :
   - `POST /v1/agents` — requête **SETUP**, à exécuter une seule fois (ou à chaque modification
     des instructions), qui crée l'agent avec `code_interpreter` activé et sauvegarde
     automatiquement son `agent_id` dans l'environnement (via un script de test Postman).
   - `POST /v1/conversations` — requête **Verification**, réutilisable pour chaque cas à tester,
     qui envoie l'`agent_id` déjà créé et les données du cas. Un script de test Postman associé
     extrait automatiquement la réponse finale (dernière entrée `message.output`), nettoie les
     éventuelles balises Markdown, et vérifie la présence des champs attendus.

La clé API est référencée via `{{MISTRAL_API_KEY}}` dans les deux collections, définie uniquement
dans l'environnement Postman (jamais dans le corps de la requête ou dans le repo Git).
