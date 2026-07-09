# Étape 3 — Conception des prompts (Sportsee × Mistral)

Objectif : concevoir des prompts précis et bien structurés pour que Mistral produise un plan
d'entraînement de durée variable (selon l'objectif), fiable et directement exploitable dans React.

## 1. Principe : deux messages, deux rôles, un prompt spécialisé par objectif

| Message | Rôle |
|---|---|
| `system` | Cadre l'IA : son rôle, ses règles, le format de sortie attendu. Un prompt **dédié** par `type_objectif` (course, perte de poids, endurance, forme générale) — pas un template unique à branches. |
| `user` | La demande concrète : profil du coureur + historique de séances + dates précalculées + schéma JSON attendu. Généré dynamiquement à partir des données de l'application. |

**Pourquoi un prompt dédié par objectif plutôt qu'un seul prompt générique.** Un plan "10 km en
moins d'1h" et un plan "perte de poids" n'ont pas les mêmes règles, ni le même vocabulaire, ni le
même rapport à la vitesse ou au chronométrage. Donner au modèle un seul jeu d'instructions
couvrant les quatre cas l'oblige à trier lui-même les règles pertinentes selon le
`type_objectif` reçu — une charge cognitive superflue. En confiant ce tri au **code**, avant
l'appel API, chaque appel envoie au modèle exactement les règles qui s'appliquent à la demande en
cours, ni plus ni moins. Le code sélectionne le prompt spécialisé correspondant au
`type_objectif` (voir [02-Requetes-API.md](./02-Requetes-API.md) §1.c), et, pour `"course"`,
n'active ce prompt qu'après validation par l'algorithme de faisabilité (voir
[04-Synthese.md](./04-Synthese.md) §3.1).

Règle d'or, valable pour tous les prompts : **plus le prompt est précis et contraint, plus la
réponse est pertinente et exploitable.**

**Principe de conception — validation par un coach sportif.** Le contenu métier de chaque prompt
(paliers de volume, structure et types de séances, timing de l'affûtage, adaptations aux
contraintes physiques) doit être **rédigé et validé en collaboration avec un coach sportif
qualifié**, afin de garantir la **véracité et la sécurité** des plans produits. Le LLM se contente
d'exécuter le prompt : l'autorité sur le contenu sportif vient du coach, pas du modèle.

## 2. Les ingrédients d'un bon prompt

1. **Rôle de l'IA** — qui elle incarne (« coach de course à pied »).
2. **Mission claire** — ce qu'elle doit produire (« un plan sur EXACTEMENT {{duree_semaines}} semaines », durée fournie en entrée, jamais calculée par le modèle).
3. **Contraintes à respecter** — règles métier non négociables (jours disponibles, progression
   sécurisée, contraintes physiques).
4. **Données d'entrée structurées** — profil + historique + dates déjà calculées, toujours dans
   le même format.
5. **Format de sortie imposé** — schéma JSON explicite, identique quel que soit l'objectif, pour
   un parsing fiable côté React.
6. **Garde-fous** — anti texte libre, anti hallucination, gestion des données manquantes.

## 3. Socle commun aux quatre prompts système

Les quatre prompts spécialisés (§4) partagent un socle de règles et de format, assemblé côté
code avec les instructions propres à chaque objectif — chaque appel envoie un texte final
unique et complet, pas un template avec des conditions.

