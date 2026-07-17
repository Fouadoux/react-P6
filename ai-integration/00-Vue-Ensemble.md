# Intégration IA : Plans d'entraînement Sportsee (Vue d'ensemble)

> Document unique et autoportant couvrant l'ensemble de la pré-conception (compréhension de
> l'API, structure des requêtes, conception des prompts, campagnes de tests). Le corps du document
> (§1 à §12) donne la vue d'ensemble et les résultats chiffrés ; les Annexes A à E, en fin de
> document, donnent le détail exhaustif (tests run par run, exemples de prompts et de requêtes,
> gestion des erreurs, sécurité) pour qui veut aller plus loin sur un point précis.
>
> **Statut** : conception terminée, validée par deux campagnes de tests et une revue avec le
> mentor produit. Prêt pour développement, sous réserve des points listés en §12.

## 1. Le besoin

Sportsee veut proposer des **plans d'entraînement personnalisés générés par IA**, à partir du
profil et de l'historique du coureur (`UserProfile`, `UserActivity`). La durée du plan n'est pas
fixe : elle dépend de l'objectif (course à échéance donnée, perte de poids, endurance, forme
générale) et doit être vérifiée avant génération, pas simplement saisie par l'utilisateur.

## 2. Architecture retenue

Deux mécanismes distincts, deux familles d'endpoints Mistral :

| | **Génération du plan** | **Vérification de faisabilité** |
|---|---|---|
| Endpoint | `POST /v1/chat/completions` | `POST /v1/agents` (setup, 1 fois) + `POST /v1/conversations` (par vérification) |
| Modèle | `mistral-small-latest` (~128k tokens de contexte) | `mistral-large-latest` |
| `temperature` | `0.2` | `0` (`completion_args.temperature`) |
| `response_format` | `{"type": "json_object"}` | non structuré nativement, parsing défensif requis (§8) |
| Structure | 1 prompt spécialisé par `type_objectif` (4 prompts, + variantes Course par distance) | 1 agent par `type_objectif` (4 agents), avec l'outil `tools: [{"type": "code_interpreter"}]` |
| Rôle du LLM | Habiller de contenu sportif/nutritionnel une structure déjà cadrée (dates, durée, contraintes) | Calculer, **par exécution réelle de code Python**, si l'objectif est atteignable et en combien de temps minimum |
| Logique métier | Contenu pédagogique (conseils, adaptation aux contraintes) | Seuils, bandes de volume, règle de progression, limites de sécurité : **tout porté par le LLM**, aucun algorithme métier côté backend |
| Sortie | JSON structuré du plan complet | JSON allégé à 3 champs : `semaines_recommandees_coach`, `semaines_minimum`, `faisable` |
| Coût mesuré | 1 436 à 4 907 tokens/run selon densité du plan (§7) | ~1 150 à ~3 400 tokens/vérification selon le nombre de tentatives de code (§8) |

**Principe directeur commun aux deux** : le LLM ne doit jamais faire un calcul numérique
déterminant "de tête" : les dates sont précalculées côté code pour la génération ; pour la
vérification, le calcul est délégué à du **code Python réellement exécuté**, pas à un raisonnement
énoncé en langage naturel. C'est l'enseignement le plus important des deux campagnes de tests
(§7, §8) : sur un même cas testé plusieurs fois, un LLM qui "pense" un calcul en langage naturel a
montré ~40 % d'anomalies, contre une fiabilité arithmétique quasi totale une fois le calcul délégué
à du code exécuté.

**Le seul garde-fou côté backend applicatif** : interception des entrées mathématiquement
dégénérées (ex. `volume_reference_km ≤ 0`) avant d'appeler l'agent de vérification, pas un
jugement métier (ce cas n'a de toute façon qu'une réponse triviale), mais une protection contre une
instabilité d'API observée précisément sur ce type d'entrée (réponses vides ou malformées, cf. §8).

## 3. Données envoyées à l'API

**Déjà disponibles dans l'app**, sans rien à construire : `age`, `gender`, `weight`, `height`
(`UserProfile`) ; `totalDistance`, `totalSessions`, `totalDuration`, `weeklyGoal` ; historique de
séances (`date`, `distance`, `duration`, `heartRate.min/max/average`, `caloriesBurned` depuis
`UserActivity`). Seules les 4 dernières semaines de séances sont envoyées (au-delà, apport marginal
pour la personnalisation, et ça évite de gonfler les tokens).

**À collecter via un nouveau formulaire** (à trancher avec Charles : formulaire dédié ou champs
ajoutés au profil existant), par **options préenregistrées**, pas de texte libre (sauf
`contraintes`) :

| Champ (socle commun) | Type | Exemple |
|---|---|---|
| `type_objectif` | select : course / perte_poids / endurance / forme_generale | `"course"` |
| `joursDispo` | multi-select | `["lundi", "mercredi", "samedi"]` |
| `momentPrefere` | select | `"matin"` |
| `dureeSeance` | select (paliers, min) | `60` |
| `contraintes` | texte libre guidé (limite de caractères) | `"genou sensible"` |
| `conseilsNutrition` | bool | `true` |
| `dateDebut` | date | `"2026-06-22"` |

Champs spécifiques par `type_objectif` : distance + temps cible + date de course (course) ; poids
actuel/visé en kg (perte de poids) ; palier de durée sans s'arrêter (endurance) ; durée du plan en
semaines seule (forme générale, pas de champ supplémentaire).

La `duree_semaines` n'est **jamais** prise telle quelle : elle passe systématiquement par l'agent
de vérification correspondant avant tout appel de génération. Si `faisable = false`, l'application
propose `semaines_minimum` comme durée alternative plutôt que d'appeler le prompt de génération.
Détail complet : Annexe D.

## 4. Intégration

