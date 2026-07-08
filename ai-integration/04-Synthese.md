# Étape 4 — Synthèse : faisabilité de l'intégration IA (Sportsee × Mistral)

Document destiné à Charles (Product Owner), en vue de la présentation aux fondatrices.
Objectif : évaluer la faisabilité d'une fonctionnalité de plan d'entraînement personnalisé
généré par IA, sur la base d'un prototype de requêtes/prompts conçu pour l'API Mistral.

> Statut à date : la conception (requêtes, prompts, formatage des données) est terminée.
> Les 6 requêtes de la collection Postman ont été exécutées avec `mistral-small-latest`
> (modèle retenu pour le prototype, cf. §2) — chaque type d'objectif a été testé sur
> **3 exécutions indépendantes** (mêmes données d'entrée), pour distinguer un défaut isolé
> d'une tendance reproductible. 12 runs de génération de plan au total.

## 1. Rappel du besoin

Permettre à un utilisateur Sportsee de recevoir un **plan d'entraînement sur 6 semaines**
(dates, durées, distances/vitesses, conseils d'alimentation), personnalisé à partir de son
objectif, de ses disponibilités et de son historique de séances.

Le prototype couvre **4 types d'objectifs**, via un champ `type_objectif` (voir
[02-Requetes-API.md](./02-Requetes-API.md) §1.b) : `course` (ex. semi-marathon, 10 km en moins
d'1h), `perte_poids`, `endurance`, `forme_generale`. Ce n'était pas couvert dans la première
version du prototype (course uniquement) — l'élargissement a permis de vérifier que le prompt
système généralise correctement à des objectifs qui n'ont ni date de course ni temps chronométré.

## 2. Choix techniques retenus

| Choix | Valeur | Justification |
|---|---|---|
| Modèle | `mistral-small-latest` | Contexte (~128k tokens) largement suffisant pour notre besoin, coût par requête maîtrisé — voir [01-Comprehension-API-Mistral.md](./01-Comprehension-API-Mistral.md) |
| `temperature` | `0.3` | Réponses stables et reproductibles, adapté à un plan d'entraînement qui doit rester cohérent |
| `response_format` | `json_object` | Réponse directement exploitable côté React sans extraction de texte libre |
| Architecture | Backend Sportsee comme proxy vers Mistral | La clé API ne doit jamais être exposée côté navigateur — voir § 4 |
| Structure du prompt | 2 messages (`system` + `user`), schéma JSON explicite | Voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) — la qualité et la précision du prompt sont le facteur clé de la pertinence des réponses |
| Gestion des objectifs | Un champ `type_objectif` (`course` / `perte_poids` / `endurance` / `forme_generale`) avec champs conditionnels, un seul prompt système à branches | Évite d'envoyer des champs vides ou hors-sujet (ex. temps chronométré sur un plan perte de poids) — voir [02-Requetes-API.md](./02-Requetes-API.md) §1.b |
| Données envoyées | Profil (formulaire d'onboarding) + historique compact des 4 dernières semaines | Équilibre entre pertinence de la personnalisation et coût/volume de tokens — voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) §5 |

## 3. Preuve de faisabilité — résultats des requêtes (12 runs, `mistral-small-latest`)

Chacune des 4 requêtes de génération (course, perte_poids, endurance, forme_generale) a été
exécutée **3 fois** avec les mêmes données d'entrée, afin de vérifier si les écarts constatés
sont des incidents isolés ou une tendance reproductible du modèle. Profil type utilisé pour
tous les runs : 32 ans, genou sensible, 3 séances/semaine (lundi/mercredi/samedi), objectif
hebdomadaire actuel 15 km/semaine.

**Résultat technique commun aux 12 runs** : statut `200`, JSON syntaxiquement valide dans tous
les cas, structure conforme au schéma demandé (clés, types). `max_tokens: 4000` s'est révélé
suffisant (aucune réponse tronquée).

### 3.a — Course (semi-marathon)

| Semaine | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| 1 | 24 km | 19 km | 25,5 km |
| 2 | 28 km (+16,7%) | 23 km (+21%) | 29 km (+13,7%) |
| 3 | 32 km (+14,3%) | 27 km (+17,4%) | 33 km (+13,8%) |
| 4 | 36 km (+12,5%) | 31 km (+14,8%) | 37 km (+12,1%) |
| 5 | 34 km (-5,6%) | 35 km (+12,9%) | 40 km (+8,1%) |
| 6 | 16 km (taper) | 8 km (taper) | 13 km (taper) |

**Progression du volume** : la règle du prompt ("max ~10%/semaine") est dépassée sur **les 3
runs, à chaque transition** entre S1 et S4 (écarts de 12 à 21%). Aucun des 3 runs ne respecte
la contrainte de bout en bout.

**Défaut le plus grave (run 3)** : une séance "simulation semi-marathon" de 18 km à allure
quasi-cible programmée un **mercredi**, à seulement 2 jours de la sortie longue du samedi
(10 km) — récupération insuffisante entre deux séances lourdes, sans adaptation visible pour
la contrainte "genou sensible" du profil.

**Contrainte physique** : peu ou pas d'adaptation constatée pour le genou sensible au-delà
d'une mention isolée en semaine 1 (run 1) — application inconstante d'un run à l'autre.

### 3.b — Perte de poids

| Semaine | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| 1 | 15 km | 11,5 km | 18,5 km |
| 2 | 16,5 km (+10%) | 12,5 km (+8,7%) | 17,5 km (-5,4%) |
| 3 | 18 km (+9,1%) | 13,5 km (+8%) | 21 km (+20%) |
| 4 | 19,5 km (+8,3%) | 14,5 km (+7,4%) | 19,5 km (-7,1%) |
| 5 | 21 km (+7,7%) | 15,5 km (+6,9%) | 23,5 km (+20,5%) |
| 6 | 13,5 km (taper) | 13,5 km (taper) | 16 km (taper) |

**Progression du volume** : **2 runs sur 3** (run 1 et run 2) respectent la règle des
~10%/semaine sur l'ensemble du plan — le meilleur résultat obtenu sur les 4 objectifs testés.
Le run 3 reste erratique (alternance hausse/baisse, deux bonds à +20%).

**Contrainte physique — meilleur résultat de toute la campagne de tests** : le run 2 place
systématiquement le mercredi en "renforcement musculaire léger" à 0 km, sans exception sur les
6 semaines — zéro impact articulaire ce jour-là.

**Écart à la règle spécifique `perte_poids`** : le prompt système demande explicitement de
*"n'imposer aucune contrainte de temps chronométré"* et de *"privilégier la régularité et le
volume total sur la vitesse"*. Or les 3 runs donnent une `vitesse_cible` précise en min/km
(ex. `"6:00 - 6:15/km"`), et 2 runs sur 3 introduisent du **fractionné** — un exercice
justement orienté vitesse, à l'opposé de la consigne. Les conseils nutrition, en revanche,
respectent bien la règle "jamais de restriction sévère" sur les 3 runs.

### 3.c — Endurance

| Semaine | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| 1 | 13,7 km | 12 km | 18,5 km |
| 2 | 15,8 km (+15,3%) | 13 km (+8,3%) | 21,5 km (+16,2%) |
| 3 | 18 km (+13,9%) | 14 km (+7,7%) | 23,5 km (+9,3%) |
| 4 | 20,2 km (+12,2%) | 15 km (+7,1%) | 26,5 km (+12,8%) |
| 5 | 22,3 km (+10,4%) | 16 km (+6,7%) | 29,5 km (+11,3%) |
| 6 | 15 km (taper) | 9 km (taper) | 15 km (taper) |

**Progression du volume** : seul le run 2 respecte strictement la règle des ~10%/semaine sur
toute la durée. Runs 1 et 3 la dépassent systématiquement.

**Anomalie de format détectée (run 1)** : une date au format invalide, `"2026-027"` au lieu de
`"2026-06-27"`. C'est la première preuve concrète (sur l'ensemble des 12 runs) qu'une réponse
`200` avec JSON valide peut néanmoins être **hors schéma métier** — le risque théorique déjà
identifié en §4 (ancienne version) se confirme en pratique.

Cette anomalie illustre un choix de conception à corriger avant mise en prod : le prompt actuel
demande au **modèle** de calculer et formater lui-même chaque date (`date de départ` +
`joursDispo` → 18 dates sur 6 semaines), une tâche calendaire/arithmétique répétitive peu
fiable pour un LLM. La correction proposée en §7 (précalcul des dates côté backend, injectées
telles quelles dans le prompt user) aurait empêché ce type d'erreur par construction — le
modèle n'aurait plus eu à produire de date, seulement à réutiliser celles fournies.

**Non-respect de la règle spécifique `endurance` (run 3)** : la règle demande de faire
progresser la **durée** vers l'`objectif_endurance` ("courir 45 min sans s'arrêter"), à allure
modérée, plutôt que la vitesse. Le run 3 fait l'inverse : `duree_min` reste figé à 60 min sur
les 5 premières semaines, tandis que la distance grimpe de 5,5 à 11 km — donc l'allure
accélère au fil du plan, la logique demandée est inversée. Ce run ne mentionne d'ailleurs
jamais l'objectif "45 min" et ne fait rien pour en rapprocher le coureur.

**Progression mesurable vers l'objectif fourni** : seul le run 1 boucle la boucle clairement
(séance "test objectif" en semaine 6, 45 min, avec confirmation explicite de l'objectif
atteint). Le run 2 mentionne l'objectif mais avec une incohérence interne (séance titrée
"objectif 45 min" affichant `duree_min: 60`). Le run 3 ignore l'objectif qualitatif fourni par
l'utilisateur.