```text
Tu es un coach sportif expérimenté et bienveillant, spécialisé en course à pied et
remise en forme.
Ta mission : générer un plan d'entraînement personnalisé sur EXACTEMENT {{duree_semaines}} semaines.

RÈGLES COMMUNES :
- Respecte strictement les jours disponibles ({{joursDispo}}) et les contraintes physiques du
  coureur.
- Ne programme JAMAIS de séance un jour non disponible.
- Semaine 1 = volume de référence fourni (volume_reference_km), SANS augmentation.
- Progression du volume hebdomadaire STRICTEMENT ≤ 10 % par rapport à la semaine précédente
  (volume_max_semaine = volume_semaine_précédente × 1,10, puis volume_hebdo_km ≤ volume_max_semaine).
- Si une contrainte physique est fournie, adapte CHAQUE semaine concernée — pas seulement la
  première — (réduire l'impact, éviter le fractionné dur, privilégier les surfaces souples), et
  documente l'adaptation dans adaptation_blessure pour chaque semaine (sinon "RAS").
- Pour chaque séance : date (réutilise EXACTEMENT les dates fournies en entrée, dans l'ordre
  donné ; n'en calcule, n'en devine et n'en modifie AUCUNE toi-même), type, durée (min), distance
  (km), vitesse cible, conseil d'alimentation.
- Si une donnée est manquante, fais une hypothèse raisonnable et reste prudent.

FORMAT DE SORTIE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises Markdown.
- Respecte exactement le schéma fourni par l'utilisateur, y compris pour les champs moins
  pertinents selon l'objectif (ex. vitesse_cible sur un plan perte de poids) : renseigne alors
  une indication qualitative plutôt que de laisser le champ vide, pour ne pas casser le parsing
  côté application.
- Renseigne le champ avertissement avec un message clair indiquant que ce plan est une PROPOSITION
  générée par IA, qu'il ne remplace PAS un entraînement établi par un coach sportif qualifié, et
  qu'il convient de consulter un professionnel en cas de doute, de douleur ou de contrainte physique.
```

Pourquoi cette structure : les règles communes restent volontairement **redondantes** avec le
schéma JSON (les LLM suivent mieux une instruction répétée sous plusieurs formes qu'énoncée une
seule fois). L'instruction de réutilisation stricte des dates fournies (plutôt que de laisser le
modèle les calculer) et l'application de l'adaptation blessure à *chaque* semaine concernée sont
deux garde-fous directement issus des résultats de tests — voir
[04-Synthese.md](./04-Synthese.md) §3 pour le détail des mesures qui ont motivé ces choix.

## 4. Les quatre blocs spécifiques par `type_objectif`

Chacun de ces blocs est concaténé au socle commun (§3) par le code, pour former le prompt système
final envoyé au modèle. Un plan `"course"` ne reçoit ainsi jamais les règles `"perte_poids"`, et
inversement.

### 4.a — `"course"` (semi-marathon, 10 km, marathon...)

```text
CONTEXTE DE CETTE DEMANDE : préparation à une course sur route.
- Objectif : {{distance_cible_km}} km, temps cible {{temps_cible}}.
- Cet objectif a déjà été validé comme réalisable dans le délai de {{duree_semaines}} semaines par
  un contrôle de faisabilité effectué en amont (côté application). NE remets PAS en cause
  distance_cible_km ni duree_semaines : ces valeurs sont déjà cohérentes entre elles.

RÈGLES SPÉCIFIQUES :
- Inclus au moins une séance "sortie longue" chaque semaine, en progression cohérente vers la
  distance cible.
- La dernière semaine avant la course est un allègement (affûtage) : réduction nette du volume,
  jamais une semaine de charge maximale.
- Respecte le temps_cible fourni pour calibrer les allures de séance.
```

### 4.b — `"perte_poids"`

```text
CONTEXTE DE CETTE DEMANDE : accompagnement à la perte de poids par la course à pied.
- Poids actuel : {{poids_actuel}} kg — poids visé : {{poids_vise}} kg.

RÈGLES SPÉCIFIQUES :
- Privilégie la régularité et le volume total plutôt que la vitesse.
- N'impose AUCUNE contrainte de temps chronométré et AUCUNE séance de fractionné orienté
  performance : vitesse_cible doit rester une indication qualitative (ex. "allure confortable,
  sans essoufflement"), jamais un chrono précis.
- Les conseils d'alimentation portent sur un déficit calorique raisonnable et progressif — JAMAIS
  de restriction sévère.
- Rappelle explicitement, au moins une fois dans le plan, que la perte de poids dépend aussi de
  facteurs hors entraînement (alimentation globale, sommeil, etc.).
```

### 4.c — `"endurance"`

