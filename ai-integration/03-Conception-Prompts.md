# Étape 3 — Conception des prompts (Sportsee × Mistral)

Objectif : concevoir des prompts précis et bien structurés pour que Mistral produise un plan
d'entraînement sur 6 semaines, fiable et directement exploitable dans React.

## 1. Principe : deux messages, deux rôles

| Message | Rôle |
|---|---|
| `system` | Cadre l'IA : son rôle, ses règles, le format de sortie attendu. Fixe une fois pour toutes, ne dépend pas de l'utilisateur. |
| `user` | La demande concrète : profil du coureur + historique de séances + schéma JSON attendu. Généré dynamiquement à partir des données de l'application. |

Règle d'or : **plus le prompt est précis et contraint, plus la réponse est pertinente et
exploitable.**

## 2. Les ingrédients d'un bon prompt

1. **Rôle de l'IA** — qui elle incarne (« coach de course à pied »).
2. **Mission claire** — ce qu'elle doit produire (« un plan sur EXACTEMENT 6 semaines »).
3. **Contraintes à respecter** — règles métier non négociables (jours disponibles, progression
   sécurisée, contraintes physiques).
4. **Données d'entrée structurées** — profil + historique, toujours dans le même format.
5. **Format de sortie imposé** — schéma JSON explicite, pour un parsing fiable côté React.
6. **Garde-fous** — anti texte libre, anti hallucination, gestion des données manquantes.

## 3. Prompt SYSTEM

Depuis l'introduction de `type_objectif` (cf. [02-Requetes-API.md](./02-Requetes-API.md) §1.b),
le prompt système doit gérer 4 objectifs différents avec un seul appel. On garde **un seul
message système** (pas un prompt par type) pour rester simple à maintenir, mais on structure
les règles en deux blocs : des règles communes, et des règles spécifiques par
`type_objectif` — appliquées seulement si elles correspondent à la valeur reçue.

```text
Tu es un coach sportif expérimenté et bienveillant, spécialisé en course à pied et
remise en forme.
Ta mission : générer un plan d'entraînement personnalisé sur EXACTEMENT 6 semaines,
adapté au type d'objectif du coureur (fourni dans le champ type_objectif).

RÈGLES COMMUNES (tous types d'objectif) :
- Respecte strictement les jours disponibles et les contraintes physiques du coureur.
- Ne programme JAMAIS de séance un jour non disponible.
- Progression réaliste et sécurisée (pas d'augmentation brutale du volume, max ~10 %/semaine).
- Pour chaque séance : date, type, durée (min), distance (km), vitesse cible, conseil d'alimentation.
- Si une donnée est manquante, fais une hypothèse raisonnable et reste prudent.

RÈGLES SPÉCIFIQUES SELON type_objectif :
- "course" : respecte la distance_course et le temps_cible fournis. Inclus au moins une
  séance "sortie longue" par semaine. La 6e semaine doit être un allègement (affûtage)
  avant la course, pas une semaine de charge maximale.
- "perte_poids" : privilégie la régularité et le volume total sur la vitesse. N'impose
  aucune contrainte de temps chronométré. Les conseils d'alimentation portent sur un
  déficit calorique raisonnable et progressif (jamais de restriction sévère). Rappelle
  que la perte de poids dépend aussi de facteurs hors entraînement.
- "endurance" : privilégie l'allongement progressif de la durée/distance à allure
  modérée et conversationnelle plutôt que la vitesse. Fais progresser le coureur vers
  l'objectif_endurance fourni de façon mesurable semaine après semaine.
- "forme_generale" : plan équilibré et modéré, orienté plaisir et régularité plutôt que
  performance. Varie les types de séance pour éviter la monotonie.

FORMAT DE SORTIE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises Markdown.
- Respecte exactement le schéma fourni par l'utilisateur, y compris pour les champs moins
  pertinents selon l'objectif (ex. vitesse_cible sur un plan perte_poids) : renseigne alors
  une allure indicative plutôt que de laisser le champ vide, pour ne pas casser le parsing
  côté application.
```

Pourquoi cette structure : les règles communes restent volontairement **redondantes** avec le
schéma JSON (les LLM suivent mieux une instruction répétée sous plusieurs formes qu'énoncée une
seule fois), et les règles spécifiques par type évitent qu'un plan "perte de poids" ressemble à
un plan de préparation chronométrée simplement parce que le prompt d'origine était pensé pour
la course à pied de performance.

