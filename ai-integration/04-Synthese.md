# Étape 4 — Synthèse : faisabilité de l'intégration IA (Sportsee × Mistral)

Document destiné à Charles (Product Owner), en vue de la présentation aux fondatrices.
Objectif : évaluer la faisabilité d'une fonctionnalité de plan d'entraînement personnalisé
généré par IA, sur la base de l'architecture retenue pour l'API Mistral.

> Statut à date : la conception (requêtes, prompts, formatage des données, vérification de
> faisabilité) est terminée et validée par deux campagnes de tests dédiées. L'architecture retenue
> repose sur **deux mécanismes distincts** : une **architecture multi-prompts** pour la génération
> du plan (un prompt spécialisé par type de demande, dates précalculées côté code) et des
> **agents LLM avec exécution de code réelle** (`code_interpreter`) pour la vérification de
> faisabilité — détaillés dans [03-Conception-Prompts.md](./03-Conception-Prompts.md). Deux
> prototypes antérieurs ont été écartés et sont conservés à titre de traçabilité : un prompt
> système unique à branches conditionnelles pour la génération (Annexe A), et une vérification de
> faisabilité "pensée" par le LLM sans exécution de code réelle (Annexe B) — chacun a mis en
> évidence des limites qui ont directement motivé l'architecture retenue.

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
| Faisabilité (tous objectifs) | Calculée par un **agent LLM dédié par type d'objectif, avec exécution de code réelle** (`code_interpreter`, API Agents/Conversations) — pas un algorithme métier côté application | Décision produit : le LLM porte l'intégralité de la logique métier (bandes de volume, planchers, limites de sécurité). L'exécution de code réelle élimine la quasi-totalité des erreurs de calcul observées sur une première approche sans code — voir §3.1 et Annexe B |
| Garde-fou backend résiduel | Interception des entrées **dégénérées** uniquement (ex. volume de référence ≤ 0), avant l'appel à l'agent | Pas un jugement métier : ces entrées provoquent des réponses instables côté API sur un cas de toute façon trivial mathématiquement — voir §3.1 |
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

### 3.1 — Vérification de faisabilité : agents LLM avec exécution de code réelle

**Décision produit et changement d'architecture en cours de conception.** La première piste
envisagée était un algorithme métier déterministe côté code applicatif (calcul de seuils en dur
dans le backend). Cette piste a été **écartée** : la décision retenue est que le LLM doit porter
l'intégralité de la logique de faisabilité (seuils, bandes de volume, planchers), pour ne pas
dupliquer une logique métier amenée à évoluer (nouveaux barèmes, nouvelles distances) dans du code
applicatif nécessitant un redéploiement à chaque ajustement. Le détail des tests ayant validé (et
corrigé) cette approche est en Annexe B ; seul le résultat et l'architecture retenue sont résumés
ici.

**Architecture : un agent Mistral par type d'objectif, doté de l'outil `code_interpreter`.**

- **4 agents** sont créés une fois (`course`, `perte_poids`, `endurance`, `forme_generale`), avec
  toutes les règles métier codées dans leurs instructions (voir
  [03-Conception-Prompts.md](./03-Conception-Prompts.md) §10 pour le détail de conception).
- **Règle de conception centrale, issue directement des tests (Annexe B)** : chaque agent doit
  **écrire et exécuter du code Python** pour tout calcul numérique, jamais "penser" un calcul en
  langage naturel dans le corps de sa réponse. Une première approche sans exécution de code réelle
  (calcul énoncé dans le texte de réponse d'un simple appel `chat/completions`) s'est montrée
  significativement moins fiable — voir Annexe B pour le détail des erreurs observées et la
  comparaison directe entre les deux approches sur des cas identiques.
- Chaque type d'objectif a ses propres règles métier (validées par recherche documentaire côté
  coaching, à faire valider in fine par un coach sportif qualifié, au même titre que le contenu des
  prompts de génération) :
  - **Course** : bandes de volume de pointe par distance (10 km / semi-marathon / marathon) et par
    niveau (débutant / intermédiaire / confirmé, déduit du volume et du temps de course actuels),
    règle de progression ≤ 10 %/semaine, plancher d'expérience coach (indépendant du calcul de
    volume, informatif — voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) §10 point 5).
  - **Perte de poids** : limites de sécurité combinées (≤ 1 kg/semaine **et** ≤ 1 % du poids
    corporel/semaine), avertissement médical au-delà de 15 % du poids actuel à perdre.
  - **Endurance** : même règle de progression ≤ 10 %/semaine que Course, appliquée à un volume
    cible librement choisi (pas de distance de course à préparer).
  - **Forme générale** : plancher fixe de 4 semaines (temps minimal d'adaptation), éventuellement
    complété par un calcul de progression si un volume cible est renseigné.
- Le verdict de chaque agent suit un schéma de sortie commun et minimal : `detail_calcul`
  (traçabilité du raisonnement), `semaines_minimum_recommandees`, `faisable` — dans cet ordre
  précis (voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) §10 point 4 pour la
  justification de cet ordre).