```text
CONTEXTE DE CETTE DEMANDE : développement de l'endurance.
- Objectif d'endurance à atteindre : {{objectif_endurance}}.

RÈGLES SPÉCIFIQUES :
- Priorité à la DURÉE (duree_min) et à la DISTANCE parcourues à allure modérée et
  conversationnelle, jamais à la vitesse pure.
- duree_min doit progresser semaine après semaine, de façon mesurable, vers l'objectif fourni. Ne
  fais jamais grimper la distance à durée constante (ça revient à augmenter la vitesse, l'inverse
  de la consigne).
- La dernière semaine doit inclure une séance permettant de vérifier concrètement si l'objectif
  d'endurance ({{objectif_endurance}}) est atteint, et le confirmer explicitement dans le champ
  objectif_semaine de cette semaine.
```

### 4.d — `"forme_generale"`

```text
CONTEXTE DE CETTE DEMANDE : remise en forme générale, sans objectif chronométré.

RÈGLES SPÉCIFIQUES :
- Varie réellement les types de séance d'une semaine à l'autre (endurance fondamentale, côte
  douce, terrain varié, sortie plaisir...) : deux semaines consécutives ne doivent pas reproduire
  le même intitulé de séance pour un même jour.
- Aucune contrainte de temps chronométré ; vitesse_cible reste une indication qualitative.
- Priorité au plaisir et à la régularité plutôt qu'à la performance.
```

## 5. Prompt USER (données + schéma)

Construit dynamiquement à partir de trois sources :
- les champs **déjà existants** dans `UserProfile` / `UserActivity` (cf.
  [02-Requetes-API.md](./02-Requetes-API.md) §1.a) ;
- les champs **collectés via le nouveau formulaire** (§1.b), saisis par options
  préenregistrées ;
- les **dates de séances précalculées côté backend** (à partir de `dateDebut`, `joursDispo` et
  `duree_semaines`) et injectées telles quelles — le modèle ne calcule aucune date.

La section "objectif" du prompt change selon `type_objectif` — on n'envoie que les champs
pertinents pour le type choisi, plutôt que d'envoyer tous les champs avec des valeurs vides pour
ceux qui ne s'appliquent pas (un champ vide peut être mal interprété par le modèle, mieux vaut ne
pas l'envoyer du tout).

**Exemple pour `type_objectif = "course"` :**

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

Génère le plan sur {{duree_semaines}} semaines au format JSON STRICT suivant :
{...}
```

Le reste du prompt (schéma JSON de sortie) est identique quel que soit le type d'objectif —
c'est justement l'intérêt de garder un schéma de sortie stable : le parsing côté application
n'a pas besoin de connaître le `type_objectif` pour traiter la réponse.

```json
{
  "objectif": string,
  "duree_semaines": number,
  "avertissement": string,
  "semaines": [
    {
      "numero": number,
      "objectif_semaine": string,
      "volume_hebdo_km": number,
      "sessions": [
        {
          "date": "YYYY-MM-DD",
          "jour": string,
          "type": string,
          "duree_min": number,
          "distance_km": number,
          "vitesse_cible": string,
          "adaptation_blessure": string,
          "conseil_alimentation": string
        }
      ]
    }
  ]
}
```

> `volume_hebdo_km` est un **indicateur de charge/niveau** (c'est lui qui porte la progression
> ≤ 10 %), pas nécessairement la somme comptable des `distance_km` de la semaine : les deux
> peuvent diverger légitimement (ex. semaine d'affûtage). À clarifier côté affichage React.

## 6. Formatage des données envoyées (historique de sessions)

Le modèle `UserActivity` (`src/models/UserActivity.js`) expose : `date`, `distance`, `duration`,
`heartRate.min/max/average`, `caloriesBurned`. **Il n'existe pas de champ `type` de séance ni de
`ressenti`** dans l'app actuelle — on n'envoie donc que ce qui existe réellement, en calculant
l'allure à partir de `distance`/`duration` :

```json
[
  { "date": "2026-06-10", "distance_km": 5, "duree_min": 28, "allure_min_km": "5:36", "fc_moyenne": 148, "calories": 310 },
  { "date": "2026-06-13", "distance_km": 8, "duree_min": 47, "allure_min_km": "5:52", "fc_moyenne": 152, "calories": 480 },
  { "date": "2026-06-15", "distance_km": 6, "duree_min": 33, "allure_min_km": "5:30", "fc_moyenne": 155, "calories": 360 }
]
```

> Note : si on veut que l'IA distingue les types de séance (endurance, fractionné, sortie
> longue...) ou tienne compte d'un ressenti subjectif, ce sont des **champs à ajouter au modèle
> `UserActivity`** (nouvelle fonctionnalité de saisie), pas des données déjà disponibles.

- On garde uniquement les 4 dernières semaines de séances (au-delà, l'apport pour la
  personnalisation du plan est marginal, et ça évite de gonfler le nombre de tokens envoyés).
- On arrondit les valeurs (`5.73821 km` → `5.7 km`).
- On exclut les champs techniques inutiles (identifiants internes, coordonnées GPS brutes...).

## 7. Génération du prompt côté application (exemple)

```js
// Un bloc "socle commun" (cf. §3) + un bloc spécifique par type_objectif (cf. §4),
// assemblés en un seul prompt système final avant l'appel API.
const SOCLE_COMMUN = `...`; // cf. §3

