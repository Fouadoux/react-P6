# Étape 1 — Comprendre l'API Mistral et ses capacités

Contexte : Sportsee veut proposer un plan d'entraînement personnalisé sur 6 semaines,
généré par IA à partir du profil et de l'historique du coureur (cf. notes d'Antoine).
Avant de concevoir la requête, il faut comprendre ce que l'API Mistral permet et ses limites.

## 1. Fonctionnement général d'une API de LLM

Un appel à un LLM (Large Language Model) via API fonctionne toujours sur le même principe :

1. On envoie une **conversation** (une liste de messages avec un rôle : `system`, `user`, `assistant`).
2. Le modèle **complète** cette conversation en générant le prochain message `assistant`.
3. Le modèle ne "sait" que ce qu'on lui donne dans la requête : il n'a pas de mémoire entre deux
   appels (sauf si on renvoie l'historique des messages précédents nous-mêmes).
4. La réponse est facturée en **tokens** (unité ≈ un mot ou un morceau de mot), à la fois pour
   ce qu'on envoie (input) et ce que le modèle renvoie (output).

C'est ce qui justifie l'étape 3 des notes d'Antoine (« formatage des données ») : plus on envoie
de texte, plus ça coûte cher et plus on risque de dépasser la taille de contexte disponible.

## 2. Endpoint principal utilisé

```
POST https://api.mistral.ai/v1/chat/completions
```

C'est l'équivalent de l'endpoint `chat/completions` d'OpenAI : on lui envoie une liste de
messages, il renvoie un message généré.

Endpoint annexe utile : `GET https://api.mistral.ai/v1/models` — liste les modèles disponibles
sur le compte et leur `max_context_length`, utile pour choisir le bon modèle (étape 3 des notes
d'Antoine).

## 3. Modèles disponibles (pertinents pour notre cas)

| Modèle | Contexte | Usage typique | Coût relatif |
|---|---|---|---|
| `mistral-small-latest` | ~128k tokens | tâches structurées, JSON, coût maîtrisé | € |
| `mistral-medium-latest` | ~128k tokens | raisonnement plus fin | €€ |
| `mistral-large-latest` | ~128k tokens | tâches complexes, multi-étapes | €€€ |

Notre besoin (profil coureur + historique de quelques semaines + génération d'un plan sur 6
semaines) représente quelques milliers de tokens en entrée et en sortie : `mistral-small-latest`
suffit largement, ce qui limite le coût par requête.

## 4. Paramètres qui influencent la qualité des réponses

| Paramètre | Rôle | Valeur retenue pour Sportsee                             | Pourquoi |
|---|---|----------------------------------------------------------|---|
| `temperature` | Contrôle le hasard / la créativité (0 = très déterministe, 1+ = très créatif) | `0.3`                                                    | On veut un plan cohérent et reproductible, pas une réponse créative — deux appels avec les mêmes données doivent donner des plans très similaires |
| `top_p` | Alternative à la température : restreint le tirage aux tokens les plus probables (nucleus sampling) | non utilisé (on ne combine pas `top_p` et `temperature`) | Un seul levier de contrôle de l'aléa suffit, pour rester prévisible |
| `max_tokens` | Limite la taille de la réponse générée | `4000`                                                   | Un plan sur 6 semaines en JSON reste largement sous cette limite ; ça évite une réponse tronquée ou un coût incontrôlé si le modèle part en boucle |
| `response_format` | Force le modèle à répondre en JSON strict (`{"type": "json_object"}`) | activé                                                   | Indispensable pour parser la réponse côté React sans avoir à extraire du texte libre |

**Hypothèse à valider par le test** : avec `temperature` à `0.3`, les plans générés devraient
rester stables d'un appel à l'autre. En poussant à `0.9`, on attend des séances plus variées
(formulation des conseils notamment), ce qui serait intéressant pour de la créativité mais pas
pour un plan d'entraînement qui doit rester cohérent et fiable. *Non encore vérifié — à comparer
lors de l'exécution des requêtes Postman (même profil, deux valeurs de `temperature`).*

## 5. Limites de l'API à connaître

- **Taille de contexte** : ~128k tokens sur les modèles retenus — largement suffisant pour
  notre cas d'usage, mais à surveiller si on envoie un historique de sessions trop long
  (voir étape « Formatage des données »).
- **Coût par requête** : facturé au token (input + output). Avec `mistral-small-latest`,
  un plan de 6 semaines reste peu coûteux, mais un usage à grande échelle (tous les
  utilisateurs Sportsee, plusieurs générations par utilisateur) doit être chiffré avant mise
  en prod.
- **Pas de garantie absolue de format** : même avec `response_format: json_object`, il faut
  toujours valider/parser la réponse côté serveur avant de l'afficher (le modèle peut renvoyer
  un JSON valide mais qui ne respecte pas exactement notre schéma).
- **Rate limiting** : l'API impose des limites de requêtes par minute/seconde selon le plan
  tarifaire du compte — à prévoir un mécanisme de limitation côté Sportsee (voir étape 2).
- **Pas de mémoire entre les appels** : chaque requête doit contenir tout le contexte utile
  (profil + historique), le modèle ne se souvient pas des générations précédentes.

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
2. `POST /v1/chat/completions` — la requête principale de génération du plan d'entraînement.

La clé API est référencée via `{{MISTRAL_API_KEY}}`, définie uniquement dans l'environnement
Postman (jamais dans le corps de la requête ou dans le repo Git).