### 3.d — Forme générale

| Semaine | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| 1 | 11 km | 15,5 km | 15,5 km |
| 2 | 13 km (+18,2%) | 15 km (-3,2%) | 15 km (-3,2%) |
| 3 | 15 km (+15,4%) | 18 km (+20%) | 15,5 km (+3,3%) |
| 4 | 17 km (+13,3%) | 17,5 km (-2,8%) | 17,5 km (+12,9%) |
| 5 | 18,5 km (+8,8%) | 20,5 km (+17,1%) | 17,5 km (0%) |
| 6 | 9 km (taper) | 14 km (taper) | 12 km (taper) |

**Progression du volume** : **aucun des 3 runs** ne respecte la règle des ~10%/semaine sur
l'ensemble du plan — le résultat le plus faible des 4 objectifs testés sur ce critère précis.

**Anomalie de cohérence interne (run 3)** : sur 4 séances du mercredi, `vitesse_cible` vaut
`"N/A"` alors que `distance_km` est positif (ex. 3 km avec vitesse "N/A"). Contrairement à
l'anomalie de date du run "endurance" (défaut syntaxique), celle-ci est un défaut **sémantique**
— le JSON reste parfaitement valide et conforme au schéma (types corrects), mais logiquement
incohérent. Une validation de schéma classique ne détecterait pas ce problème ; il faudrait une
règle métier dédiée (`distance_km > 0` ⟹ `vitesse_cible` renseignée).