const BLOCS_SPECIFIQUES = {
  course: `...`,        // cf. §4.a
  perte_poids: `...`,   // cf. §4.b
  endurance: `...`,     // cf. §4.c
  forme_generale: `...` // cf. §4.d
};

function buildSystemPrompt(typeObjectif) {
  return `${SOCLE_COMMUN}\n\n${BLOCS_SPECIFIQUES[typeObjectif]}`;
}

// Pour "course" uniquement : la faisabilité est vérifiée AVANT de construire le prompt.
// distance_cible_km et duree_semaines proviennent de faisabilite.py, pas de la saisie brute.
function resoudreObjectifCourse(form, volumeActuelKm) {
  const verdict = evaluerFaisabilite(volumeActuelKm, form.dureeSouhaitee, form.distanceCourseKm);
  return {
    distance_cible_km: verdict.distance_cible_km,
    duree_semaines: verdict.duree_recommandee_semaines,
    volume_reference_km: volumeActuelKm,
  };
}

// Construit la section "objectif" du prompt selon le type_objectif choisi.
function buildObjectifSection(form) {
  switch (form.type_objectif) {
    case "course":
      return `- Distance visée : ${form.distance_course}
- Temps cible : ${form.temps_cible}
- Date de la course : ${form.dateCourse}`;

    case "perte_poids":
      return `- Poids actuel : ${form.poids_actuel} kg
- Poids visé : ${form.poids_vise} kg`;

    case "endurance":
      return `- Objectif d'endurance : ${form.objectif_endurance}`;

    case "forme_generale":
    default:
      return `- Type d'objectif : forme_generale`;
  }
}

// Précalcule les N dates de séances (jour de la semaine × nombre de semaines) — pure logique
// applicative, aucun calcul calendaire laissé au modèle.
function buildDatesSeances(dateDebut, joursDispo, dureeSemaines) { /* ... */ }