La fonctionnalité est intégrée sur **une nouvelle page dédiée**, plutôt que sur des champs ajoutés
à l'écran de profil existant : le parcours de génération d'un plan (choix de l'objectif, saisie des
paramètres, vérification de faisabilité, affichage du plan) est suffisamment distinct du reste de
l'application pour justifier son propre espace, plutôt que de surcharger une page déjà existante.

**Principe de saisie, appliqué à tout le formulaire** : à l'exception d'un seul champ, **tous les
champs sont des formulaires à sélection préenregistrée** (`select`, `multi-select`, ou équivalent :
boutons à choix unique, cases à cocher, sliders à paliers selon le champ), jamais de texte libre
dicté par l'utilisateur. C'est un choix délibéré, pas seulement ergonomique : chaque champ qui sert
au routing vers un prompt (`type_objectif`), à un calcul de faisabilité (`volume_reference_km`,
`duree_semaines`, `poids_a_perdre_kg`...) ou à une contrainte métier précise (distance, jours,
durée de séance) doit être une valeur normalisée et non ambiguë pour que l'agent de vérification et
le prompt de génération puissent l'exploiter de façon fiable.

**Le seul champ en texte libre est celui des contraintes/blessures** (`contraintes`, transmis comme
`blessure` aux agents de vérification). Une gêne ou une blessure ne se prête pas à une liste
fermée : la diversité des formulations possibles ("genou sensible", "tendinite au tendon
d'Achille depuis 3 semaines", "essoufflement à l'effort"...) est trop large pour être couverte par
des options préenregistrées sans perdre de l'information utile à la personnalisation du plan. Ce
champ reste donc un texte libre guidé (avec une limite de caractères), le seul point d'entrée non
structuré de tout le formulaire.

Concrètement, pour chaque champ du socle commun et des champs spécifiques par `type_objectif`
(§3) : `type_objectif`, `joursDispo`, `momentPrefere`, `dureeSeance`, `conseilsNutrition`,
`dateDebut`, `distance_course`, `temps_cible`, `dateCourse`, `poids_actuel`, `poids_vise`,
`objectif_endurance`, `dureePlan` sont tous des champs à sélection. Seul `contraintes` est un champ
de saisie libre.

## 5. Génération du plan : principes et schéma de sortie

- **Un prompt par `type_objectif`** plutôt qu'un prompt unique à branches conditionnelles : le
  prototype à prompt unique testé initialement souffrait d'une dérive systématique (voir Annexe A ci-dessous).
- **Dates de séances précalculées côté code**, jamais laissées au modèle : **100 % de fiabilité**
  sur les 5 runs de validation (§7), contre des erreurs de calendrier récurrentes quand le modèle
  les calculait lui-même sur le prototype initial.
- **`max_tokens` dimensionné selon la densité du plan** (~120-180 tokens/séance) : un plan de
  10 semaines × 4 séances (40 séances) a tronqué la réponse à `max_tokens = 4000` → base portée à
  `8000`, idéalement calculée dynamiquement côté code selon `duree_semaines × séances/semaine`.
- **`volume_hebdo_km` est un indicateur de charge/niveau** (porte la progression ≤ 10 %/semaine),
  pas forcément la somme des `distance_km` de la semaine : les deux peuvent diverger légitimement
  (semaine d'affûtage).

Schéma de sortie (stable, identique quel que soit `type_objectif`) :
```json
{
  "objectif": "string",
  "duree_semaines": "number",
  "avertissement": "string",
  "semaines": [
    { "numero": 1, "objectif_semaine": "string", "volume_hebdo_km": 20,
      "sessions": [ { "date": "YYYY-MM-DD", "jour": "string", "type": "string",
                      "duree_min": 60, "distance_km": 8, "vitesse_cible": "string",
                      "adaptation_blessure": "string", "conseil_alimentation": "string" } ] }
  ]
}
```

Le contenu métier (conseils, constantes de progression) doit être **validé par un coach sportif
qualifié** avant mise en production ; chaque plan renvoyé doit porter un `avertissement` explicite
("suggestion générée par IA", pas une prescription médicale). Détail des 4 prompts, exemples
complets : Annexe C.

## 6. Vérification de faisabilité : règles métier et principes de conception

Un agent Mistral par `type_objectif`, créé une fois (`POST /v1/agents`), réutilisé pour chaque
vérification (`POST /v1/conversations` avec l'`agent_id`). Règles métier codées dans les
instructions de chaque agent :

| Objectif | Règle de faisabilité |
|---|---|
| **Course** | Bande de volume de pointe visé selon distance × niveau : 10 km → 20-24-28 km/sem (débutant/intermédiaire/confirmé) ; semi-marathon → 30-40-50 km/sem ; marathon → 35-50-65 km/sem. Niveau déduit de `volume_reference_km` (<20 / 20-40 / ≥40) et du temps de course hebdo (<120 / 120-240 / ≥240 min). Progression ≤ 10 %/semaine (boucle itérative). Plancher d'expérience coach, **indépendant du calcul**, variant selon volume de départ (semi : 18/16/10 sem ; marathon : 24/20/14 sem, toujours supérieur au semi pour la même tranche). |
| **Perte de poids** | `rythme_kg_semaine ≤ 1.0` **et** `rythme_pct_semaine ≤ 1.0` (les deux contraintes combinées, la plus stricte des deux l'emporte). Avertissement médical si objectif > 15 % du poids actuel. |
| **Endurance** | Même progression ≤ 10 %/semaine que Course, appliquée à un `volume_cible_km` librement choisi (pas de distance de course, pas de plancher coach). |
| **Forme générale** | Plancher fixe de 4 semaines, combiné à un calcul de progression si un `volume_cible_km` est renseigné. |

**Cohérence des données** (Course, et en garde-fou optionnel sur les 3 autres) : allure implicite
`volume_reference_km / (temps_minutes/60)` doit rester dans `[5 ; 18] km/h`, sans quoi la
vérification est rejetée avant tout calcul de faisabilité.

**Principes de conception issus des tests** (détail : Annexe B) :
1. Calcul toujours **exécuté** en Python (`code_interpreter`), jamais énoncé en langage naturel.
2. Progression par **boucle itérative** (`while valeur < cible: valeur *= 1.10`), pas par formule
   logarithmique : un calcul de logarithme "de tête" s'est montré nettement plus sujet à erreur.
3. Garde-fou explicite anti-boucle-infinie si le volume de départ est nul (`0 × 1.10 = 0`
   indéfiniment sinon).
4. Le champ `faisable` doit être **calculé et écrit en dernier**, après le reste du calcul. Placer un
   booléen de décision en premier dans le schéma de sortie a provoqué des décisions décorrélées du
   calcul énoncé juste après.
5. Validation explicite du périmètre d'entrée (distance non reconnue → rejet explicite plutôt que
   d'inventer une nouvelle catégorie de volume non validée).
6. **Le code applicatif ne lit jamais la réponse en langage naturel de l'agent** (`message.output`),
   uniquement `tool.execution.info.code_output` (résultat brut de l'exécution), avec tolérance de
   format (JSON strict **ou** représentation Python `{'clé': valeur}` avec guillemets simples et
   `True`/`False`). Une réponse en langage naturel peut correctement énoncer un calcul et se
   tromper en le retranscrivant : seul le résultat réellement exécuté fait foi.

Sortie finale (3 champs seulement, allégée après revue avec le mentor produit) :
```json
{ "semaines_recommandees_coach": 20, "semaines_minimum": 16, "faisable": false }
```
Pour Course, les deux premiers champs sont deux valeurs distinctes (calcul vs. recommandation coach
indépendante). Pour les 3 autres objectifs, qui n'ont pas cette distinction métier, les deux champs
renvoient intentionnellement la même valeur calculée.

## 7. Résultats de tests : génération du plan

> Campagne de validation du 08/07/2026, `mistral-small-latest`, 5 runs valides retenus (des
> tentatives non conformes en amont (volume de référence incohérent, `max_tokens` trop bas) ont
> été écartées après correction des paramètres d'entrée).

| # | Objectif | Durée | Séances/sem | Volume réf. | Blessure | Tokens |
|---|---|---|---|---|---|---|
| 01 | Course (semi-marathon) | 12 sem | 3 | 20 km | n/a | 4 842 |
| 02 | Course (10 km) | 8 sem | 3 | 24 km | genou sensible | 4 327 |
| 03 | Perte de poids | 6 sem | 3 | 8 km | douleurs lombaires | 3 186 |
| 04 | Endurance | 10 sem | 4 | 25 km | n/a | 4 907 |
| 05 | Forme générale | 4 sem | 2 | 6 km | cheville fragile | 1 436 |

Résultats : **JSON valide et complet sur 5/5**, **dates conformes sur 5/5**, **aucune dérive
d'objectif sur 5/5** (`perte_poids` et `forme_generale` ne ressemblent plus à une préparation de
course), adaptation à la blessure correcte sur les 3 runs concernés. Progression de volume ≤ 10 %
respectée sur 5/5, avec des dépassements ponctuels ≤ ~1,5 point de % sur 3 runs, jugés dans la
tolérance retenue (~12 %, la règle des 10 % étant une heuristique et non un seuil médical).

## 8. Résultats de tests : vérification de faisabilité

Deux approches comparées, avant et après un changement d'architecture décidé en cours de
conception (§6) :

| | Sans exécution de code (écarté) | Avec `code_interpreter` (retenu) |
|---|---|---|
| Fiabilité arithmétique | **~40 % d'anomalie sur 5 runs identiques** (formule logarithmique erronée : une exécution a donné 78 semaines au lieu de 16 sur des données strictement identiques à un run correct) | Erreurs d'arithmétique quasi éliminées sur l'ensemble des tests |
| Décision finale | Un `detail_calcul` a conclu littéralement "90 ≥ 16 donc faisable=true", mais le champ `faisable` renvoyé était `false` (placé en premier dans le schéma, décidé avant le raisonnement) | Résolu en plaçant `faisable` en dernier champ du schéma |
| Périmètre d'entrée | Une distance non standard ("55") a fait inventer au modèle une catégorie "ultra débutant" et ses seuils, non définis dans les instructions | Rejet explicite ajouté et validé |
| Auto-correction | Aucune, une erreur ne se signale jamais d'elle-même | Observée à plusieurs reprises : `AttributeError`, `NameError`, `SyntaxError` réels vus et corrigés par le modèle lui-même avant de renvoyer un résultat correct |
| Limites résiduelles | n/a | Un bug de comptage "décalé d'un cran" trouvé 1 fois (sans impact sur le verdict final dans ce cas, le plancher dominait) ; une retranscription erronée en langage naturel malgré un calcul juste (`code_output` correct à 20, `message.output` annonçant 24) ; 2 occurrences de réponse vide/malformée de l'API sur une entrée doublement dégénérée (`volume_reference_km = 0` et un second champ nul simultanément) |
| Quota | n/a | `code_interpreter` a un quota **séparé et plus restrictif** que les limites générales de l'API, en particulier en **Free mode** (mode par défaut du compte). Rate limit atteint plusieurs fois pendant les tests |

**Sur les coûts** : la simplification du schéma de sortie (retrait de `detail_calcul` et des champs
de debug) et le choix du modèle (`mistral-small-latest` vs `mistral-large-latest`) n'ont **pas**
réduit la consommation de tokens. Comparaison mesurée sur des cas Course équivalents :

| Version testée | `completion_tokens` |
|---|---|
| Schéma verbeux (avec `detail_calcul`) | ~350-530 |
| Schéma allégé, `mistral-large-latest` | ~1150-1200 |
| Schéma allégé, `mistral-small-latest` | ~1150 |

Le coût réel est piloté par la **longueur du code Python que l'agent doit réécrire intégralement à
chaque appel** (aucune mémoire de code entre deux conversations ; toutes les règles métier,
bandes de volume, paliers coach, garde-fous, sont réécrites à chaque fois), pas par le format de
sortie demandé ni par le modèle. `connector_tokens` (coût spécifique de l'exécution du code, hors
rédaction) reste stable et marginal (~30) sur tous les tests.

**Couverture de test restante avant mise en production** : aucune suite de tests automatisée
n'existe (tout a été fait manuellement via Postman) ; seule Course a été testée en série répétée
(5 runs identiques) pour mesurer un taux d'erreur. Les 3 autres objectifs n'ont été testés qu'une
fois par scénario, sans données de taux d'erreur comparables.

## 9. Limites et risques à retenir

- **Fiabilité du format, deux familles de défauts** : syntaxique (détectable par validation de
  schéma classique) et sémantique (JSON valide et conforme, mais logiquement incohérent, ex. une
  distance positive sans vitesse cible renseignée, non détectable par une validation de schéma
  standard, nécessite des règles métier dédiées).
- **Variabilité résiduelle, y compris sur du code exécuté** : un LLM reste probabiliste même à
  `temperature: 0`, un test unique réussi ne garantit pas la fiabilité d'un cas, une couverture de
  test régulière reste nécessaire.
- **Coût à l'échelle** : coût unitaire faible (~1 400 à ~4 900 tokens génération, ~1 150 à ~3 400
  tokens vérification) mais à chiffrer pour l'ensemble de la base utilisateurs Sportsee (nombre de
  générations/utilisateur, fréquence de régénération autorisée).
- **Latence** : plusieurs secondes par appel LLM, état de chargement explicite nécessaire
  (`Spinner.jsx` / `PageLoader.jsx` déjà existants), traitement asynchrone à envisager pour les cas
  les plus longs.
- **Dépendance à un service tiers** : disponibilité, coût, évolution des modèles Mistral échappent
  au contrôle de Sportsee. Clé API jamais exposée côté React : backend-proxy obligatoire, clé en
  variable d'environnement serveur uniquement.
- **Confidentialité** : données d'entraînement (assimilables à des données de santé) transmises à
  Mistral. N'envoyer que le strict nécessaire (pas de nom, email), informer l'utilisateur,
  vérifier la politique de rétention/entraînement de Mistral sur les requêtes.
- **Rate limiting spécifique à `code_interpreter`**, plus restrictif que les limites générales,
  en particulier en Free mode : à dimensionner avant un déploiement à l'échelle.
- **Impact santé** : un plan mal calibré ou un verdict de faisabilité erroné ont un impact réel sur
  l'utilisateur. Présentation systématique comme suggestion, pas prescription ; **co-rédaction et
  validation par un coach sportif qualifié** du contenu métier (constantes de progression, bandes
  de volume, limites de sécurité) avant mise en production ; avertissement explicite sur chaque
  plan ; possibilité de régénération facile pour l'utilisateur (nécessité fonctionnelle, pas un
  simple confort).
- **Biais potentiels** : modèle entraîné sur des données générales, pas spécifiquement sur la
  médecine du sport : conseils à présenter comme généralistes, pas personnalisés par un
  professionnel de santé.

## 10. Métriques de suivi une fois en production

| Métrique | Ce qu'elle mesure |
|---|---|
| Taux de JSON valide au premier essai | Fiabilité technique du format |
| Taux de plans respectant 100 % des contraintes (jours dispo, contraintes physiques) | Fiabilité métier |
| Taux de plans respectant la progression max ~10-12 %/semaine | Sécurité de la progression physique, à instrumenter en priorité |
| Taux de régénération demandée par l'utilisateur | Satisfaction/pertinence perçue |
| Note de satisfaction utilisateur post-génération | Perception qualitative |
| Taux d'abandon du plan en cours de suivi (séances non complétées) | Adéquation réelle avec la capacité de l'utilisateur |
| Coût moyen en tokens par génération (plan + vérification) | Maîtrise budgétaire |

## 11. Estimation du périmètre de développement (à chiffrer avec l'équipe)

| Lot | Contenu |
|---|---|
| Backend proxy | Endpoint Sportsee qui reçoit le formulaire, appelle l'agent de vérification, précalcule les dates, construit le prompt, appelle Mistral, valide et renvoie le JSON |
| Frontend | Formulaire d'onboarding (saisie par options préenregistrées), appel à l'endpoint backend, état de chargement, affichage du plan |
| Gestion des erreurs & rate limiting | Retry avec backoff, quotas par utilisateur, gestion spécifique du quota `code_interpreter`, messages d'erreur |
| Validation du JSON | Schéma + règles métier de cohérence (progression du volume, tolérance ~12 %) côté génération ; garde-fou d'entrées dégénérées côté vérification |
| Tests & non-régression | Suite automatisée sur le parsing et la conformité des réponses (actuellement inexistante, tout est manuel) |

## 12. Prochaines étapes recommandées

1. **Combler la couverture de test de la vérification de faisabilité** avant mise en production :
   pas de suite automatisée, pas de mesure de taux d'erreur répété sur Perte de poids/Endurance/
   Forme générale (seule Course a été testée en série).
2. **Faire valider par un coach sportif qualifié et/ou un professionnel de santé** l'ensemble des
   constantes métier (bandes de volume, planchers, limites de perte de poids) et le contenu des
   prompts de génération.
3. **Trancher les points produit ouverts** : nouveau formulaire dédié vs. champs ajoutés au profil
   existant (impact sur l'estimation, §11) ; dimensionnement du tier de compte Mistral (quota
   `code_interpreter`, Free mode insuffisant en usage réel) avant montée en charge.
4. **Chiffrer le coût à l'échelle** de la base utilisateurs Sportsee (génération + vérification,
   fréquence de régénération autorisée).
5. **Axes d'amélioration identifiés mais non implémentés** : validation + re-prompt automatique en
   cas d'écart de progression détecté après génération ; few-shot prompting (1-2 exemples de plan
   dans chaque prompt) ; génération semaine par semaine plutôt qu'en un seul appel pour resserrer
   le contrôle de progression ; export `.ics` du plan ; prise en compte du feedback en cours de
   plan pour un ajustement adaptatif ; trame de plan pré-validée par un coach humain, avec un rôle
   du LLM limité à la personnalisation (piste la plus structurante pour fiabiliser encore le
   contenu, au prix d'une perte de flexibilité et d'un travail de contenu à produire en amont).