**Variété des séances (règle spécifique à cet objectif)** : résultat mitigé. Le run 2 varie
réellement le vocabulaire des séances ("côte douce", "terrain varié", "trail léger"). Les runs
1 et 3 restent répétitifs : "endurance fondamentale" revient quasi identique sur 12 des 18
séances.

**Contrainte physique** : le run 1 est le seul à protéger systématiquement le mercredi (0 km,
"renforcement musculaire (genou)" sur les 6 semaines). Les runs 2 et 3 mélangent renforcement
et course, avec une protection partielle voire nulle.

### 3.e — Tableau récapitulatif (12 runs)

| Objectif | Progression respectée (± ~10%/sem.) | Contrainte genou | Défaut le plus grave observé |
|---|---|---|---|
| Course | 0 / 3 runs | Inconstante | Séance "simulation" 18 km à allure quasi-course, un mercredi, sans adaptation genou |
| Perte de poids | 2 / 3 runs | Bonne (run 2 exemplaire) | `vitesse_cible` chronométrée + fractionné, malgré la règle "pas de contrainte de temps" |
| Endurance | 1 / 3 runs | Inconstante | Date invalide (`"2026-027"`) ; objectif qualitatif parfois ignoré ou inversé |
| Forme générale | 0 / 3 runs | Inconstante (1 run exemplaire) | Incohérence `vitesse_cible: "N/A"` avec `distance_km > 0` |

