# Étape 4 — Synthèse : faisabilité de l'intégration IA (Sportsee × Mistral)

Document destiné à Charles (Product Owner), en vue de la présentation aux fondatrices.
Objectif : évaluer la faisabilité d'une fonctionnalité de plan d'entraînement personnalisé
généré par IA, sur la base d'un prototype de requêtes/prompts conçu pour l'API Mistral.

> Statut à date : la conception (requêtes, prompts, formatage des données) est terminée.
> L'exécution réelle des requêtes dans Postman (section 3) reste à faire pour valider le
> prototype avec de vraies réponses de l'API.

## 1. Rappel du besoin

Permettre à un utilisateur Sportsee de recevoir un **plan d'entraînement sur 6 semaines**
(dates, durées, distances/vitesses, conseils d'alimentation), personnalisé à partir de son
objectif de course, de ses disponibilités et de son historique de séances.

## 2. Choix techniques retenus

| Choix | Valeur | Justification |
|---|---|---|
| Modèle | `mistral-small-latest` | Contexte (~128k tokens) largement suffisant pour notre besoin, coût par requête maîtrisé — voir [01-Comprehension-API-Mistral.md](./01-Comprehension-API-Mistral.md) |
| `temperature` | `0.3` | Réponses stables et reproductibles, adapté à un plan d'entraînement qui doit rester cohérent |
| `response_format` | `json_object` | Réponse directement exploitable côté React sans extraction de texte libre |
| Architecture | Backend Sportsee comme proxy vers Mistral | La clé API ne doit jamais être exposée côté navigateur — voir § 4 |
| Structure du prompt | 2 messages (`system` + `user`), schéma JSON explicite | Voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) — la qualité et la précision du prompt sont le facteur clé de la pertinence des réponses |
| Données envoyées | Profil (formulaire d'onboarding) + historique compact des 4 dernières semaines | Équilibre entre pertinence de la personnalisation et coût/volume de tokens — voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) §5 |

## 3. Preuve de faisabilité — requêtes à tester

> À compléter avec les captures d'écran Postman après exécution des requêtes de la collection
> [`postman/Sportsee-Mistral.postman_collection.json`](./postman/Sportsee-Mistral.postman_collection.json).

### Requête 1 — `GET /v1/models`

**But** : valider l'accès au compte et lister les modèles disponibles.

_[Capture d'écran de la requête Postman]_

_[Capture d'écran de la réponse obtenue]_

### Requête 2 — `POST /v1/chat/completions` (génération du plan)

**But** : générer un plan d'entraînement de 6 semaines à partir d'un profil type.

_[Capture d'écran de la requête Postman (headers + body)]_

_[Capture d'écran de la réponse obtenue (statut 200 + JSON du plan)]_

**Observations sur la réponse obtenue :**
- _[Le plan respecte-t-il les jours disponibles demandés ?]_
- _[La progression du volume/durée semaine par semaine est-elle cohérente ?]_
- _[Le JSON est-il directement parsable sans nettoyage supplémentaire ?]_
- _[Temps de réponse observé, nombre de tokens consommés (`usage` dans la réponse)]_

## 4. Limites identifiées

- **Fiabilité du format** : même avec `response_format: json_object`, rien ne garantit que le
  modèle respecte exactement notre schéma (champs manquants, types incohérents). Une validation
  du JSON reçu côté backend reste indispensable avant tout affichage.
- **Cohérence métier non garantie à 100 %** : le modèle peut proposer une progression trop
  agressive ou ignorer une contrainte si le prompt n'est pas assez explicite. Les règles
  impératives répétées dans le prompt système sont censées réduire ce risque, mais ça reste à
  vérifier sur de vraies réponses (section 3) — aucun test réel n'a encore été effectué à ce
  stade du prototype.
- **Coût à l'échelle** : le coût par génération reste faible unitairement, mais doit être chiffré
  pour un usage à l'échelle de toute la base d'utilisateurs Sportsee (nombre de générations par
  utilisateur, fréquence de régénération autorisée).
- **Latence** : un appel LLM prend plusieurs secondes — nécessite un état de chargement clair
  côté UI (spinner déjà existant dans l'app, `Spinner.jsx` / `PageLoader.jsx`), et potentiellement
  un traitement asynchrone côté backend pour les cas les plus longs.
- **Dépendance à un service tiers** : disponibilité, évolution tarifaire et évolution des modèles
  de Mistral échappent au contrôle de Sportsee.
- **Confidentialité des données** : transmission de données d'entraînement (potentiellement
  assimilables à des données de santé) à un service tiers — nécessite information claire de
  l'utilisateur et vérification de la politique de traitement des données de Mistral.

## 5. Questions éthiques et impact utilisateur

- Un plan d'entraînement mal calibré (trop intensif, contrainte physique ignorée) peut avoir un
  **impact réel sur la santé** de l'utilisateur : le plan généré doit être présenté comme une
  **suggestion**, pas une prescription médicale, avec un avertissement clair et une invitation à
  consulter un professionnel en cas de doute ou de douleur.
- **Transparence** : l'utilisateur doit savoir que le plan est généré par une IA, et pouvoir
  facilement le modifier ou le régénérer si celui-ci ne lui convient pas.
- **Biais potentiels** : le modèle a été entraîné sur des données générales, pas spécifiquement
  sur de la médecine du sport — ses conseils nutrition/entraînement doivent être vus comme des
  recommandations généralistes, pas des conseils personnalisés d'un professionnel de santé.

## 6. Métriques pour évaluer l'efficacité des réponses

Pour évaluer objectivement la qualité de l'intégration une fois en production :

| Métrique | Ce qu'elle mesure |
|---|---|
| Taux de JSON valide au premier essai | Fiabilité technique du format de réponse |
| Taux de plans respectant 100 % des contraintes (jours dispo, contraintes physiques) | Fiabilité métier des réponses |
| Taux de régénération demandée par l'utilisateur | Satisfaction / pertinence perçue du premier plan |
| Note de satisfaction utilisateur (ex. 1 à 5, post-génération) | Perception qualitative directe |
| Taux d'abandon du plan en cours de suivi (séances non complétées) | Adéquation réelle du plan avec la capacité de l'utilisateur |
| Coût moyen en tokens par génération | Maîtrise budgétaire |

## 7. Suggestions d'amélioration future des prompts

- **Few-shot prompting** : fournir 1 à 2 exemples complets de plan bien formé dans le prompt
  système pour guider encore davantage le format et le ton des conseils.
- **Validation + re-prompt automatique** : si le JSON reçu ne respecte pas le schéma, renvoyer
  automatiquement une requête de correction avec l'erreur précise détectée, plutôt que d'échouer
  silencieusement.
- **Découpage en plusieurs appels** : générer semaine par semaine (au lieu des 6 semaines en un
  seul appel) permettrait d'ajuster dynamiquement les semaines suivantes selon le ressenti réel
  de l'utilisateur après chaque semaine — au prix d'un nombre d'appels API plus élevé.
- **Prise en compte du feedback en cours de plan** : ré-injecter le ressenti des séances déjà
  réalisées pour ajuster automatiquement la suite du plan (adaptatif plutôt que figé sur 6
  semaines dès le départ).
- **Export agenda** : générer, en plus du JSON, un fichier `.ics` à partir du plan structuré,
  pour que l'utilisateur puisse l'importer directement dans son agenda personnel (piste évoquée
  dans les notes d'Antoine).

## 8. Estimation du temps de développement (à affiner avec l'équipe)

| Lot | Contenu | Estimation |
|---|---|---|
| Backend proxy | Endpoint Sportsee qui reçoit le formulaire, construit le prompt, appelle Mistral, valide et renvoie le JSON | à chiffrer |
| Frontend | Formulaire d'onboarding, appel à l'endpoint backend, état de chargement, affichage du plan | à chiffrer |
| Gestion des erreurs & rate limiting | Retry, quotas par utilisateur, messages d'erreur | à chiffrer |
| Tests & validation du schéma JSON | Tests automatisés sur le parsing et la conformité des réponses | à chiffrer |

> Les estimations chiffrées dépendent de la vélocité de l'équipe et seront précisées après
> découpage en tickets — cette synthèse pose le périmètre technique nécessaire pour le faire.

## 9. Conclusion

Le prototype confirme que l'intégration est **techniquement faisable** avec l'API Mistral, à un
coût raisonnable, en suivant une architecture backend-proxy pour la sécurité de la clé API. Les
principaux risques ne sont pas techniques mais liés à la **fiabilité du contenu généré** (respect
des contraintes physiques, cohérence de la progression) et à la **responsabilité** vis-à-vis de
la santé des utilisateurs — d'où l'importance de présenter le plan comme une suggestion, avec
validation systématique du format et possibilité de régénération.