---

*Pour le détail complet (exemples de requêtes Postman, prompts intégraux, tableaux de tests run
par run, annexes A et B des campagnes de tests) : se référer aux 4 documents sources listés en
introduction.*


---

# ANNEXES

## Annexe A : Campagne de tests du prototype initial (prompt unique, historique)

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

**Tableau récapitulatif (12 runs)**

| Objectif | Progression respectée (± ~10%/sem.) | Contrainte genou | Défaut le plus grave observé |
|---|---|---|---|
| Course | 0 / 3 runs | Inconstante | Séance "simulation" 18 km à allure quasi-course, un mercredi, sans adaptation genou |
| Perte de poids | 2 / 3 runs | Bonne (run 2 exemplaire) | `vitesse_cible` chronométrée + fractionné, malgré la règle "pas de contrainte de temps" |
| Endurance | 1 / 3 runs | Inconstante | Date invalide (`"2026-027"`) ; objectif qualitatif parfois ignoré ou inversé |
| Forme générale | 0 / 3 runs | Inconstante (1 run exemplaire) | Incohérence `vitesse_cible: "N/A"` avec `distance_km > 0` |

**Enseignements ayant motivé le changement d'architecture**

- **Aucun objectif n'a obtenu 3 runs sur 3 conformes** à la règle de progression du volume
  hebdomadaire (max ~10 %/semaine) ; le meilleur score était 2/3 (perte de poids). Analyse : le
  vrai facteur d'incohérence n'était pas la formulation du prompt mais un **conflit de
  faisabilité non détecté** (ex. préparer un semi-marathon en 6 semaines depuis 15 km/semaine est
  arithmétiquement incompatible avec la règle des +10 %/semaine, ce qui poussait le modèle à
  gonfler le volume dès la semaine 1 pour compenser). → a directement motivé la mise en place d'une
  vérification de faisabilité obligatoire en amont (§6).