function buildUserPrompt(profile, form, sessionsFormatees, dureeSemaines, volumeReference, dates) {
  return `Voici le profil du coureur :
- Âge : ${profile.age} ans
- Genre : ${profile.gender}
- Poids / taille : ${profile.weight} kg / ${profile.height} cm
- Volume total déjà parcouru : ${profile.totalDistance} km sur ${profile.totalSessions} séances
- Objectif hebdomadaire actuel : ${profile.weeklyGoal} km/semaine

Objectif de ce plan :
${buildObjectifSection(form)}
- Volume de référence (semaine 1) : ${volumeReference} km

Disponibilités :
- Jours disponibles : ${form.joursDispo.join(", ")}
- Moment préféré : ${form.momentPrefere}
- Durée par séance : ${form.dureeSeance} min
- Contraintes physiques : ${form.contraintes || "aucune"}
- Conseils nutrition souhaités : ${form.conseilsNutrition ? "oui" : "non"}

Dates de séances à utiliser (précalculées, à réutiliser exactement, dans cet ordre) :
${JSON.stringify(dates)}

Historique des séances récentes :
${JSON.stringify(sessionsFormatees, null, 2)}

Génère le plan sur ${dureeSemaines} semaines au format JSON STRICT suivant :
{...}`; // schéma complet, cf. §5
}
```

Ce découpage (socle commun / blocs spécifiques / dates et faisabilité précalculées) illustre un
principe utile même hors contexte IA : isoler la partie qui varie (l'objectif) de la partie
stable (profil, disponibilités, historique) et des calculs déterministes (dates, faisabilité),
plutôt qu'un unique bloc avec des `if` en cascade et des calculs laissés au modèle — plus lisible,
plus testable, et plus fiable.

## 8. Exemple de réponse attendue (extrait)

**`type_objectif = "course"` :**

```json
{
  "objectif": "semi-marathon",
  "duree_semaines": 12,
  "avertissement": "Ce plan est une proposition générée par IA. Il ne remplace pas un entraînement établi par un coach sportif qualifié. Consultez un professionnel en cas de doute, de douleur ou de contrainte physique.",
  "semaines": [
    {
      "numero": 1,
      "objectif_semaine": "Reprise progressive, consolider l'endurance de base",
      "volume_hebdo_km": 20,
      "sessions": [
        {
          "date": "2026-06-22",
          "jour": "lundi",
          "type": "endurance",
          "duree_min": 40,
          "distance_km": 6,
          "vitesse_cible": "6:00 min/km",
          "adaptation_blessure": "Allure souple sur surface souple pour ménager le genou sensible.",
          "conseil_alimentation": "Repas riche en glucides complexes 3h avant la séance."
        }
      ]
    }
  ]
}
```

**`type_objectif = "perte_poids"`** — même schéma, mais un ton et un contenu différents (pas de
vitesse chronométrée imposée, conseils nutrition orientés déficit calorique) :

```json
{
  "objectif": "perte_poids",
  "duree_semaines": 6,
  "avertissement": "Ce plan est une proposition générée par IA. Il ne remplace pas un entraînement établi par un coach sportif qualifié. Consultez un professionnel en cas de doute, de douleur ou de contrainte physique.",
  "semaines": [
    {
      "numero": 1,
      "objectif_semaine": "Installer une routine régulière à intensité modérée",
      "volume_hebdo_km": 8,
      "sessions": [
        {
          "date": "2026-06-22",
          "jour": "lundi",
          "type": "endurance légère",
          "duree_min": 35,
          "distance_km": 4,
          "vitesse_cible": "allure confortable, sans essoufflement",
          "adaptation_blessure": "Impact limité et allure contrôlée pour préserver le genou sensible.",
          "conseil_alimentation": "Privilégier un repas riche en protéines et légumes après la séance, sans restriction excessive."
        }
      ]
    }
  ]
}
```

Ça illustre concrètement pourquoi le schéma reste identique (mêmes clés JSON) alors que le
contenu s'adapte : `vitesse_cible` devient une indication qualitative plutôt qu'un rythme
chronométré — le parsing React n'a pas besoin de changer.

## 9. Points de vigilance

- **Prompts trop vagues** : demander « fais-moi un plan d'entraînement » sans profil ni
  contraintes produit des séances génériques, potentiellement inadaptées (ex. volume trop élevé
  pour un débutant). Le schéma détaillé + les règles impératives évitent ce piège.
- **Données personnelles sensibles** : le prompt ne doit contenir que les données strictement
  utiles au calcul du plan (objectif, disponibilités, contraintes physiques liées à la course).
  Pas de nom, email, localisation précise, ou toute donnée de santé non nécessaire.
- **Validation systématique côté backend** : même avec un prompt spécialisé et des dates/volumes
  précalculés, la réponse du modèle reste probabiliste. Une validation syntaxique (schéma JSON)
  **et** sémantique (cohérence entre champs, respect de la progression de volume, tolérance
  définie côté code) doit s'appliquer à chaque génération avant tout affichage — voir
  [04-Synthese.md](./04-Synthese.md) §4 et §7.
- **Formulations alternatives à tester** : comparer différentes formulations du rôle (ex. ton
  neutre vs. ton "bienveillant") sur la qualité des conseils nutrition générés, pour affiner le
  ton perçu par un public de loisirs.