## 4. Limites identifiées

- **Fiabilité du format — deux familles de défauts distinctes, confirmées sur les 12 runs** :
  - *Syntaxique* : un JSON valide mais avec un champ hors format attendu (ex. date
    `"2026-027"` au lieu de `"2026-06-27"`, observé sur "endurance" run 1). Détectable par une
    validation de schéma classique (regex, JSON Schema) côté backend.
  - *Sémantique* : un JSON valide et conforme au schéma, mais logiquement incohérent (ex.
    `distance_km: 3` avec `vitesse_cible: "N/A"`, observé sur "forme_generale" run 3). **Non
    détectable par une validation de schéma standard** — nécessite des règles métier dédiées
    (cohérence entre champs) en plus de la validation de structure.
  - Dans les deux cas, `response_format: json_object` garantit la syntaxe JSON globale, mais ne
    garantit ni le format des valeurs internes ni leur cohérence logique. Une validation
    applicative reste indispensable avant tout affichage.

- **Cohérence métier non garantie, et instable d'un run à l'autre** : sur les 12 runs (4
  objectifs × 3 runs), **aucun objectif n'obtient 3 runs sur 3 conformes** à la règle de
  progression du volume hebdomadaire (max ~10%/semaine). Le meilleur score est 2/3 (perte de
  poids). Ce n'est donc pas un défaut isolé sur une génération donnée, mais une tendance
  reproductible du modèle sur ce type de contrainte cumulative. Un même utilisateur peut, à
  deux régénérations d'affilée avec les mêmes données, obtenir un plan globalement cohérent ou
  un plan avec un bond de volume dangereux.

- **Application inconstante des règles spécifiques par `type_objectif`** : plusieurs cas
  observés où le modèle enfreint une règle propre à l'objectif alors que la règle commune
  (format, structure) est respectée — ex. `vitesse_cible` chronométrée sur `perte_poids`
  malgré la consigne explicite contraire, ou progression de la vitesse plutôt que de la durée
  sur `endurance`. Le prompt système généralise correctement sur le plan du *format* aux 4
  objectifs, mais moins fiablement sur le plan du *contenu métier* propre à chacun.

- **Contrainte physique (genou sensible) prise en compte de façon inconstante** : sur les 12
  runs, le niveau de protection va de "systématique et cohérent sur 6 semaines" (ex. perte de
  poids run 2, forme générale run 1) à "quasiment absent" (ex. course, où le mercredi n'est
  jamais clairement adapté). Rien ne garantit qu'un run donné applique correctement une
  contrainte physique pourtant explicitement fournie dans le prompt.

- **Coût à l'échelle** : le coût par génération reste faible unitairement
  (≈1000 tokens en entrée, 2300-3000 en sortie par run), mais doit être chiffré pour un usage à
  l'échelle de toute la base d'utilisateurs Sportsee (nombre de générations par utilisateur,
  fréquence de régénération autorisée).
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
  consulter un professionnel en cas de doute ou de douleur. Les tests de la section 3 renforcent
  ce point : la contrainte physique n'est pas toujours respectée, même quand elle est fournie
  explicitement dans le prompt.