- **Application inconstante des règles spécifiques par objectif** dans un prompt unique à branches
  (ex. `vitesse_cible` chronométrée générée sur `perte_poids` malgré la consigne explicite
  contraire, alors que la règle commune de format était bien respectée). → a directement motivé le
  passage à des prompts spécialisés, un par objectif (§5).
- **Une date au format invalide** (`"2026-027"` au lieu de `"2026-06-27"`) a été produite lorsque
  le modèle devait lui-même calculer 18 dates de séances à partir de `dateDebut` et `joursDispo`.
  → a directement motivé le précalcul des dates côté backend.
- **Contrainte physique appliquée de façon inconstante** d'un run à l'autre avec les mêmes données
  d'entrée (protection systématique sur 6 semaines dans un run, quasi absente dans un autre pour
  le même profil). → a motivé la règle "adaptation à documenter chaque semaine concernée", pas
  seulement en ouverture de plan.

## Annexe B : Campagne de tests, vérification de faisabilité (LLM + Code Interpreter)

> Documente le cheminement complet ayant mené à l'architecture de vérification retenue (§6) : une
> première approche sans exécution de code réelle, ses limites précises, la décision de bascule
> vers `code_interpreter`, puis les tests réalisés objectif par objectif, succès comme échecs.

### B.1 Phase 1 : vérification "pensée" par le LLM, sans exécution de code (écartée)