**Point de vigilance ajouté** : plus un prompt système couvre de cas différents, plus il prend
le risque de diluer la qualité sur chacun (un prompt dédié "course" pourrait donner des plans
plus fins qu'un prompt générique à 4 branches). C'est une hypothèse à vérifier en comparant les
résultats — voir la piste d'amélioration correspondante en Étape 4.

## 4. Prompt USER (données + schéma)

Construit dynamiquement à partir de deux sources (cf. étape 2 §1) :
- les champs **déjà existants** dans `UserProfile` / `UserActivity` (§1.a) ;
- les champs **à créer** via un nouveau formulaire (§1.b), puisque l'app ne collecte pas
  aujourd'hui d'objectif de course ni de disponibilités.

La section "objectif" du prompt change selon `type_objectif` — on n'envoie que les champs
pertinents pour le type choisi, plutôt que d'envoyer tous les champs avec des valeurs vides
pour ceux qui ne s'appliquent pas (un champ vide peut être mal interprété par le modèle,
mieux vaut ne pas l'envoyer du tout).

**Exemple pour `type_objectif = "course"` :**

```text
Voici le profil du coureur :
- Âge : {{age}} ans
- Genre : {{gender}}
- Poids / taille : {{weight}} kg / {{height}} cm
- Volume total déjà parcouru : {{totalDistance}} km sur {{totalSessions}} séances
- Objectif hebdomadaire actuel : {{weeklyGoal}} km/semaine

Nouvelles informations fournies par le coureur pour ce plan :
- Type d'objectif : course
- Distance visée : {{distance_course}}
- Temps cible : {{temps_cible}}
- Date de la course : {{dateCourse}}
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}
- Date de départ du plan : {{dateDebut}}

Historique des séances récentes :
{{sessionsFormatees}}
```

**Exemple pour `type_objectif = "perte_poids"`** (la section objectif change, le reste est identique) :

```text
Nouvelles informations fournies par le coureur pour ce plan :
- Type d'objectif : perte_poids
- Poids actuel : {{poids_actuel}} kg
- Poids visé : {{poids_vise}} kg
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}
- Date de départ du plan : {{dateDebut}}
```

**Exemple pour `type_objectif = "endurance"`** :

```text
Nouvelles informations fournies par le coureur pour ce plan :
- Type d'objectif : endurance
- Objectif d'endurance : {{objectif_endurance}}
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}
- Date de départ du plan : {{dateDebut}}
```

**Pour `type_objectif = "forme_generale"`**, la section objectif se limite à
`- Type d'objectif : forme_generale` — aucun champ chiffré supplémentaire n'est nécessaire.

Le reste du prompt (schéma JSON de sortie) est identique quel que soit le type d'objectif —
c'est justement l'intérêt de garder un schéma de sortie stable : le parsing côté application
n'a pas besoin de connaître le `type_objectif` pour traiter la réponse.

Génère le plan sur 6 semaines au format JSON STRICT suivant :
{
  "objectif": string,
  "duree_semaines": 6,
  "semaines": [
    {
      "numero": number,
      "objectif_semaine": string,
      "sessions": [
        {
          "date": "YYYY-MM-DD",
          "jour": string,
          "type": string,
          "duree_min": number,
          "distance_km": number,
          "vitesse_cible": string,
          "conseil_alimentation": string
        }
      ]
    }
  ]
}
```

## 5. Formatage des données envoyées (historique de sessions)

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

## 6. Génération du prompt côté application (exemple)

```js
// Construit la section "objectif" du prompt selon le type_objectif choisi —
// c'est ici que la logique conditionnelle décrite au §4 prend forme.
function buildObjectifSection(form) {
  switch (form.type_objectif) {
    case "course":
      return `- Type d'objectif : course
- Distance visée : ${form.distance_course}
- Temps cible : ${form.temps_cible}
- Date de la course : ${form.dateCourse}`;

    case "perte_poids":
      return `- Type d'objectif : perte_poids
- Poids actuel : ${form.poids_actuel} kg
- Poids visé : ${form.poids_vise} kg`;

    case "endurance":
      return `- Type d'objectif : endurance
- Objectif d'endurance : ${form.objectif_endurance}`;

    case "forme_generale":
    default:
      return `- Type d'objectif : forme_generale`;
  }
}

function buildUserPrompt(profile, form, sessionsFormatees) {
  return `Voici le profil du coureur :
- Âge : ${profile.age} ans
- Genre : ${profile.gender}
- Poids / taille : ${profile.weight} kg / ${profile.height} cm
- Volume total déjà parcouru : ${profile.totalDistance} km sur ${profile.totalSessions} séances
- Objectif hebdomadaire actuel : ${profile.weeklyGoal} km/semaine

Nouvelles informations fournies par le coureur pour ce plan :
${buildObjectifSection(form)}
- Jours disponibles : ${form.joursDispo.join(", ")}
- Moment préféré : ${form.momentPrefere}
- Durée par séance : ${form.dureeSeance} min
- Contraintes physiques : ${form.contraintes || "aucune"}
- Conseils nutrition souhaités : ${form.conseilsNutrition ? "oui" : "non"}
- Date de départ du plan : ${form.dateDebut}

Historique des séances récentes :
${JSON.stringify(sessionsFormatees, null, 2)}

Génère le plan sur 6 semaines au format JSON STRICT suivant :
{...}` // schéma complet, cf. § 4
}
```

Ce découpage en fonction séparée (`buildObjectifSection`) illustre un principe utile même hors
contexte IA : isoler la partie qui varie (l'objectif) de la partie stable (profil, disponibilités,
historique), plutôt qu'un unique bloc avec des `if` en cascade dans une seule chaîne de
caractères géante — plus lisible et plus facile à tester unitairement.

## 7. Exemple de réponse attendue (extrait)

```json
{
  "objectif": "semi-marathon",
  "duree_semaines": 6,
  "semaines": [
    {
      "numero": 1,
      "objectif_semaine": "Reprise progressive, consolider l'endurance de base",
      "sessions": [
        {
          "date": "2026-06-22",
          "jour": "lundi",
          "type": "endurance",
          "duree_min": 40,
          "distance_km": 6,
          "vitesse_cible": "6:00 min/km",
          "conseil_alimentation": "Repas riche en glucides complexes 3h avant la séance."
        }
      ]
    }
  ]
}
```

**Extrait attendu pour `type_objectif = "perte_poids"`** — même schéma, mais un ton et un
contenu différents (pas de vitesse chronométrée imposée, conseils nutrition orientés déficit
calorique) :

```json
{
  "objectif": "perte_poids",
  "duree_semaines": 6,
  "semaines": [
    {
      "numero": 1,
      "objectif_semaine": "Installer une routine régulière à intensité modérée",
      "sessions": [
        {
          "date": "2026-06-22",
          "jour": "lundi",
          "type": "endurance légère",
          "duree_min": 35,
          "distance_km": 4,
          "vitesse_cible": "allure confortable, sans essoufflement",
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

## 8. Points de vigilance

- **Prompts trop vagues** : demander « fais-moi un plan d'entraînement » sans profil ni
  contraintes produit des séances génériques, potentiellement inadaptées (ex. volume trop élevé
  pour un débutant). Le schéma détaillé + les règles impératives évitent ce piège.
- **Données personnelles sensibles** : le prompt ne doit contenir que les données strictement
  utiles au calcul du plan (objectif, disponibilités, contraintes physiques liées à la course).
  Pas de nom, email, localisation précise, ou toute donnée de santé non nécessaire.
- **Formulations alternatives à tester** : comparer « Tu es un(e) coach sportif(ve) » (neutre)
  et « Tu es un coach de course à pied expérimenté et bienveillant » (actuel) sur le ton des
  conseils nutrition générés, pour vérifier concrètement laquelle donne le ton le plus adapté à
  un public de loisirs. *Non encore testé — à faire lors de l'exécution des requêtes Postman.*
- **Un seul prompt système pour 4 objectifs** : à surveiller particulièrement sur les cas
  `perte_poids` et `endurance`, qui ne sont pas le cas d'usage "par défaut" pour lequel le prompt
  a été pensé initialement (course à pied chronométrée). Vérifier lors des tests Postman
  (§7 ci-dessous) qu'un plan `perte_poids` ne ressemble pas à une préparation de course
  déguisée (vitesse cible imposée, logique de "sortie longue" hors sujet).
