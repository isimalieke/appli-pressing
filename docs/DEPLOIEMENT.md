# Déploiement — GitHub + Cloudflare (plan gratuit)

## Vue d'ensemble

- **GitHub** (`isimalieke/appli-pressing`) : hébergement du code source.
- **Front (PWA)** : `mobile-pwa/`, déployé sur **Cloudflare Workers** via l'intégration directe GitHub de Cloudflare (Workers & Pages → Import an existing Git repository). Chaque push sur `main` redéploie automatiquement. URL actuelle : `https://appli-pressing.isima-lieke.workers.dev`.
- **Backend (API)** : `backend/`, un Worker séparé exposant une API REST, branché sur **Cloudflare D1** (base SQL).
- Le fichier `.github/workflows/deploy-pwa.yml` préparé initialement n'est plus utilisé — l'intégration directe Cloudflare↔GitHub remplace ce mécanisme pour le front. Il peut être supprimé ou laissé inactif.

## Front — déjà en place

Root directory : `mobile-pwa`, build command `npm run build`, deploy command `npx wrangler deploy` (config dans `mobile-pwa/wrangler.jsonc`). Rien à refaire ici sauf changement de configuration.

## Backend — mise en place (nouveau)

1. Depuis le dossier `backend/`, installer Wrangler : `npm install`.
2. Créer la base D1 : `npx wrangler d1 create appli-pressing-db`. La commande affiche un `database_id` à copier.
3. Coller ce `database_id` dans `backend/wrangler.jsonc`, à la place de `REMPLACER_APRES_wrangler_d1_create`.
4. Appliquer le schéma en local pour tester : `npm run db:migrate:local` puis `npm run db:seed:local` (données de démonstration, mêmes pressings que le frontend mock).
5. Lancer le serveur de développement local : `npm run dev` (démarre sur `http://localhost:8787` par défaut).
6. Une fois testé, appliquer le schéma en production : `npm run db:migrate:remote` (et `db:seed:remote` si des données de démonstration sont souhaitées en ligne).
7. Déployer le Worker : `npm run deploy`. Cloudflare affiche l'URL du type `appli-pressing-api.<compte>.workers.dev`.
8. Pour un déploiement continu comme le front, ce Worker peut aussi être connecté à GitHub via Workers & Pages → Import an existing Git repository, avec `Root directory` = `backend` et `Deploy command` = `npx wrangler deploy` (pas de build command nécessaire, pas de framework).

## Non couvert à ce stade

- **Authentification** : l'API backend est actuellement ouverte, sans vérification d'identité — à traiter avant tout usage avec de vraies données clients (étape 2 du plan de développement).
- **Connexion frontend ↔ backend** : le frontend (`mobile-pwa`) utilise encore des données en mémoire locale (`AppContext.jsx` + `localStorage`), pas encore les appels à cette API.
- **Paiement et WhatsApp réels** : voir `docs/CAHIER_DES_CHARGES.md` §11 et §6 pour les options envisagées, y compris des versions simplifiées pour un pilote.
- Nom de domaine personnalisé : un sous-domaine `*.workers.dev` gratuit est utilisé par défaut ; un domaine personnalisé peut être ajouté séparément dans Cloudflare.