Une première version des 4 agents de vérification a été testée via un simple appel
`/v1/chat/completions` (`mistral-small-latest` puis `mistral-large-latest`), sans outil
`code_interpreter` : le modèle devait calculer un nombre de semaines minimum et un verdict
`faisable` en énonçant son calcul en langage naturel dans le corps de sa réponse JSON.

**Bugs identifiés, par ordre de découverte :**

| # | Bug observé | Exemple concret | Cause |
|---|---|---|---|
| 1 | Coefficients de volume de pointe irréalistes pour le marathon | Coefficient x3 à x4 de la distance → volume de pointe visé de 127 à 169 km/semaine (niveau ultra-élite) | Mauvaise hypothèse initiale (multiplicateur de distance au lieu de plages absolues sourcées par recherche) |
| 2 | Décision finale décorrélée du raisonnement écrit | `detail_calcul` concluait littéralement "90 est supérieur ou égal à 16 donc faisable=true", mais le champ `faisable` renvoyé était `false` | Le champ `faisable` était placé en **premier** dans le schéma JSON demandé : le modèle devait committer au booléen avant d'avoir écrit son raisonnement |
| 3 | Copie littérale d'un placeholder de formatage | Le modèle a recopié `[OUI/NON]` tel quel au lieu de choisir OUI ou NON | Consigne de formatage utilisant des crochets comme exemple, interprétés littéralement par le modèle |
| 4 | Erreur de comparaison au cas d'égalité | `duree_semaines = semaines_minimum` traité comme `faisable = false` alors que l'égalité doit compter comme faisable | Ambiguïté résiduelle malgré une instruction explicite sur ce cas |
| 5 | Erreurs de calcul sur la formule logarithmique | Une exécution a produit "78 semaines" au lieu de "16" sur des données strictement identiques à un run précédent correct (double division au lieu d'un simple `CEIL`) | Le calcul d'un logarithme "de tête" par un LLM est intrinsèquement plus sujet à erreur qu'une suite d'opérations simples |
| 6 | Invention d'une catégorie hors périmètre | Une distance cible non standard ("55", sans unité claire) a conduit le modèle à inventer une bande de volume "ultra débutant" et un plancher, non définis dans les instructions | Absence de garde-fou explicite sur les distances reconnues |

**Taux d'erreur mesuré** : sur une série de 5 exécutions identiques (même cas Course, semi-marathon
débutant), 1 hallucination franche (bug #5, "74 semaines" puis "78 semaines" selon le run) et 1
écart de +/-1 semaine, soit un taux d'anomalie de l'ordre de 40 % sur ce petit échantillon, jugé
totalement incompatible avec un verdict de faisabilité impactant la santé des utilisateurs.

**Décision** : abandon de cette approche, passage à des agents dotés de `code_interpreter` pour que
le calcul soit **exécuté**, pas **énoncé**.

### B.2 Phase 2 : agents avec `code_interpreter`, résultats par objectif

Architecture testée : un agent par `type_objectif` (`POST /v1/agents`, `mistral-large-latest`,
`completion_args.temperature: 0`, `tools: [{"type": "code_interpreter"}]`), vérifié via
`POST /v1/conversations`.

**Course**, le plus testé, terrain d'apprentissage principal de la nouvelle approche :

| Test | Données | Résultat |
|---|---|---|
| Cohérence rejetée à raison | 15 km/sem, 150 min → allure 6 km/h (valide) ; puis 10 km/70 min → 8.57 km/h (valide) ; puis 10 km/150 min → 4 km/h (rejeté, sous le seuil de 5 km/h) | conforme |
| Calcul correct (semi, débutant) | 15 km/sem, cible 30 km/sem → 9 semaines + affûtage + plancher = 16 semaines | conforme après plusieurs itérations de correction (voir bugs ci-dessous) |
| Distance hors périmètre | `distance_cible = "55"` | rejeté explicitement après ajout du garde-fou de validation de distance (bug #6 de la Phase 1, reproduit une fois avant correction) |
| Comptage "décalé d'un cran" | Boucle de progression comptant 12 semaines au lieu de 13 (valeur finale ajoutée hors boucle sans incrémenter le compteur) | bug trouvé une fois, sans impact sur le verdict final dans ce cas précis (le plancher d'expérience dominait de toute façon), corrigé via un pseudo-code de comptage non ambigu |
| Auto-correction sur erreur d'exécution | `AttributeError` ('float' object has no attribute 'get') puis code corrigé et réexécuté avec succès par le modèle lui-même, sans intervention | comportement observé à plusieurs reprises, illustre l'avantage principal de cette approche |
| Enveloppe Markdown intermittente | Réponse finale parfois entourée de balises de code, malgré une instruction explicite contraire | comportement probabiliste non éliminé par le prompt, nécessite un nettoyage défensif côté code appelant |

**Perte de poids**, 4 tests réalisés, tous corrects :
- Bascule kg → % et % → kg vérifiée dans les deux sens (80 kg / -6 kg → contrainte % dominante à
  8 semaines ; 120 kg / -10 kg → contrainte kg dominante à 10 semaines).
- Cas d'égalité (`duree_semaines = semaines_minimum`) correctement traité comme faisable.
- Cas de rejet (`10 kg en 5 semaines` = 2 kg/semaine, le double de la limite) correctement rejeté.

**Endurance**, 3 tests réalisés, tous corrects : cas faisable, cas non faisable, cas incohérent
(allure implicite de 100 km/h correctement rejetée après trois tentatives de code par le modèle,
dont deux ayant échoué avec des erreurs Python réelles avant correction).

**Forme générale**, 2 tests réussis (plancher fixe seul ; plancher combiné à un calcul de
progression), et une découverte importante sur un cas dégénéré :

- **Risque de boucle infinie identifié** : si le volume de référence est nul, la boucle de
  progression (`valeur *= 1.10`) ne se termine jamais (`0 x 1.10 = 0` indéfiniment). Un garde-fou
  explicite anti-boucle-infinie a été ajouté aux instructions des agents Endurance et Forme
  générale suite à cette découverte.
- **Deux échecs d'API distincts sur la même entrée dégénérée** (`volume_reference_km = 0` et un
  second champ numérique nul simultanément) : une fois une entrée de réponse structurellement
  invalide (nom de fonction contenant un fragment de code brut), une fois une réponse
  complètement vide (`outputs: []`) malgré une consommation de tokens réelle. Aucune de ces deux
  défaillances n'est un bug de prompt corrigible par reformulation : elles ont directement motivé
  le garde-fou d'entrée côté backend (§2), plutôt que de chercher à fiabiliser le prompt face à
  un cas que l'application peut de toute façon écarter en amont.

### B.3 Enseignements transversaux

1. **L'exécution de code réelle change la nature des erreurs, pas leur possibilité totale.** Les
   erreurs d'arithmétique pure (Phase 1) ont quasiment disparu ; il reste des erreurs de
   **logique** dans le code écrit par le modèle (le bug de comptage décalé), plus rares mais pas
   nulles. Une couverture de test régulière reste nécessaire, y compris sur cette architecture plus
   fiable.
2. **L'auto-correction sur erreur d'exécution est un vrai gain, observé à plusieurs reprises** :
   une exception Python réelle (`SyntaxError`, `NameError`, `AttributeError`) est vue par le
   modèle, qui corrige et réexécute son code, contrairement à une hallucination silencieuse en
   Phase 1, qui ne se signale jamais d'elle-même.
3. **L'ordre des champs du schéma JSON demandé a un impact réel sur la fiabilité de la décision** :
   placer le booléen `faisable` en dernier (après le raisonnement) plutôt qu'en premier a
   directement résolu le bug #2 de la Phase 1.
4. **`code_interpreter` a ses propres limites d'infrastructure**, indépendantes de la qualité du
   prompt : quota séparé et restrictif (particulièrement en Free mode), et instabilité observée sur
   des entrées dégénérées (réponses vides/malformées). Ces limites justifient un garde-fou
   d'entrée minimal côté backend, distinct d'un garde-fou métier.

### B.4 Suite aux retours du mentor produit : sortie allégée et fiabilité du canal de sortie

Suite à une session de revue avec le mentor produit, deux changements ont été demandés et testés
sur les 4 agents de vérification.

**1. Simplification du schéma de sortie.** Le schéma verbeux utilisé pendant les tests
(`detail_calcul`, niveau estimé, allure implicite...) a été réduit à 3 champs seulement :
`semaines_recommandees_coach`, `semaines_minimum`, `faisable`. Pour Course, ces deux premiers
champs conservent leur distinction (calcul vs. recommandation coach) ; pour les 3 autres objectifs,
qui n'ont pas cette distinction métier, les deux champs renvoient intentionnellement la même
valeur calculée, par souci de cohérence de schéma entre les 4 agents plutôt que d'inventer une
seconde règle métier non demandée.

**2. Découverte majeure en testant cette simplification : le canal `message.output` n'est pas
fiable, même quand le calcul exécuté est correct.** Sur un test Course (marathon, 10 km/semaine,
niveau débutant), le résultat réellement exécuté par le code (`tool.execution.info.code_output`)
était `{"semaines_recommandees_coach": 20, ...}`, valeur exacte, vérifiée à la main. La réponse
finale du modèle en langage naturel (`message.output`), censée simplement recopier ce résultat,
annonçait pourtant **24** pour ce même champ : une valeur qui correspond au mauvais palier de la
règle de recommandation coach. Le calcul était juste ; sa retranscription ne l'était pas.

**Décision prise en conséquence : ne plus jamais lire `message.output` côté application.** Seul
`tool.execution.info.code_output` (dernière occurrence) doit être parsé. Cette décision a
elle-même révélé un problème annexe : demander explicitement au code d'émettre du JSON valide
(`print(json.dumps(resultat))`) fonctionne la plupart du temps, mais pas systématiquement : un
test a vu le modèle revenir spontanément à un affichage de dictionnaire Python natif
(guillemets simples, `False` majuscule), qui n'est pas du JSON valide au sens strict. Le parsing
côté application a donc été rendu tolérant aux deux syntaxes (JSON strict et représentation
Python), plutôt que de continuer à itérer sur une consigne qui ne sera jamais suivie à 100 %.
Conséquence positive : la réponse en langage naturel de l'agent n'a plus besoin de respecter un
format précis, puisqu'elle n'est de toute façon plus lue.

**3. Consommation de tokens : la simplification du schéma de sortie n'a pas réduit le coût,
contrairement à l'hypothèse de départ.** Le coût réel est piloté par la longueur du code Python
que l'agent doit réécrire intégralement à chaque appel (aucune mémoire de code entre deux
conversations), pas par la verbosité du JSON final ni par le choix du modèle (détail chiffré en
§8). Une réduction réelle nécessiterait de simplifier les règles métier elles-mêmes, ce qui n'est
pas souhaitable du point de vue de la fiabilité.

### B.5 Couverture de test restante (à date de ce document)

- **Aucune suite de tests automatisée** : l'ensemble des tests décrits ci-dessus a été réalisé
  manuellement, cas par cas, via Postman. Une non-régression n'est pas garantie si les instructions
  des agents sont retouchées après la rédaction de ce document.
- **Taux d'erreur mesuré uniquement sur Course** (5 runs répétés) : les 3 autres objectifs n'ont
  été testés qu'une seule fois par scénario, un taux d'erreur comparable à celui mesuré sur Course
  ne peut pas être exclu tant qu'une répétition similaire n'a pas été faite.
- **Cas non testés** : déclenchement effectif de l'avertissement médical (perte de poids > 15 % du
  poids actuel), valeurs de `blessure` autres que "aucune", variation du champ `genre`.

