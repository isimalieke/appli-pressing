# Déploiement — GitHub + Cloudflare (plan gratuit)

## Vue d'ensemble

- **GitHub** : hébergement du code source, déclenche le déploiement à chaque push sur `main`.
- **Cloudflare Pages** : hébergement statique de la PWA (`mobile-pwa/`) — gratuit sur le plan actuel de Cloudflare pour un usage standard (limites : builds/mois, bande passante — à vérifier sur cloudflare.com au moment de l'inscription, ces limites évoluent).
- **Cloudflare Workers** (si besoin d'API) et **Cloudflare D1** (base SQL) : également disponibles en plan gratuit avec quotas (nombre de requêtes/jour, stockage) — à valider selon le volume réel attendu.

## Étapes de mise en place

1. Créer le dépôt sur GitHub et y pousser ce projet (`git remote add origin <url>` puis `git push -u origin main`).
2. Créer un compte Cloudflare (gratuit) si ce n'est pas déjà fait.
3. Dans Cloudflare, créer un projet Pages nommé `appli-pressing` (nom utilisé dans le workflow `deploy-pwa.yml` — à adapter si un autre nom est choisi).
4. Générer un **API Token** Cloudflare avec les permissions Pages:Edit (Cloudflare dashboard → My Profile → API Tokens).
5. Récupérer l'**Account ID** Cloudflare (visible sur le dashboard, dans la barre latérale de n'importe quel domaine/compte).
6. Dans GitHub, aller dans Settings → Secrets and variables → Actions, et ajouter :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
7. Chaque push sur `main` modifiant `mobile-pwa/` déclenche le workflow `.github/workflows/deploy-pwa.yml`, qui build et déploie automatiquement sur Cloudflare Pages.

## Non couvert à ce stade

- Backend/API (Cloudflare Workers) : pas encore scaffoldé, à faire dans une étape suivante une fois le modèle de données validé.
- Base de données (Cloudflare D1 ou autre) : à choisir.
- Nom de domaine personnalisé : Cloudflare Pages fournit un sous-domaine gratuit (`*.pages.dev`) par défaut ; un domaine personnalisé peut être ajouté séparément.
