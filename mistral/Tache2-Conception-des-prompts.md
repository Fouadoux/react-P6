# Tâche 2 — Conception des prompts (Sportsee × Mistral)

Objectif : concevoir des prompts précis et bien structurés pour que Mistral produise
un plan d'entraînement sur 6 semaines, fiable et directement exploitable dans React.

---

## 1. Principe : un prompt en 2 messages

| Message | Rôle |
|---|---|
| `system` | Cadre l'IA : son rôle, ses règles, le format de sortie. |
| `user`   | La demande concrète + les données du coureur (issues du formulaire, cf. Tâche 1). |

Règle d'or : **plus le prompt est précis et contraint, plus la réponse est pertinente.**

---

## 2. Les 6 ingrédients d'un bon prompt

1. Rôle de l'IA
2. Mission claire
3. Contraintes à respecter
4. Données d'entrée structurées
5. Format de sortie imposé (JSON)
6. Garde-fous (anti texte libre, anti hallucination)

---

## 3. Prompt SYSTEM (le cadre)

```text
Tu es un coach de course à pied expérimenté et bienveillant.
Ta mission : générer un plan d'entraînement personnalisé sur EXACTEMENT 6 semaines.

RÈGLES IMPÉRATIVES :
- Respecte strictement le niveau, les jours disponibles et les contraintes physiques du coureur.
- Ne programme JAMAIS de séance un jour non disponible.
- Progression réaliste et sécurisée (pas d'augmentation brutale du volume, max ~10%/semaine).
- Inclus au moins une séance "sortie longue" par semaine si l'objectif est une course.
- Pour chaque séance : date, type, durée (min), distance (km), vitesse cible, conseil d'alimentation.
- Si une donnée est manquante, fais une hypothèse raisonnable et reste prudent.

FORMAT DE SORTIE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises Markdown.
- Respecte exactement le schéma fourni par l'utilisateur.
```

---

## 4. Prompt USER (la demande + données)

Construit dynamiquement à partir du formulaire :

```text
Voici le profil du coureur :
- Objectif : {{objectif}}
- Date de la course : {{dateCourse}}
- Temps cible : {{tempsCible}}
- Niveau : {{niveau}}
- Volume actuel : {{kmParSemaine}} km/semaine
- Dernière performance : {{dernierePerf}}
- Jours disponibles : {{joursDispo}}
- Moment préféré : {{momentPrefere}}
- Durée par séance : {{dureeSeance}} min
- Contraintes physiques : {{contraintes}}
- Conseils nutrition souhaités : {{conseilsNutrition}}
- Date de départ du plan : {{dateDebut}}

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
          "type": string,             // ex: "endurance", "fractionné", "sortie longue", "récupération"
          "duree_min": number,
          "distance_km": number,
          "vitesse_cible": string,    // ex: "5:30 min/km"
          "conseil_alimentation": string
        }
      ]
    }
  ]
}
```

---

## 5. Génération du prompt côté React (exemple)

```js
function buildUserPrompt(form) {
  return `Voici le profil du coureur :
- Objectif : ${form.objectif}
- Date de la course : ${form.dateCourse}
- Temps cible : ${form.tempsCible}
- Niveau : ${form.niveau}
- Volume actuel : ${form.kmParSemaine} km/semaine
- Dernière performance : ${form.dernierePerf}
- Jours disponibles : ${form.joursDispo.join(", ")}
- Moment préféré : ${form.momentPrefere}
- Durée par séance : ${form.dureeSeance} min
- Contraintes physiques : ${form.contraintes || "aucune"}
- Conseils nutrition souhaités : ${form.conseilsNutrition ? "oui" : "non"}
- Date de départ du plan : ${form.dateDebut}

Génère le plan sur 6 semaines au format JSON STRICT défini.`;
}

const body = {
  model: "mistral-small-latest",
  temperature: 0.3,
  max_tokens: 2000,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(form) }
  ]
};
```

---

## 6. Bonnes pratiques de prompting appliquées

| Technique | Pourquoi |
|---|---|
| Rôle explicite ("coach expérimenté") | oriente le ton et l'expertise |
| Règles en majuscules / liste | l'IA les respecte mieux |
| Schéma JSON fourni dans le prompt | garantit une réponse parsable |
| `temperature` basse (0.3) | réponses stables et cohérentes |
| `response_format: json_object` | force une sortie JSON |
| "uniquement JSON, sans texte" | évite le texte parasite à parser |

---

## 7. Comment tester (lien Tâche 1)

Reprendre la collection Postman et remplacer le contenu des messages `system` / `user`
par ceux ci-dessus, puis vérifier que la réponse est bien un JSON conforme au schéma.
Itérer sur le prompt jusqu'à obtenir un résultat stable.