**Recommandation avant mise en production** : combler ces manques (répétitions par objectif,
suite automatisée) avant de considérer la vérification de faisabilité comme validée au même
niveau que la génération du plan.

## Annexe C : Exemple complet de prompt de génération (Course)

**Prompt system (extrait, section objectif "course")**. Le socle commun (profil, disponibilités)
et le schéma JSON de sortie sont identiques quel que soit `type_objectif` ; seule la section
"objectif" ci-dessous change :

```text
Objectif : {{distance_cible_km}} km, temps cible {{temps_cible}}.
Cet objectif a déjà été validé comme réalisable dans le délai de {{duree_semaines}} semaines par
l'agent de vérification de faisabilité, exécuté en amont. NE remets PAS en cause
distance_cible_km ni duree_semaines : ces valeurs sont déjà cohérentes entre elles.
```

**Prompt user (extrait)** :

```text
Voici le profil du coureur :
- Âge : {{age}} ans
- Genre : {{gender}}
- Poids / taille : {{weight}} kg / {{height}} cm
- Volume total déjà parcouru : {{totalDistance}} km sur {{totalSessions}} séances
- Objectif hebdomadaire actuel : {{weeklyGoal}} km/semaine

Objectif de ce plan :
- Distance visée : {{distance_course}}
- Temps cible : {{temps_cible}}
- Date de la course : {{dateCourse}}
- Volume de référence (semaine 1) : {{volume_reference_km}} km

Disponibilités :
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}

Dates de séances à utiliser (précalculées, à réutiliser exactement, dans cet ordre) :
{{datesSeancesPrecalculees}}

Historique des séances récentes :
{{sessionsFormatees}}

Génère le plan sur {{duree_semaines}} semaines au format JSON STRICT (schéma en §5).
```