- **Transparence** : l'utilisateur doit savoir que le plan est généré par une IA, et pouvoir
  facilement le modifier ou le régénérer si celui-ci ne lui convient pas. Vu la variabilité
  observée entre runs (§3), la possibilité de régénérer facilement n'est pas un simple confort
  mais une vraie nécessité fonctionnelle.
- **Biais potentiels** : le modèle a été entraîné sur des données générales, pas spécifiquement
  sur de la médecine du sport — ses conseils nutrition/entraînement doivent être vus comme des
  recommandations généralistes, pas des conseils personnalisés d'un professionnel de santé.

## 6. Métriques pour évaluer l'efficacité des réponses

Pour évaluer objectivement la qualité de l'intégration une fois en production :

| Métrique | Ce qu'elle mesure |
|---|---|
| Taux de JSON valide au premier essai | Fiabilité technique du format de réponse |
| Taux de plans respectant 100 % des contraintes (jours dispo, contraintes physiques) | Fiabilité métier des réponses |
| Taux de plans respectant la progression max ~10 %/semaine | Sécurité de la progression physique — cf. §3, à instrumenter en priorité vu le taux observé en test (0 à 2 runs sur 3 selon l'objectif) |
| Taux de régénération demandée par l'utilisateur | Satisfaction / pertinence perçue du premier plan |
| Note de satisfaction utilisateur (ex. 1 à 5, post-génération) | Perception qualitative directe |
| Taux d'abandon du plan en cours de suivi (séances non complétées) | Adéquation réelle du plan avec la capacité de l'utilisateur |
| Coût moyen en tokens par génération | Maîtrise budgétaire |

## 7. Suggestions d'amélioration future des prompts

- **Précalculer les dates de séances côté backend (priorité haute)** : le prompt actuel
  (cf. [03-Conception-Prompts.md](./03-Conception-Prompts.md) §4) laisse le modèle calculer
  lui-même chaque date de séance à partir de `dateDebut` et `joursDispo` — une tâche
  calendaire répétitive sur 18 dates (6 semaines × 3 jours) que le modèle peut mal exécuter,
  comme observé en §3.c (`"2026-027"` au lieu de `"2026-06-27"`). La correction est simple :
  calculer la liste exacte des 18 dates côté backend (jour de la semaine × nombre de semaines,
  pure logique applicative, aucun risque d'erreur), puis les injecter directement dans le
  prompt user avec une instruction du type *"utilise exactement ces dates, dans cet ordre,
  n'en calcule aucune toi-même"*. Ça retire une source d'erreur pure du périmètre du modèle et
  recentre son travail sur ce qui a vraiment besoin de raisonnement : le contenu sportif et
  nutritionnel. Cette correction est indépendante des autres pistes ci-dessous et peut être
  appliquée immédiatement, sans attendre une refonte plus large du prompt.
- **Validation + re-prompt automatique (priorité haute, cf. §3-4)** : calculer le volume
  hebdomadaire total côté backend après réception de la réponse, et si l'écart dépasse ~10 %
  d'une semaine à l'autre, redemander une correction en précisant l'écart constaté. Vu le taux
  d'échec observé sur ce point précis (0 à 2 runs sur 3 conformes selon l'objectif), c'est la
  piste la plus directement justifiée par les tests réalisés.
- **Validation sémantique, pas seulement syntaxique** : au-delà d'un JSON Schema classique
  (qui aurait laissé passer l'incohérence `distance_km > 0` / `vitesse_cible: "N/A"` observée
  en §3.d), ajouter des règles de cohérence métier ciblées (ex. une distance positive doit avoir
  une vitesse renseignée) avant d'afficher le plan à l'utilisateur.
- **Few-shot prompting** : fournir 1 à 2 exemples complets de plan bien formé dans le prompt
  système pour guider encore davantage le format et le ton des conseils — pourrait aussi aider
  à stabiliser le respect des règles spécifiques par objectif (ex. `vitesse_cible` qualitative
  sur `perte_poids`, actuellement mal respectée).
- **Découpage en plusieurs appels** : générer semaine par semaine (au lieu des 6 semaines en un
  seul appel) permettrait de resserrer la contrainte de progression à une seule transition par
  appel (volume S(n) vs S(n-1) réel) plutôt que de la faire tenir sur 6 semaines d'affilée — piste
  particulièrement pertinente vu que l'échec de progression observé (§3) touche systématiquement
  plusieurs transitions consécutives, pas un cas isolé.
- **Prise en compte du feedback en cours de plan** : ré-injecter le ressenti des séances déjà
  réalisées pour ajuster automatiquement la suite du plan (adaptatif plutôt que figé sur 6
  semaines dès le départ).
- **Export agenda** : générer, en plus du JSON, un fichier `.ics` à partir du plan structuré,
  pour que l'utilisateur puisse l'importer directement dans son agenda personnel (piste évoquée
  dans les notes d'Antoine).
- **Trame de plan validée par un coach humain** : plutôt que de laisser le modèle concevoir
  entièrement la structure du plan (paliers de volume, pic de sortie longue, timing de
  l'affûtage), faire valider une trame par objectif/niveau par un vrai coach, et limiter le rôle
  du LLM à la personnalisation (dates, contraintes physiques, légers ajustements). Piste la plus
  structurante pour éliminer par construction le type de défaut le plus grave observé en §3
  (ex. séance à distance quasi complète et allure course sans adaptation à une contrainte
  physique) — au prix d'un contenu à produire en amont avec des coachs et d'une perte de
  flexibilité totale du système.

## 8. Estimation du temps de développement (à affiner avec l'équipe)

| Lot | Contenu | Estimation |
|---|---|---|
| Backend proxy | Endpoint Sportsee qui reçoit le formulaire, construit le prompt, appelle Mistral, valide et renvoie le JSON | à chiffrer |
| Frontend | Formulaire d'onboarding, appel à l'endpoint backend, état de chargement, affichage du plan | à chiffrer |
| Gestion des erreurs & rate limiting | Retry, quotas par utilisateur, messages d'erreur | à chiffrer |
| Validation du JSON (syntaxique + sémantique, cf. §7) | Schéma + règles métier (cohérence entre champs, progression du volume) | à chiffrer |
| Tests & validation du schéma JSON | Tests automatisés sur le parsing et la conformité des réponses | à chiffrer |

> Les estimations chiffrées dépendent de la vélocité de l'équipe et seront précisées après
> découpage en tickets — cette synthèse pose le périmètre technique nécessaire pour le faire.

## 9. Conclusion

Le prototype confirme que l'intégration est **techniquement faisable** avec l'API Mistral
(`mistral-small-latest`), à un coût raisonnable, en suivant une architecture backend-proxy pour
la sécurité de la clé API. Le format de réponse (JSON, structure du schéma) est fiable dans
l'ensemble des 12 runs testés.

Les principaux risques ne sont pas techniques mais liés à la **fiabilité du contenu généré** :
sur les 4 types d'objectifs testés (3 runs chacun), la règle de progression sécurisée du volume
(~10%/semaine) n'est jamais respectée sur 3 runs sur 3, et varie fortement d'un run à l'autre
avec des données d'entrée identiques. La contrainte physique du profil (genou sensible) est
elle aussi appliquée de façon inconstante. Ces deux points, qui touchent directement à la
**responsabilité vis-à-vis de la santé des utilisateurs**, justifient de présenter tout plan
généré comme une suggestion à valider, avec une validation applicative systématique
(syntaxique et sémantique, cf. §7) avant affichage, et une possibilité de régénération facile
pour l'utilisateur.
