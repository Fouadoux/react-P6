# Étape 4 — Synthèse : faisabilité de l'intégration IA (Sportsee × Mistral)

Document destiné à Charles (Product Owner), en vue de la présentation aux fondatrices.
Objectif : évaluer la faisabilité d'une fonctionnalité de plan d'entraînement personnalisé
généré par IA, sur la base de l'architecture retenue pour l'API Mistral.

> Statut à date : la conception (requêtes, prompts, formatage des données, algorithme de
> faisabilité) est terminée et validée par une campagne de tests dédiée. L'architecture retenue
> est une **architecture multi-prompts** — un prompt spécialisé par type de demande, dates
> précalculées côté code, faisabilité calculée par un algorithme déterministe — détaillée dans
> [03-Conception-Prompts.md](./03-Conception-Prompts.md). Un prototype antérieur, à prompt système
> unique, avait mis en évidence des limites qui ont motivé ce choix d'architecture ; le détail de
> ces tests est conservé à titre de traçabilité en Annexe A, en fin de document.

## 1. Rappel du besoin

Permettre à un utilisateur Sportsee de recevoir un **plan d'entraînement personnalisé, de durée
variable** (selon l'objectif et l'échéance) (dates, durées, distances/vitesses, conseils
d'alimentation), à partir de son objectif, de ses disponibilités et de son historique de séances.

La fonctionnalité couvre **4 types d'objectifs**, via un champ `type_objectif` (voir
[02-Requetes-API.md](./02-Requetes-API.md) §1.b) : `course` (ex. semi-marathon, 10 km en moins
d'1h), `perte_poids`, `endurance`, `forme_generale`.

## 2. Choix techniques retenus

| Choix | Valeur | Justification |
|---|---|---|
| Modèle | `mistral-small-latest` | Contexte (~128k tokens) largement suffisant pour notre besoin, coût par requête maîtrisé — voir [01-Comprehension-API-Mistral.md](./01-Comprehension-API-Mistral.md) |
| `temperature` | `0.2` | Réponses aussi stables que possible, adapté à un plan d'entraînement qui doit rester cohérent |
| `max_tokens` | `8000` (dimensionnement dynamique visé, ~120-180 tk/séance) | Un plan dense (plusieurs semaines × plusieurs séances/semaine) peut dépasser 4 000 tokens en sortie |
| `response_format` | `json_object` | Réponse directement exploitable côté React sans extraction de texte libre |
| Architecture réseau | Backend Sportsee comme proxy vers Mistral | La clé API ne doit jamais être exposée côté navigateur |
| Structure du prompt | 2 messages (`system` + `user`) par appel, **un prompt système spécialisé par `type_objectif`** (routing côté code, pas de branches conditionnelles dans un prompt unique) | Voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) — chaque appel ne reçoit que les règles pertinentes pour sa demande |
| Dates de séances | Précalculées côté backend, injectées dans le prompt `user` | Retire du modèle une tâche calendaire répétitive à faible valeur ajoutée et à risque d'erreur |
| Faisabilité (objectif `course`) | Calculée par un **algorithme backend déterministe** (`faisabilite.py`), jamais par le LLM | Garantit un verdict reproductible et une cohérence stricte entre distance visée et délai — voir §3.1 |
| Saisie utilisateur | Options préenregistrées (`select` / multi-select) plutôt que texte libre, sauf pour les contraintes physiques | Entrées normalisées, indispensables pour un routing et des calculs fiables côté code |
| Données envoyées | Profil (formulaire d'onboarding) + historique compact des 4 dernières semaines | Équilibre entre pertinence de la personnalisation et coût/volume de tokens |

## 3. Preuve de faisabilité — résultats des requêtes

> Campagne de validation du 08/07/2026, `mistral-small-latest`, architecture multi-prompts avec
> dates injectées et durée variable. **5 runs valides retenus** ; les tentatives non conformes
> (volume de référence d'entrée incohérent, réponse tronquée par un `max_tokens` alors trop bas)
> ont été écartées après correction des paramètres d'entrée — cf. enseignements ci-dessous.

**Runs retenus**

| # | Objectif (prompt) | Durée | Séances/sem | Volume réf. | Blessure | Tokens |
|---|---|---|---|---|---|---|
| 01 | Course — semi-marathon | 12 sem | 3 | 20 km | — | 4 842 |
| 02 | Course — 10 km | 8 sem | 3 | 24 km | genou sensible | 4 327 |
| 03 | Perte de poids | 6 sem | 3 | 8 km | douleurs lombaires | 3 186 |
| 04 | Endurance | 10 sem | 4 | 25 km | — | 4 907 |
| 05 | Forme générale | 4 sem | 2 | 6 km | cheville fragile | 1 436 |

**Résultats par critère**

| Critère | 01 | 02 | 03 | 04 | 05 |
|---|---|---|---|---|---|
| JSON valide & complet | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dates conformes (injectées) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Objectif respecté (pas de dérive course) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progression volume ≤ 10 % | ✅\* | ✅\* | ✅ | ✅\* | ✅ |
| Adaptation blessure | n/a | ✅ | ✅ | n/a | ✅ |

\* dépassements ponctuels ≤ ~1,5 point de %, jugés dans la tolérance acceptée (voir note ci-dessous).

**Enseignements majeurs**
1. **Injection des dates = 100 % fiable** (5/5 runs, 0 erreur) → sortir le calcul calendaire du LLM est validé.
2. **`max_tokens` doit être dimensionné selon le nombre de séances** (~120-180 tokens/séance) : un plan dense (10 sem × 4 séances = 40 séances) a tronqué à 4 000 tokens → JSON invalide. Base portée à 8 000, idéalement dynamique côté code.
3. **La cohérence des entrées est déterminante** : un volume de référence incohérent avec l'objectif (ex. 12 km/sem pour un 10 km) pousse le modèle à gonfler les séances ; avec une base réaliste (24 km) le volume redevient cohérent → normaliser/valider les entrées côté code (cf. §3.1, `faisabilite.py`).
4. **Multi-prompts spécialisés = objectif respecté** : `perte_poids` et `forme` ne dérivent plus en préparation course (allure de confort, pas de chrono).

> **Note — tolérance sur la progression du volume.** Un dépassement ponctuel jusqu'à ~12 % est
> considéré comme acceptable (la règle des 10 % est une heuristique, pas un seuil médical). Le
> prompt conserve « ≤ 10 % » ; la tolérance est gérée uniquement côté validation backend.

### 3.1 — Algorithme de faisabilité (obligatoire, en amont de tout prompt Course)

L'algorithme `faisabilite.py` calcule la faisabilité d'un objectif de course **côté code**, de
façon **déterministe et reproductible** : à volume actuel, nombre de semaines disponibles et
distance de course visée identiques, il renvoie toujours le même verdict. Il évalue la
faisabilité sur **deux critères combinés**, pas un seul :

1. **Le volume hebdomadaire atteignable** à la date de la course (projection du volume actuel à
   +10 %/semaine maximum) doit couvrir un volume minimal requis pour la distance visée
   (~1,5× la distance de course).
2. **La sortie longue atteignable** (plafonnée à ~50 % du volume hebdomadaire max) doit couvrir au
   moins ~90 % de la distance de course visée — avec un plafond réaliste de 32 km pour le
   marathon, où on ne court jamais la distance complète à l'entraînement.

Si les deux critères passent, l'objectif est déclaré `faisable` et la `distance_cible_km` fournie
au prompt Course reste celle demandée par l'utilisateur. Si l'un des deux échoue, l'algorithme
calcule la **durée minimale réellement nécessaire** pour atteindre le volume requis (toujours à
+10 %/semaine), ce qui permet de proposer une alternative concrète à l'utilisateur : allonger le
délai, ou retenir un objectif de distance intermédiaire compatible avec le délai initial. Cette
dualité « diagnostic + solution » (pas seulement un verdict binaire) est ce qui permet de router
automatiquement vers le bon prompt spécialisé plutôt que de laisser le modèle gérer un arbitrage
qu'il exécute mal.

Ce contrôle est **strictement obligatoire pour tout prompt Course** : aucun plan de préparation à
une course n'est généré sans un verdict `faisable = true` en entrée — soit parce que l'objectif
initial passe le test, soit parce qu'il a été rétrogradé (distance et/ou durée ajustées) au
préalable. Les prompts hors course (perte de poids, endurance, forme générale) n'ont pas besoin de
ce contrôle, faute de distance chronométrée à préparer.

Il faut enfin souligner que les constantes utilisées (progression max +10 %/semaine, volume hebdo
≈ 1,5× la distance de course, sortie longue ≈ 50 % du volume hebdo plafonnée à 90 % de la distance
visée) sont des **heuristiques**, pas des règles médicales établies : comme pour le contenu des
prompts, elles doivent être **validées par un coach sportif qualifié** avant mise en production.

## 4. Limites identifiées

- **Fiabilité du format — deux familles de défauts distinctes à surveiller** :
  - *Syntaxique* : un JSON valide mais avec un champ hors format attendu (ex. une date mal
    formatée). Détectable par une validation de schéma classique (regex, JSON Schema) côté
    backend.
  - *Sémantique* : un JSON valide et conforme au schéma, mais logiquement incohérent (ex. une
    distance positive avec une vitesse cible non renseignée). **Non détectable par une validation
    de schéma standard** — nécessite des règles métier dédiées (cohérence entre champs) en plus de
    la validation de structure.
  - Dans les deux cas, `response_format: json_object` garantit la syntaxe JSON globale, mais ne
    garantit ni le format des valeurs internes ni leur cohérence logique. Une validation
    applicative reste indispensable avant tout affichage.
- **Variabilité résiduelle** : même avec une architecture multi-prompts et des entrées validées en
  amont, un LLM reste probabiliste — deux générations avec les mêmes données peuvent encore
  différer légèrement sur la formulation ou, ponctuellement, sur un chiffre de progression (cf.
  tolérance §3). D'où la nécessité d'une validation systématique après génération, avec
  possibilité de re-génération automatique en cas d'écart significatif (voir §7).
- **Coût à l'échelle** : le coût par génération reste faible unitairement (de l'ordre de 1 000 à
  1 900 tokens en entrée et 1 200 à 4 000 tokens en sortie selon la durée et la densité du plan,
  cf. §3), mais doit être chiffré pour un usage à l'échelle de toute la base d'utilisateurs
  Sportsee (nombre de générations par utilisateur, fréquence de régénération autorisée).
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
  consulter un professionnel en cas de doute ou de douleur. La variabilité résiduelle observée
  (§4) renforce ce point : la contrainte physique et la progression de volume doivent être
  vérifiées côté backend à chaque génération, même sur l'architecture finale.
- **Co-rédaction avec un coach + avertissement systématique** : chaque prompt spécialisé doit être
  **rédigé et validé en collaboration avec un coach sportif qualifié** (garantie de véracité et de
  sécurité du contenu métier), et chaque plan renvoyé doit inclure un **avertissement explicite**
  (champ `avertissement`) rappelant qu'il s'agit d'une **proposition générée par IA**, qui ne se
  substitue pas à un entraînement établi par un professionnel.
- **Transparence** : l'utilisateur doit savoir que le plan est généré par une IA, et pouvoir
  facilement le modifier ou le régénérer si celui-ci ne lui convient pas. La possibilité de
  régénérer facilement n'est pas un simple confort mais une vraie nécessité fonctionnelle.
- **Biais potentiels** : le modèle a été entraîné sur des données générales, pas spécifiquement
  sur de la médecine du sport — ses conseils nutrition/entraînement doivent être vus comme des
  recommandations généralistes, pas des conseils personnalisés d'un professionnel de santé.

## 6. Métriques pour évaluer l'efficacité des réponses

Pour évaluer objectivement la qualité de l'intégration une fois en production :

| Métrique | Ce qu'elle mesure |
|---|---|
| Taux de JSON valide au premier essai | Fiabilité technique du format de réponse |
| Taux de plans respectant 100 % des contraintes (jours dispo, contraintes physiques) | Fiabilité métier des réponses |
| Taux de plans respectant la progression max ~10 %/semaine | Sécurité de la progression physique, à instrumenter en priorité |
| Taux de régénération demandée par l'utilisateur | Satisfaction / pertinence perçue du premier plan |
| Note de satisfaction utilisateur (ex. 1 à 5, post-génération) | Perception qualitative directe |
| Taux d'abandon du plan en cours de suivi (séances non complétées) | Adéquation réelle du plan avec la capacité de l'utilisateur |
| Coût moyen en tokens par génération | Maîtrise budgétaire |

## 7. Suggestions d'amélioration future des prompts

**Décisions validées / appliquées**
- ✅ **Dates injectées côté code** : fiabilité 100 % sur 5 runs → validé et appliqué.
- ✅ **Multi-prompts spécialisés** (1 par type d'objectif) : objectif respecté, plus de dérive « course » → appliqué.
- ✅ **Faisabilité = algorithme backend déterministe** (plus de LLM) : `faisable` / `duree_recommandee` / `volume_cible_hebdo_km` / `distance_cible_km` sont calculés **côté code** (voir `faisabilite.py`). Détail du fonctionnement, des deux critères évalués et du caractère **🔴 obligatoire pour tout prompt COURSE** : voir §3.1.
- ✅ **Affûtage conditionnel** : conservé uniquement sur le prompt Course, retiré des autres → appliqué.
- ✅ **Blessure prioritaire sur toutes les semaines** (l'adaptation doit être documentée chaque semaine concernée, pas seulement en semaine 1) → appliqué.
- 🔲 **`max_tokens` dynamique** (~120-180 tk/séance) : base portée à 8 000, dimensionnement dynamique à finaliser côté code.
- 🔲 **Validation du volume avec tolérance ~12 %** : à implémenter côté code (le prompt garde « ≤ 10 % »).
- ℹ️ **`volume_hebdo_km` = indicateur de charge/niveau** (porte la progression +10 %), **pas** la somme comptable des `distance_km` : les deux peuvent diverger légitimement (ex. semaines de taper). À clarifier côté affichage.

**Axes de travail restants**

- **Validation + re-prompt automatique (priorité haute)** : calculer le volume hebdomadaire total
  côté backend après réception de la réponse, et si l'écart dépasse la tolérance retenue (~12 %)
  d'une semaine à l'autre, redemander une correction en précisant l'écart constaté.
- **Validation sémantique, pas seulement syntaxique** : au-delà d'un JSON Schema classique, ajouter
  des règles de cohérence métier ciblées (ex. une distance positive doit avoir une vitesse
  renseignée) avant d'afficher le plan à l'utilisateur.
- **Few-shot prompting** : fournir 1 à 2 exemples complets de plan bien formé dans chaque prompt
  spécialisé pour guider encore davantage le format et le ton des conseils.
- **Découpage en plusieurs appels** : générer semaine par semaine (au lieu de tout le plan en un
  seul appel) permettrait de resserrer la contrainte de progression à une seule transition par
  appel (volume S(n) vs S(n-1) réel), plutôt que de la faire tenir sur toute la durée du plan
  d'affilée.
- **Prise en compte du feedback en cours de plan** : ré-injecter le ressenti des séances déjà
  réalisées pour ajuster automatiquement la suite du plan (adaptatif plutôt que figé dès le
  départ).
- **Export agenda** : générer, en plus du JSON, un fichier `.ics` à partir du plan structuré, pour
  que l'utilisateur puisse l'importer directement dans son agenda personnel (piste évoquée dans
  les notes d'Antoine).
- **Trame de plan validée par un coach humain** : plutôt que de laisser le modèle concevoir
  entièrement la structure du plan (paliers de volume, pic de sortie longue, timing de
  l'affûtage), faire valider une trame par objectif/niveau par un vrai coach, et limiter le rôle
  du LLM à la personnalisation (dates, contraintes physiques, légers ajustements) — piste la plus
  structurante pour fiabiliser davantage le contenu produit, au prix d'un contenu à produire en
  amont avec des coachs et d'une perte de flexibilité totale du système.

## 8. Estimation du temps de développement (à affiner avec l'équipe)

| Lot | Contenu | Estimation |
|---|---|---|
| Backend proxy | Endpoint Sportsee qui reçoit le formulaire, calcule la faisabilité (objectif course), précalcule les dates, construit le prompt, appelle Mistral, valide et renvoie le JSON | à chiffrer |
| Frontend | Formulaire d'onboarding (saisie par options préenregistrées), appel à l'endpoint backend, état de chargement, affichage du plan | à chiffrer |
| Gestion des erreurs & rate limiting | Retry, quotas par utilisateur, messages d'erreur | à chiffrer |
| Validation du JSON (syntaxique + sémantique, cf. §7) | Schéma + règles métier (cohérence entre champs, progression du volume, tolérance) | à chiffrer |
| Tests & validation du schéma JSON | Tests automatisés sur le parsing et la conformité des réponses | à chiffrer |

> Les estimations chiffrées dépendent de la vélocité de l'équipe et seront précisées après
> découpage en tickets — cette synthèse pose le périmètre technique nécessaire pour le faire.

## 9. Conclusion

L'intégration est **techniquement faisable** avec l'API Mistral (`mistral-small-latest`), à un
coût raisonnable, en suivant une architecture backend-proxy pour la sécurité de la clé API. Sur la
campagne de validation de l'architecture retenue (5 runs, un par type de demande), le format de
réponse est fiable à 100 % (JSON valide et conforme au schéma), les dates injectées sont
respectées à 100 %, et plus aucune dérive d'un objectif vers un autre (ex. `perte_poids` qui
ressemblerait à une préparation de course) n'est observée.

Le principal risque restant n'est pas technique mais lié à la **fiabilité fine du contenu
généré** : la progression de volume reste sujette à de légers dépassements ponctuels (dans la
tolérance retenue de ~12 %), et un LLM ne garantit jamais une reproductibilité stricte. Ce point,
qui touche directement à la **responsabilité vis-à-vis de la santé des utilisateurs**, justifie de
présenter tout plan généré comme une suggestion à valider, avec une validation applicative
systématique (syntaxique et sémantique, cf. §4 et §7) avant affichage, et une possibilité de
régénération facile pour l'utilisateur.

L'architecture retenue tire les conséquences directes des tests menés : **plusieurs prompts
spécialisés** (un par type de demande, intégrant le temps disponible), un **routing déterministe
côté code** vers le bon prompt (avec rétrogradation de l'objectif si le délai est trop court, cf.
§3.1), le **précalcul des dates** hors du modèle, et une **saisie utilisateur par options
préenregistrées** (pas de texte libre, sauf pour les contraintes physiques). Le rôle du LLM est
ainsi recentré sur ce qu'il fait bien — habiller de contenu sportif et nutritionnel une ossature
déjà chiffrée et validée — plutôt que sur des calculs déterministes ou des arbitrages de
faisabilité qu'il exécute mal.

---

## Annexe A — Campagne de tests du prototype initial (prompt unique, historique)

> Conservée à titre de traçabilité : c'est cette campagne qui a motivé le passage à l'architecture
> multi-prompts décrite dans le corps du document. Elle n'a plus d'implication directe sur
> l'architecture retenue.

Chacune des 4 requêtes de génération (course, perte_poids, endurance, forme_generale), construites
à partir d'un **unique prompt système à branches conditionnelles** (une seule instruction couvrant
les 4 objectifs), a été exécutée **3 fois** avec les mêmes données d'entrée, afin de vérifier si
les écarts constatés étaient des incidents isolés ou une tendance reproductible du modèle. Profil
type utilisé pour tous les runs : 32 ans, genou sensible, 3 séances/semaine
(lundi/mercredi/samedi), objectif hebdomadaire actuel 15 km/semaine, plans de 6 semaines fixes.

**Résultat technique commun aux 12 runs** : statut `200`, JSON syntaxiquement valide dans tous les
cas, structure conforme au schéma demandé (clés, types). `max_tokens: 4000` s'est révélé
suffisant pour ce format de plan (aucune réponse tronquée).

### A.1 — Tableau récapitulatif (12 runs)

| Objectif | Progression respectée (± ~10%/sem.) | Contrainte genou | Défaut le plus grave observé |
|---|---|---|---|
| Course | 0 / 3 runs | Inconstante | Séance "simulation" 18 km à allure quasi-course, un mercredi, sans adaptation genou |
| Perte de poids | 2 / 3 runs | Bonne (run 2 exemplaire) | `vitesse_cible` chronométrée + fractionné, malgré la règle "pas de contrainte de temps" |
| Endurance | 1 / 3 runs | Inconstante | Date invalide (`"2026-027"`) ; objectif qualitatif parfois ignoré ou inversé |
| Forme générale | 0 / 3 runs | Inconstante (1 run exemplaire) | Incohérence `vitesse_cible: "N/A"` avec `distance_km > 0` |

### A.2 — Enseignements ayant motivé le changement d'architecture

- **Aucun objectif n'a obtenu 3 runs sur 3 conformes** à la règle de progression du volume
  hebdomadaire (max ~10 %/semaine) ; le meilleur score était 2/3 (perte de poids). Analyse : le
  vrai facteur d'incohérence n'était pas la formulation du prompt mais un **conflit de
  faisabilité non détecté** — ex. préparer un semi-marathon en 6 semaines depuis 15 km/semaine est
  arithmétiquement incompatible avec la règle des +10 %/semaine, ce qui poussait le modèle à
  gonfler le volume dès la semaine 1 pour compenser. → a directement motivé l'algorithme de
  faisabilité (§3.1).
- **Application inconstante des règles spécifiques par objectif** dans un prompt unique à branches
  (ex. `vitesse_cible` chronométrée générée sur `perte_poids` malgré la consigne explicite
  contraire, alors que la règle commune de format était bien respectée). → a directement motivé le
  passage à des prompts spécialisés, un par objectif (§2, [03-Conception-Prompts.md](./03-Conception-Prompts.md)).
- **Une date au format invalide** (`"2026-027"` au lieu de `"2026-06-27"`) a été produite lorsque
  le modèle devait lui-même calculer 18 dates de séances à partir de `dateDebut` et `joursDispo`.
  → a directement motivé le précalcul des dates côté backend.
- **Contrainte physique appliquée de façon inconstante** d'un run à l'autre avec les mêmes données
  d'entrée (protection systématique sur 6 semaines dans un run, quasi absente dans un autre pour
  le même profil). → a motivé la règle "adaptation à documenter chaque semaine concernée", pas
  seulement en ouverture de plan.

Le détail run par run (tableaux complets par objectif, extraits de réponses) a été retiré de cette
version pour rester lisible ; il reste disponible dans l'historique du document si nécessaire.
