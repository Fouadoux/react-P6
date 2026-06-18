# Tâche 3 — Formatage des données & gestion du contexte (Sportsee × Mistral)

Objectif : structurer proprement les données des sessions précédentes envoyées à Mistral,
et choisir le modèle en fonction de la taille de contexte disponible.

---

## 1. La taille du contexte (rappel)

Le "contexte" = ce que l'IA peut lire en une fois, mesuré en **tokens** (~1 token ≈ 0,75 mot).
Il comprend TOUT : prompt système + données envoyées + réponse générée.

| Modèle | Contexte | Coût | Choix Sportsee |
|---|---|---|---|
| Mistral Small 3.x | ~128k tokens | le moins cher | ✅ recommandé |
| Mistral Medium 3.x | ~128k tokens | moyen | optionnel |
| Mistral Large 2 | ~128k tokens | le plus cher | overkill |

Notre besoin (profil + historique) tient en quelques milliers de tokens → `mistral-small-latest` suffit largement.

---

## 2. Pourquoi bien formater les sessions précédentes ?

L'IA personnalise le plan à partir de l'historique du coureur (régularité, allure, progression).
Des données mal structurées = réponse moins pertinente et tokens gaspillés.

Objectifs du formatage :
- **Clarté** : champs explicites et homogènes.
- **Compacité** : ne garder que l'utile (économiser des tokens).
- **Constance** : toujours le même format (l'IA s'appuie sur la régularité).

---

## 3. Format recommandé des sessions (JSON compact)

```json
{
  "sessions_precedentes": [
    { "date": "2026-06-10", "type": "endurance",    "distance_km": 5, "duree_min": 28, "allure_min_km": "5:36", "ressenti": "facile" },
    { "date": "2026-06-13", "type": "sortie longue", "distance_km": 8, "duree_min": 47, "allure_min_km": "5:52", "ressenti": "moyen" },
    { "date": "2026-06-15", "type": "fractionné",    "distance_km": 6, "duree_min": 33, "allure_min_km": "5:30", "ressenti": "difficile" }
  ]
}
```

Champs clés et utiles : `date`, `type`, `distance_km`, `duree_min`, `allure_min_km`, `ressenti`.
On évite les champs inutiles (id technique, coordonnées GPS brutes…) qui gonflent le contexte.

---

## 4. Stratégie si l'historique est volumineux

Même si 128k tokens est confortable, on garde de bonnes pratiques :

1. **Limiter la fenêtre** : n'envoyer que les N dernières séances (ex : 4 dernières semaines).
2. **Agréger / résumer** : plutôt que 100 séances brutes, envoyer un résumé hebdo :
   ```json
   { "semaine": "2026-W23", "nb_sorties": 3, "km_total": 19, "allure_moy_min_km": "5:39" }
   ```
3. **Trier par pertinence** : sessions récentes > anciennes.
4. **Arrondir les valeurs** (pas besoin de 5,73821 km → 5,7 km).

---

## 5. Mise en forme côté React (exemple)

```js
// On transforme les données brutes de l'app en format compact pour Mistral
function formatSessions(rawSessions, limit = 12) {
  return rawSessions
    .slice(-limit) // ne garder que les plus récentes
    .map(s => ({
      date: s.date,
      type: s.type,
      distance_km: Math.round(s.distance * 10) / 10,
      duree_min: Math.round(s.duration / 60),
      allure_min_km: paceToStr(s.duration, s.distance),
      ressenti: s.feeling ?? "non renseigné"
    }));
}

// Estimation simple du nombre de tokens (1 token ~ 4 caractères)
function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}
```

---

## 6. Injection dans le prompt (lien Tâches 1 & 2)

Les sessions formatées sont ajoutées au message `user` :

```js
const userContent = `${buildUserPrompt(form)}

Historique des séances récentes :
${JSON.stringify(formatSessions(sessions), null, 2)}

Tiens compte de cette progression pour calibrer le plan.`;
```

Body final envoyé :
```json
{
  "model": "mistral-small-latest",
  "temperature": 0.3,
  "max_tokens": 2000,
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "...profil + sessions formatées..." }
  ]
}
```

---

## 7. Récap de la chaîne complète (Tâches 1 → 3)

```
Formulaire (T1)  +  Historique formaté (T3)
            │
            ▼
   Prompt structuré (T2)
            │
            ▼
POST /v1/chat/completions (T1)  -- modèle: mistral-small-latest (T3)
            │
            ▼
   Plan JSON sur 6 semaines  →  affiché dans React
```
