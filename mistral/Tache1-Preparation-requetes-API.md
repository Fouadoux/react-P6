# Tâche 1 — Préparation des requêtes API (Sportsee × Mistral)

Génération d'un plan d'entraînement personnalisé sur 6 semaines via l'API Mistral.

---

## 0. Données collectées auprès de l'utilisateur (formulaire d'onboarding)

Ces informations sont demandées à l'utilisateur **avant** l'appel API. Elles constituent les données d'entrée injectées dans la requête.

### 🎯 Objectif
- Quel est ton objectif principal ? (rester en forme / perdre du poids / préparer une course)
- Si course : quelle distance ? (5 km, 10 km, semi-marathon, marathon)
- As-tu une date d'échéance / date de course ?
- As-tu un temps cible (chrono visé) ?

### 🏃 Niveau & historique
- Quel est ton niveau ? (débutant / intermédiaire / confirmé)
- Depuis combien de temps cours-tu régulièrement ?
- Combien de km par semaine actuellement ?
- Dernière performance connue ? (ex : 5 km en 28 min)
- Blessures / contraintes physiques récentes ?

### 📅 Disponibilités & préférences
- Combien de jours par semaine peux-tu t'entraîner ?
- Quels jours précis ? (lun, mer, sam…)
- À quel moment préfères-tu courir ? (matin / midi / soir)
- Durée disponible par séance ?
- Lieu préféré ? (extérieur, tapis, ville, nature)

### 🥗 Profil & alimentation
- Âge / poids / taille (optionnel)
- Contraintes ou régime alimentaire ? (végétarien, sans gluten…)
- Souhaites-tu des conseils nutrition par séance ?

### ⚙️ Préférences sur le plan
- Plan progressif/prudent ou intensif ?
- Inclure des jours de repos / récupération active ?
- Souhaites-tu de la variété ? (fractionné, sortie longue, allure facile)

### Set minimal retenu (mappé dans la requête)

| Champ | Type | Exemple |
|---|---|---|
| `objectif` | select | "semi-marathon" |
| `dateCourse` | date | "2026-08-03" |
| `tempsCible` | text | "1h50" |
| `niveau` | select | "intermédiaire" |
| `kmParSemaine` | number | 25 |
| `dernierePerf` | text | "8 km en 47 min" |
| `joursDispo` | multi-select | ["lundi","mercredi","samedi"] |
| `momentPrefere` | select | "matin" |
| `dureeSeance` | number (min) | 60 |
| `contraintes` | text | "genou sensible" |
| `conseilsNutrition` | bool | true |

---

## 1. Endpoint

```
POST https://api.mistral.ai/v1/chat/completions
```

Endpoints annexes : `GET /v1/models` (vérifier l'accès + contexte des modèles).

## 2. Headers

```http
Authorization: Bearer {{MISTRAL_API_KEY}}
Content-Type: application/json
Accept: application/json
```

> La clé ne doit jamais être exposée côté front : variable d'environnement en dev, proxy backend en prod.

## 3. Structure des données (body)

```json
{
  "model": "mistral-small-latest",
  "temperature": 0.3,
  "max_tokens": 2000,
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "Tu es un coach de course à pied. Tu génères un plan d'entraînement personnalisé sur 6 semaines. Tu réponds UNIQUEMENT en JSON valide selon le schéma fourni."
    },
    {
      "role": "user",
      "content": "Objectif: semi-marathon | Date course: 2026-08-03 | Temps cible: 1h50 | Niveau: intermédiaire | Volume actuel: 25 km/semaine | Dernière perf: 8 km en 47 min | Jours dispo: lundi, mercredi, samedi | Moment: matin | Durée/séance: 60 min | Contraintes: genou sensible | Conseils nutrition: oui. Retourne le plan au format JSON {objectif, semaines:[{numero, sessions:[{date, type, duree_min, distance_km, vitesse_cible, conseil_alimentation}]}]}"
    }
  ]
}
```

Les valeurs du message `user` proviennent directement des champs du formulaire (section 0).

## 4. Test & documentation (Postman)

- Importer `Sportsee-Mistral.postman_collection.json` + `Sportsee-Mistral.postman_environment.json`.
- Renseigner `MISTRAL_API_KEY`.
- Requête 1 (modèles) → 200 OK = auth validée.
- Requête 2 (plan) → vérifier que `choices[0].message.content` est un JSON parsable.
- Sauvegarder les réponses comme "examples" pour documenter.