**Formatage de l'historique de séances envoyé** (4 dernières semaines seulement, valeurs
arrondies, champs techniques exclus) :

```json
[
  { "date": "2026-06-10", "distance_km": 5, "duree_min": 28, "allure_min_km": "5:36", "fc_moyenne": 148, "calories": 310 },
  { "date": "2026-06-13", "distance_km": 8, "duree_min": 47, "allure_min_km": "5:52", "fc_moyenne": 152, "calories": 480 },
  { "date": "2026-06-15", "distance_km": 6, "duree_min": 33, "allure_min_km": "5:30", "fc_moyenne": 155, "calories": 360 }
]
```

## Annexe D : Requêtes API, format complet et gestion des erreurs

**Génération du plan, corps de requête :**

```json
{
  "model": "mistral-small-latest",
  "temperature": 0.2,
  "max_tokens": 8000,
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "<prompt système spécialisé selon type_objectif>" },
    { "role": "user", "content": "<profil + historique + dates précalculées + schéma JSON>" }
  ]
}
```

**Vérification de faisabilité, setup de l'agent (une fois par type d'objectif) :**

```json
{
  "model": "mistral-large-latest",
  "name": "Verification Faisabilite - Course (Code Interpreter)",
  "instructions": "<règles métier complètes : bandes de volume, progression, planchers, garde-fous>",
  "tools": [{ "type": "code_interpreter" }],
  "completion_args": { "temperature": 0 }
}
```
La réponse contient un champ `id` (l'`agent_id`) à conserver côté application.

**Vérification de faisabilité, appel de vérification :**

```json
{
  "agent_id": "ag_...",
  "store": false,
  "inputs": "Evalue la faisabilite de cet objectif : distance_cible=..., volume_reference_km=..., ..."
}
```

**Réponse de vérification, structure à connaître pour le parsing :**

```json
{
  "object": "conversation.response",
  "conversation_id": "conv_...",
  "outputs": [
    {
      "type": "tool.execution",
      "name": "code_interpreter",
      "info": { "code": "...", "code_output": "{\"semaines_recommandees_coach\": 16, \"semaines_minimum\": 14, \"faisable\": true}" }
    },
    { "type": "message.output", "content": "..." }
  ],
  "usage": { "prompt_tokens": 1600, "completion_tokens": 400, "connector_tokens": 32 }
}
```
`outputs` est un tableau, potentiellement avec plusieurs `tool.execution` (tentatives de code
corrigées par le modèle) : toujours prendre la **dernière** occurrence. Le champ à parser côté
application est `info.code_output` du dernier `tool.execution`, jamais `message.output` (voir
Annexe B.4).

**Gestion des erreurs :**

| Cas | Comportement côté Sportsee |
|---|---|
| `401` | Ne jamais exposer l'erreur brute ; logguer côté serveur, message générique à l'utilisateur |
| `422` | Corps de requête mal formé, erreur de développement, valider le payload avant envoi |
| `429` général | Retenter avec backoff, ou mettre l'utilisateur en file d'attente |
| `429` spécifique `code_interpreter` | Quota séparé, plus restrictif (surtout en Free mode), backoff plus long, vérifier le tier du compte |
| `500` / `503` | Retry avec backoff exponentiel (2-3 tentatives max), puis message d'erreur clair |
| JSON invalide/hors schéma (génération) | Valider avant affichage ; si invalide, retenter une fois avec rappel du format |
| JSON valide mais incohérent sur le fond (génération) | Validation sémantique dédiée (règles métier), en plus de la validation de structure |
| `code_output` non parsable (ni JSON ni repr Python) | Erreur technique, retry une fois, logguer pour suivi |
| `outputs: []` ou entrée malformée (vérification) | Observé sur entrées dégénérées, traiter comme erreur technique, et surtout intercepter ces entrées en amont côté backend |
| Exception Python dans `tool.execution` suivie d'une nouvelle tentative | Comportement normal et attendu, ne pas traiter comme une erreur tant qu'un résultat final valide est obtenu ; logguer si le nombre de tentatives dépasse 3 |

## Annexe E : Sécurité, confidentialité et limites d'infrastructure

- **Clé API** : jamais exposée côté React (un appel direct depuis le navigateur l'exposerait à
  tous les utilisateurs). Pattern retenu : backend proxy (l'API Sportsee) qui détient la clé et
  relaie les appels à Mistral. Dans Postman, clé en variable d'environnement de type `secret`,
  jamais écrite en dur ni committée dans un repo.
- **Données personnelles envoyées** : profil coureur (âge, poids, objectif, contraintes physiques) :
  n'envoyer que le strict nécessaire au calcul du plan (pas de nom, email) ; informer
  l'utilisateur que ses données d'entraînement sont transmises à un service tiers (Mistral AI) ;
  vérifier la politique de rétention des données de Mistral (utilisation ou non pour l'entraînement
  de leurs modèles, durée de conservation).
- **Taille de contexte** : ~128k tokens sur les modèles retenus (`small` et `large`), largement
  suffisant pour ce cas d'usage, à surveiller si l'historique de séances envoyé s'allonge.
- **Rate limiting général** : limites de requêtes par minute/seconde selon le plan tarifaire du
  compte, backoff exponentiel à implémenter.
- **Rate limiting spécifique `code_interpreter`** : quota séparé, sensiblement plus bas, en
  particulier en **Free mode** (mode par défaut du compte, pensé pour l'évaluation), observé à
  plusieurs reprises pendant les tests. À vérifier/upgrader le tier du compte avant tout usage en
  production impliquant des vérifications de faisabilité à volume réel (voir console.mistral.ai,
  Admin Console → Subscriptions pour le tier "Scale").
- **Instabilité de `code_interpreter` sur entrées dégénérées** : réponses vides ou malformées
  observées sur un même type d'entrée limite (valeurs nulles simultanées, voir Annexe B.2). Pas un
  problème de formulation de prompt : justifie d'intercepter ces cas avant l'appel API.
- **Pas de mémoire entre les appels** : chaque requête doit contenir tout le contexte utile. Pour
  les agents de vérification, seul l'`agent_id` (et ses instructions figées à la création) est
  réutilisé d'un appel à l'autre : les données du cas à évaluer sont renvoyées intégralement à
  chaque appel via `inputs`.