**Le seul garde-fou resté côté backend applicatif.** Un contrôle minimal intercepte les entrées
**dégénérées** (ex. `volume_reference_km ≤ 0`) avant l'appel à l'agent. Ce n'est **pas** un
jugement métier — ce cas n'a de toute façon qu'une seule réponse possible, mathématiquement
triviale — mais une mesure de robustesse : ces entrées ont provoqué, en test, des réponses vides ou
structurellement invalides de l'API elle-même (voir Annexe B), un problème de stabilité d'API
indépendant de la qualité du prompt.

Ce contrôle (agent + garde-fou d'entrée) est **obligatoire avant toute génération**, pour les 4
types d'objectifs (et pas seulement `course` comme dans une version antérieure de cette
architecture) : aucun plan n'est généré sans un verdict `faisable = true` en amont — soit parce que
l'objectif initial passe le test, soit parce qu'il a été ajusté (durée allongée, ou distance
revue) suite à un verdict `false`.

Il faut enfin souligner, comme pour l'ensemble du contenu métier de ce projet, que les seuils
utilisés (bandes de volume par distance/niveau, règle des +10 %/semaine, limites de perte de
poids) sont des **heuristiques de coaching**, sourcées par recherche documentaire mais pas des
règles médicales absolues — elles doivent être **validées par un coach sportif qualifié et/ou un
professionnel de santé** avant mise en production, au même titre que le contenu des prompts de
génération (voir [03-Conception-Prompts.md](./03-Conception-Prompts.md) §1).

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
- **Fiabilité de la vérification de faisabilité, même avec exécution de code réelle** :
  l'exécution de code (`code_interpreter`) élimine la quasi-totalité des erreurs d'arithmétique
  observées sur l'approche précédente, mais pas les erreurs de **logique** dans le code écrit par
  le modèle (un bug de comptage a été observé une fois sur plusieurs dizaines de tests, sans
  impact sur le verdict final dans ce cas précis, cf. Annexe B) : une couverture de test régulière
  reste nécessaire, un test unique réussi ne suffit pas à conclure à la fiabilité d'un cas.
- **Instabilité observée de l'API Conversations/`code_interpreter` sur des entrées dégénérées** :
  deux occurrences de réponse vide ou malformée sur le même type d'entrée limite (cf. Annexe B),
  distinctes de tout problème de prompt — justifie le garde-fou d'entrée décrit en §3.1.
- **Quota spécifique et restrictif sur `code_interpreter`** : en particulier en Free mode (mode par
  défaut du compte) — à surveiller/dimensionner avant un déploiement à l'échelle des utilisateurs
  Sportsee (voir [01-Comprehension-API-Mistral.md](./01-Comprehension-API-Mistral.md) §5).
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
- ✅ **Faisabilité = agent LLM avec exécution de code réelle** (`code_interpreter`), un par type
  d'objectif, PAS un algorithme métier côté application : `faisable` / `semaines_minimum_recommandees`
  sont calculés par du code Python réellement exécuté par l'agent, sur la base de règles métier
  entièrement portées par ses instructions. Seul un garde-fou minimal (entrées dégénérées) reste
  côté backend. Détail du fonctionnement et du caractère **🔴 obligatoire pour les 4 types
  d'objectif** : voir §3.1 et Annexe B.
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

L'intégration est **techniquement faisable** avec l'API Mistral, à un coût raisonnable, en suivant
une architecture backend-proxy pour la sécurité de la clé API. Sur la campagne de validation de la
génération du plan (5 runs, un par type de demande, `mistral-small-latest`), le format de réponse
est fiable à 100 % (JSON valide et conforme au schéma), les dates injectées sont respectées à
100 %, et plus aucune dérive d'un objectif vers un autre (ex. `perte_poids` qui ressemblerait à une
préparation de course) n'est observée.

