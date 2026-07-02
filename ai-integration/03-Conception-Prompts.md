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

```text
Tu es un coach de course à pied expérimenté et bienveillant.
Ta mission : générer un plan d'entraînement personnalisé sur EXACTEMENT 6 semaines.

RÈGLES IMPÉRATIVES :
- Respecte strictement les jours disponibles et les contraintes physiques du coureur.
- Ne programme JAMAIS de séance un jour non disponible.
- Progression réaliste et sécurisée (pas d'augmentation brutale du volume, max ~10 %/semaine).
- Inclus au moins une séance "sortie longue" par semaine si l'objectif est une course.
- Pour chaque séance : date, type, durée (min), distance (km), vitesse cible, conseil d'alimentation.
- Si une donnée est manquante, fais une hypothèse raisonnable et reste prudent.

FORMAT DE SORTIE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises Markdown.
- Respecte exactement le schéma fourni par l'utilisateur.
```

Pourquoi cette structure : les règles impératives sont volontairement **redondantes** avec le
schéma JSON (elles répètent ce qu'on attend), car les LLM suivent mieux une instruction répétée
plusieurs fois sous des formes différentes qu'une instruction énoncée une seule fois.

## 4. Prompt USER (données + schéma)

Construit dynamiquement à partir de deux sources (cf. étape 2 §1) :
- les champs **déjà existants** dans `UserProfile` / `UserActivity` (§1.a) ;
- les champs **à créer** via un nouveau formulaire (§1.b), puisque l'app ne collecte pas
  aujourd'hui d'objectif de course ni de disponibilités.

```text
Voici le profil du coureur :
- Âge : {{age}} ans
- Genre : {{gender}}
- Poids / taille : {{weight}} kg / {{height}} cm
- Volume total déjà parcouru : {{totalDistance}} km sur {{totalSessions}} séances
- Objectif hebdomadaire actuel : {{weeklyGoal}} km/semaine

Nouvelles informations fournies par le coureur pour ce plan :
- Objectif : {{objectif}}
- Date de la course : {{dateCourse}}
- Temps cible : {{tempsCible}}
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}
- Date de départ du plan : {{dateDebut}}

Historique des séances récentes :
{{sessionsFormatees}}

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
function buildUserPrompt(profile, form, sessionsFormatees) {
  return `Voici le profil du coureur :
- Âge : ${profile.age} ans
- Genre : ${profile.gender}
- Poids / taille : ${profile.weight} kg / ${profile.height} cm
- Volume total déjà parcouru : ${profile.totalDistance} km sur ${profile.totalSessions} séances
- Objectif hebdomadaire actuel : ${profile.weeklyGoal} km/semaine

Nouvelles informations fournies par le coureur pour ce plan :
- Objectif : ${form.objectif}
- Date de la course : ${form.dateCourse}
- Temps cible : ${form.tempsCible}
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
