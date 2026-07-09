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

## 2. Endpoint principal utilisé

```
POST https://api.mistral.ai/v1/chat/completions
```

C'est l'équivalent de l'endpoint `chat/completions` d'OpenAI : on lui envoie une liste de
messages, il renvoie un message généré.

Endpoint annexe utile : `GET https://api.mistral.ai/v1/models` — liste les modèles disponibles
sur le compte et leur `max_context_length`, utile pour choisir le bon modèle.

## 3. Modèles disponibles (pertinents pour notre cas)

| Modèle | Contexte | Usage typique | Coût relatif |
|---|---|---|---|
| `mistral-small-latest` | ~128k tokens | tâches structurées, JSON, coût maîtrisé | € |
| `mistral-medium-latest` | ~128k tokens | raisonnement plus fin | €€ |
| `mistral-large-latest` | ~128k tokens | tâches complexes, multi-étapes | €€€ |

Notre besoin (profil coureur + historique de quelques semaines + génération d'un plan sur plusieurs
semaines) représente quelques milliers de tokens en entrée et en sortie : `mistral-small-latest`
suffit largement, ce qui limite le coût par requête. C'est le modèle retenu et validé sur
l'ensemble des tests (voir [04-Synthese.md](./04-Synthese.md)).

## 4. Paramètres qui influencent la qualité des réponses

| Paramètre | Rôle | Valeur retenue pour Sportsee | Pourquoi |
|---|---|---|---|
| `temperature` | Contrôle le hasard / la créativité (0 = très déterministe, 1+ = très créatif) | `0.2` | On veut un plan cohérent, pas une réponse créative |
| `top_p` | Alternative à la température : restreint le tirage aux tokens les plus probables (nucleus sampling) | non utilisé (on ne combine pas `top_p` et `temperature`) | Un seul levier de contrôle de l'aléa suffit, pour rester prévisible |
| `max_tokens` | Limite la taille de la réponse générée | `8000`, dimensionné dynamiquement selon le nombre de séances attendu (~120-180 tokens/séance) | Un plan dense (plusieurs semaines, plusieurs séances/semaine) peut dépasser 4 000 tokens en sortie ; la valeur doit suivre la taille réelle du plan pour éviter une réponse tronquée |
| `response_format` | Force le modèle à répondre en JSON strict (`{"type": "json_object"}`) | activé | Indispensable pour parser la réponse côté React sans avoir à extraire du texte libre |

**Sur la température.** Même à `0.2`, une certaine variabilité entre deux générations avec les
mêmes données d'entrée reste possible (cf. [04-Synthese.md](./04-Synthese.md) §3) : un LLM n'offre
pas de garantie stricte de reproductibilité, quel que soit le réglage. C'est pour cette raison que
les éléments critiques du plan — dates, faisabilité de l'objectif — sont calculés côté code plutôt
que confiés au modèle (voir [02-Requetes-API.md](./02-Requetes-API.md) et
[04-Synthese.md](./04-Synthese.md) §3.1) : la température réduit l'aléa sur la formulation, elle ne
l'élimine pas sur les valeurs numériques structurantes.

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
- **Pas de mémoire entre les appels** : chaque requête doit contenir tout le contexte utile
  (profil + historique + dates précalculées), le modèle ne se souvient pas des générations
  précédentes.

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

## 7. Collection Postman

Une collection Postman dédiée a été créée : voir [`postman/Sportsee-Mistral.postman_collection.json`](./postman/Sportsee-Mistral.postman_collection.json)
et l'environnement associé [`postman/Sportsee-Mistral.postman_environment.json`](./postman/Sportsee-Mistral.postman_environment.json).

Elle contient :
1. `GET /v1/models` — pour vérifier l'accès au compte et lister les modèles disponibles.
2. `POST /v1/chat/completions` — une requête par prompt spécialisé de l'architecture retenue
   (un par type d'objectif : course, perte de poids, endurance, forme générale — avec plusieurs
   variantes pour "course" selon la distance visée), conformément à
   [03-Conception-Prompts.md](./03-Conception-Prompts.md).

La clé API est référencée via `{{MISTRAL_API_KEY}}`, définie uniquement dans l'environnement
Postman (jamais dans le corps de la requête ou dans le repo Git).