Sur la vérification de faisabilité, la campagne de tests (Annexe B) a validé un changement
d'architecture important en cours de route : une première approche sans exécution de code réelle
s'est montrée nettement moins fiable qu'anticipé sur des calculs pourtant simples (erreurs
d'arithmétique, décisions finales décorrélées du raisonnement écrit, catégories inventées hors
périmètre) — un enseignement à retenir plus largement pour toute tâche de calcul confiée à un LLM
dans ce projet, pas seulement la faisabilité. Le passage à des agents dotés de `code_interpreter`
(exécution de code Python réelle plutôt qu'un calcul "pensé") a résolu la quasi-totalité de ces
erreurs, avec un mécanisme d'auto-correction observé à plusieurs reprises (le modèle corrige
lui-même une erreur d'exécution de code) qui constitue un vrai gain de fiabilité par rapport à
l'approche initiale.

Le principal risque restant n'est pas la fiabilité du calcul en tant que tel, mais deux points plus
fins : (1) une **couverture de test encore incomplète** (certaines distances et certains cas de
figure n'ont pas encore été testés de façon répétée, cf. Annexe B §5) et (2) une **variabilité
résiduelle**, y compris sur du code exécuté (un bug de logique de comptage a été trouvé une fois
sur plusieurs dizaines de tests, et l'API elle-même s'est montrée instable sur des entrées
dégénérées). Ce point, qui touche directement à la **responsabilité vis-à-vis de la santé des
utilisateurs** (un verdict de faisabilité erroné a le même impact potentiel qu'un plan mal
calibré), justifie une couverture de test régulière avant mise en production, plutôt qu'une
confiance acquise sur la base des tests déjà réalisés.

L'architecture retenue tire les conséquences directes des deux campagnes de tests menées :
**plusieurs prompts spécialisés** pour la génération (un par type de demande, intégrant le temps
disponible), des **agents LLM avec exécution de code réelle** pour la vérification de faisabilité
(un par type d'objectif, routée avant tout appel de génération, cf. §3.1), le **précalcul des
dates** hors du modèle, un **garde-fou minimal côté backend** limité aux entrées dégénérées (pas
aux seuils métier, qui restent portés par le LLM), et une **saisie utilisateur par options
préenregistrées** (pas de texte libre, sauf pour les contraintes physiques). Le rôle du LLM est
ainsi recentré sur deux tâches bien distinctes et bien exécutées : habiller de contenu sportif et
nutritionnel une ossature déjà cadrée (génération), et calculer par code réel des seuils de
faisabilité selon des règles métier qu'il porte lui-même (vérification) — plutôt que de mélanger
raisonnement métier et arithmétique dans un unique calcul "pensé" en langage naturel, qui s'est
révélé être le point de fragilité principal des deux prototypes écartés (Annexes A et B).

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

---

## Annexe B — Campagne de tests : vérification de faisabilité (LLM + Code Interpreter)

> Cette annexe documente le cheminement complet ayant mené à l'architecture de vérification
> retenue (§3.1) : une première approche sans exécution de code réelle, ses limites précises, la
> décision de bascule vers `code_interpreter`, puis les tests réalisés objectif par objectif sur
> la nouvelle approche — succès comme échecs, ces derniers étant tout aussi instructifs pour la
> suite du projet.

### B.1 — Phase 1 : vérification "pensée" par le LLM, sans exécution de code (écartée)

Une première version des 4 agents de vérification a été testée via un simple appel
`/v1/chat/completions` (`mistral-small-latest` puis `mistral-large-latest`), sans outil
`code_interpreter` : le modèle devait calculer un nombre de semaines minimum et un verdict
`faisable` en énonçant son calcul en langage naturel dans le corps de sa réponse JSON.

**Bugs identifiés, par ordre de découverte :**

| # | Bug observé | Exemple concret | Cause |
|---|---|---|---|
| 1 | Coefficients de volume de pointe irréalistes pour le marathon | Coefficient ×3 à ×4 de la distance → volume de pointe visé de 127 à 169 km/semaine (niveau ultra-élite) | Mauvaise hypothèse initiale (multiplicateur de distance au lieu de plages absolues sourcées par recherche) |
| 2 | Décision finale décorrélée du raisonnement écrit | `detail_calcul` concluait littéralement "90 est supérieur ou égal à 16 donc faisable=true", mais le champ `faisable` renvoyé était `false` | Le champ `faisable` était placé en **premier** dans le schéma JSON demandé : le modèle devait committer au booléen avant d'avoir écrit son raisonnement |
| 3 | Copie littérale d'un placeholder de formatage | Le modèle a recopié `[OUI/NON]` tel quel au lieu de choisir OUI ou NON | Consigne de formatage utilisant des crochets comme exemple, interprétés littéralement par le modèle |
| 4 | Erreur de comparaison au cas d'égalité | `duree_semaines = semaines_minimum` traité comme `faisable = false` alors que l'égalité doit compter comme faisable | Ambiguïté résiduelle malgré une instruction explicite sur ce cas |
| 5 | Erreurs de calcul sur la formule logarithmique | Une exécution a produit "78 semaines" au lieu de "16" sur des données strictement identiques à un run précédent correct (double division au lieu d'un simple `CEIL`) | Le calcul d'un logarithme "de tête" par un LLM est intrinsèquement plus sujet à erreur qu'une suite d'opérations simples |
| 6 | Invention d'une catégorie hors périmètre | Une distance cible non standard ("55", sans unité claire) a conduit le modèle à inventer une bande de volume "ultra débutant" et un plancher, non définis dans les instructions | Absence de garde-fou explicite sur les distances reconnues |

**Taux d'erreur mesuré** : sur une série de 5 exécutions identiques (même cas Course, semi-marathon
débutant), 1 hallucination franche (bug #5, "74 semaines" puis "78 semaines" selon le run) et 1
écart de ±1 semaine, soit un taux d'anomalie de l'ordre de 40 % sur ce petit échantillon — jugé
totalement incompatible avec un verdict de faisabilité impactant la santé des utilisateurs.

**Décision** : abandon de cette approche, passage à des agents dotés de `code_interpreter` pour que
le calcul soit **exécuté**, pas **énoncé**.

### B.2 — Phase 2 : agents avec `code_interpreter` — résultats par objectif

Architecture testée : un agent par `type_objectif` (`POST /v1/agents`, `mistral-large-latest`,
`completion_args.temperature: 0`, `tools: [{"type": "code_interpreter"}]`), vérifié via
`POST /v1/conversations`.

**Course** — le plus testé, terrain d'apprentissage principal de la nouvelle approche :

| Test | Données | Résultat |
|---|---|---|
| Cohérence rejetée à raison | 15 km/sem, 150 min → allure 6 km/h (valide) puis 10 km/70 min → 8.57 km/h (valide) puis 10km/150min → 4km/h (rejeté, sous le seuil de 5 km/h) | ✅ conforme |
| Calcul correct (semi, débutant) | 15 km/sem, cible 30 km/sem → 9 semaines + affûtage + plancher = 16 semaines | ✅ conforme après plusieurs itérations de correction (voir bugs ci-dessous) |
| Distance hors périmètre | `distance_cible = "55"` | ✅ rejeté explicitement après ajout du garde-fou de validation de distance (bug #6 de la Phase 1, reproduit une fois avant correction) |
| Comptage "décalé d'un cran" | Boucle de progression comptant 12 semaines au lieu de 13 (valeur finale ajoutée hors boucle sans incrémenter le compteur) | 🔴 bug trouvé une fois, **sans impact sur le verdict final dans ce cas précis** (le plancher d'expérience dominait de toute façon) — corrigé via un pseudo-code de comptage non ambigu |
| Auto-correction sur erreur d'exécution | `AttributeError` ('float' object has no attribute 'get') puis code corrigé et réexécuté avec succès par le modèle lui-même, sans intervention | ✅ comportement observé à plusieurs reprises, illustre l'avantage principal de cette approche |
| Enveloppe Markdown intermittente | Réponse finale parfois entourée de ` ```json `, malgré une instruction explicite contraire | 🟡 comportement probabiliste non éliminé par le prompt — nécessite un nettoyage défensif côté code appelant |

**Perte de poids** — 4 tests réalisés, tous corrects :
- Bascule kg → % et % → kg vérifiée dans les deux sens (80 kg / -6 kg → contrainte % dominante à
  8 semaines ; 120 kg / -10 kg → contrainte kg dominante à 10 semaines).
- Cas d'égalité (`duree_semaines = semaines_minimum_recommandees`) correctement traité comme
  faisable.
- Cas de rejet (`10 kg en 5 semaines` = 2 kg/semaine, le double de la limite) correctement rejeté.

**Endurance** — 3 tests réalisés, tous corrects : cas faisable, cas non faisable, cas incohérent
(allure implicite de 100 km/h correctement rejetée après trois tentatives de code par le modèle,
dont deux ayant échoué avec des erreurs Python réelles avant correction).

**Forme générale** — 2 tests réussis (plancher fixe seul ; plancher combiné à un calcul de
progression), et une découverte importante sur un cas dégénéré :

- **Risque de boucle infinie identifié** : si le volume de référence est nul, la boucle de
  progression (`valeur *= 1.10`) ne se termine jamais (`0 × 1.10 = 0` indéfiniment). Un garde-fou
  explicite anti-boucle-infinie a été ajouté aux instructions des agents Endurance et Forme
  générale suite à cette découverte.
- **Deux échecs d'API distincts sur la même entrée dégénérée** (`volume_reference_km = 0` et un
  second champ numérique nul simultanément) : une fois une entrée de réponse structurellement
  invalide (nom de fonction contenant un fragment de code brut), une fois une réponse
  complètement vide (`outputs: []`) malgré une consommation de tokens réelle. Aucune de ces deux
  défaillances n'est un bug de prompt corrigible par reformulation — elles ont directement motivé
  le garde-fou d'entrée côté backend (§3.1), plutôt que de chercher à fiabiliser le prompt face à
  un cas que l'application peut de toute façon écarter en amont.

### B.3 — Enseignements transversaux

1. **L'exécution de code réelle change la nature des erreurs, pas leur possibilité totale.** Les
   erreurs d'arithmétique pure (Phase 1) ont quasiment disparu ; il reste des erreurs de
   **logique** dans le code écrit par le modèle (le bug de comptage décalé), plus rares mais pas
   nulles. Une couverture de test régulière reste nécessaire, y compris sur cette architecture plus
   fiable.
2. **L'auto-correction sur erreur d'exécution est un vrai gain, observé à plusieurs reprises** : une
   exception Python réelle (`SyntaxError`, `NameError`, `AttributeError`) est vue par le modèle, qui
   corrige et réexécute son code — contrairement à une hallucination silencieuse en Phase 1, qui ne
   se signale jamais d'elle-même.
3. **L'ordre des champs du schéma JSON demandé a un impact réel sur la fiabilité de la décision** :
   placer le booléen `faisable` en dernier (après le raisonnement) plutôt qu'en premier a
   directement résolu le bug #2 de la Phase 1.
4. **`code_interpreter` a ses propres limites d'infrastructure**, indépendantes de la qualité du
   prompt : quota séparé et restrictif (particulièrement en Free mode), et instabilité observée sur
   des entrées dégénérées (réponses vides/malformées). Ces limites justifient un garde-fou
   d'entrée minimal côté backend, distinct d'un garde-fou métier.

### B.4 — Couverture de test restante (à date de ce document)

- **10 km n'a pas encore été testé** avec la nouvelle architecture (`code_interpreter`) — tous les
  tests Course ont porté sur semi-marathon et marathon.
- **Aucune suite de tests automatisée** : l'ensemble des tests décrits ci-dessus a été réalisé
  manuellement, cas par cas, via Postman. Une non-régression n'est pas garantie si les instructions
  des agents sont retouchées après la rédaction de ce document.
- **Taux d'erreur mesuré uniquement sur Course** (5 runs répétés) : les 3 autres objectifs n'ont
  été testés qu'une seule fois par scénario — un taux d'erreur comparable à celui mesuré sur Course
  ne peut pas être exclu tant qu'une répétition similaire n'a pas été faite.
- **Cas non testés** : déclenchement effectif de l'avertissement médical (perte de poids > 15 % du
  poids actuel), valeurs de `blessure` autres que "aucune", variation du champ `genre`.

**Recommandation avant mise en production** : combler ces trois manques (10 km, répétitions par
objectif, suite automatisée) avant de considérer la vérification de faisabilité comme validée au
même niveau que la génération du plan (§3).
