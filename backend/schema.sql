-- Schéma D1 (SQLite) — version pilote, dérivée de docs/MODELE_DONNEES.md
-- Simplifications assumées pour le pilote : fidélité niveau propriétaire, mode de garde
-- avancé et granularité fine de permissions laissés pour une itération suivante.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  telephone TEXT UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  nom TEXT,
  prenom TEXT,
  -- Civilité (Monsieur/Madame), pour un accueil et des tickets plus personnalisés.
  civilite TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  adresse_principale TEXT,
  lat REAL,
  lng REAL
);

CREATE TABLE pressings (
  id TEXT PRIMARY KEY,
  proprietaire_id TEXT NOT NULL REFERENCES users(id),
  nom TEXT NOT NULL,
  adresse TEXT,
  lat REAL,
  lng REAL,
  rayon_collecte_km REAL DEFAULT 3,
  acompte_pourcent INTEGER DEFAULT 30,
  delai_standard_h INTEGER DEFAULT 48,
  delai_express_h INTEGER DEFAULT 24,
  delai_standard_jours_ouvres INTEGER DEFAULT 2,
  delai_express_jours_ouvres INTEGER DEFAULT 1,
  jours_ouverts TEXT DEFAULT '1,2,3,4,5,6',
  heure_ouverture TEXT DEFAULT '08:00',
  heure_fermeture TEXT DEFAULT '19:00',
  frais_garde_delai_jours INTEGER DEFAULT 30,
  frais_garde_montant_jour REAL DEFAULT 0,
  -- Taux de TVA en %, paramétrable par le propriétaire/gérant (varie selon le pays du pressing,
  -- ex. 18% au Sénégal). 0 par défaut tant qu'il n'est pas renseigné. Les prix du catalogue
  -- (table tarifs) sont saisis TTC ; le HT est déduit à partir de ce taux.
  taux_tva REAL NOT NULL DEFAULT 0,
  -- Prix TTC au kilo pour le linge facturé en vrac (mode 'kilo' des commandes), plutôt qu'à la
  -- pièce. 0 tant que le gérant ne l'a pas configuré.
  prix_kilo REAL NOT NULL DEFAULT 0,
  -- Devise d'affichage des montants (code ISO 4217, ex. XOF pour le Sénégal, EUR). Le propriétaire
  -- peut avoir des pressings dans des pays différents, donc paramétrable par pressing.
  devise TEXT NOT NULL DEFAULT 'XOF',
  -- Numéros marchands pour générer un QR code de paiement au client. Pas d'API de confirmation
  -- automatique à ce stade : le paiement reste confirmé manuellement (cf. enregistrerPaiement).
  numero_marchand_wave TEXT,
  numero_marchand_om TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pressing_staff (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('gerant', 'employe')),
  poste TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  -- Code PIN court pour l'accès aux vues internes (employé/gérant/propriétaire) depuis un
  -- appareil partagé au pressing. Ce n'est pas une authentification forte (pas de mot de passe,
  -- pas de session serveur) : c'est un filtre minimal pour un pilote, à renforcer avant un
  -- déploiement multi-pressing public.
  code_pin TEXT
);

CREATE TABLE soins (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  libelle TEXT NOT NULL,
  description TEXT
);

CREATE TABLE tarifs (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  type_article TEXT NOT NULL,
  soin_id TEXT NOT NULL REFERENCES soins(id),
  prix REAL NOT NULL
);

CREATE TABLE circuits (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  libelle TEXT NOT NULL
);

CREATE TABLE etapes_circuit (
  id TEXT PRIMARY KEY,
  circuit_id TEXT NOT NULL REFERENCES circuits(id),
  ordre INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  poste_associe TEXT
);

CREATE TABLE soins_circuit (
  id TEXT PRIMARY KEY,
  soin_id TEXT NOT NULL REFERENCES soins(id),
  circuit_id TEXT NOT NULL REFERENCES circuits(id)
);

CREATE TABLE creneaux (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  type TEXT NOT NULL CHECK (type IN ('depot', 'retrait')),
  jour_ou_date TEXT,
  heure_debut TEXT,
  heure_fin TEXT,
  capacite_max INTEGER DEFAULT 10,
  mode TEXT NOT NULL CHECK (mode IN ('comptoir', 'domicile'))
);

-- Gabarit hebdomadaire récurrent pour la collecte à domicile (logistique de tournée).
-- Les créneaux réels proposés au client (sur une fenêtre glissante de 7 jours) sont générés
-- dynamiquement à partir de ce gabarit, cf. fonction creneauxDomicileDisponibles.
CREATE TABLE gabarit_creneaux_domicile (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  capacite_max INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE commandes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  numero_ticket TEXT UNIQUE,
  -- 'detail' : suivi pièce par pièce (étiquette par vêtement, comme aujourd'hui).
  -- 'kilo' : linge en vrac facturé au poids, une seule étiquette pour le lot entier.
  mode_facturation TEXT NOT NULL DEFAULT 'detail' CHECK (mode_facturation IN ('detail', 'kilo')),
  poids_kg REAL,
  mode_depot TEXT NOT NULL CHECK (mode_depot IN ('comptoir', 'domicile')),
  mode_retrait TEXT CHECK (mode_retrait IN ('comptoir', 'domicile')),
  creneau_depot_id TEXT REFERENCES creneaux(id),
  creneau_collecte_prevue TEXT,
  creneau_retrait_prevu_id TEXT REFERENCES creneaux(id),
  creneau_retrait_revise TEXT,
  express INTEGER NOT NULL DEFAULT 0,
  -- 'prete' est remplacé par 'prete_retrait' / 'prete_livraison' (le mode de remise, connu dès la
  -- création via mode_depot, distingue déjà la file d'attente comptoir de la file de livraison).
  -- Une fois remise au client, la commande passe à 'terminee' quel que soit le canal (comptoir ou
  -- domicile) : mode_depot reste disponible pour distinguer les deux a posteriori si besoin, sans
  -- dupliquer cette information dans le statut.
  statut TEXT NOT NULL DEFAULT 'creee'
    CHECK (statut IN ('creee', 'deposee', 'en_traitement', 'prete_retrait', 'prete_livraison', 'revisee', 'terminee', 'non_recuperee', 'annulee')),
  prix_total REAL DEFAULT 0,
  montant_ht REAL DEFAULT 0,
  montant_tva REAL DEFAULT 0,
  taux_tva_applique REAL DEFAULT 0,
  montant_acompte REAL DEFAULT 0,
  montant_solde REAL DEFAULT 0,
  date_depot_effectif TEXT,
  date_restitution_prevue TEXT,
  evaluation INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE articles_commande (
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL REFERENCES commandes(id),
  type_article TEXT NOT NULL,
  description TEXT,
  etiquette TEXT,
  reserve TEXT
);

CREATE TABLE article_soins (
  id TEXT PRIMARY KEY,
  article_commande_id TEXT NOT NULL REFERENCES articles_commande(id),
  soin_id TEXT NOT NULL REFERENCES soins(id),
  prix_applique REAL NOT NULL
);

CREATE TABLE article_photos (
  id TEXT PRIMARY KEY,
  article_commande_id TEXT NOT NULL REFERENCES articles_commande(id),
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE article_etapes (
  id TEXT PRIMARY KEY,
  article_commande_id TEXT NOT NULL REFERENCES articles_commande(id),
  ordre INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'validee')),
  valide_par TEXT REFERENCES pressing_staff(id),
  horodatage TEXT
);

CREATE TABLE paiements (
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL REFERENCES commandes(id),
  type TEXT NOT NULL CHECK (type IN ('acompte', 'solde', 'frais_garde')),
  montant REAL NOT NULL,
  moyen TEXT NOT NULL CHECK (moyen IN ('carte_bancaire', 'orange_money', 'wave', 'mtn_momo', 'especes')),
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('en_attente', 'valide', 'echoue', 'rembourse')),
  reference_prestataire TEXT,
  date_paiement TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  destinataire_user_id TEXT NOT NULL REFERENCES users(id),
  commande_id TEXT REFERENCES commandes(id),
  article_commande_id TEXT REFERENCES articles_commande(id),
  type TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'push', 'sms', 'email')),
  texte TEXT NOT NULL,
  envoye_le TEXT NOT NULL DEFAULT (datetime('now')),
  lu INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE fidelite_regles (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  mecanique TEXT NOT NULL CHECK (mecanique IN ('par_montant', 'par_prestations')),
  seuil REAL NOT NULL,
  recompense TEXT NOT NULL
);

CREATE TABLE fidelite_points (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  points_actuels REAL NOT NULL DEFAULT 0,
  UNIQUE (client_id, pressing_id)
);

CREATE INDEX idx_commandes_pressing ON commandes(pressing_id);
CREATE INDEX idx_commandes_client ON commandes(client_id);
CREATE INDEX idx_articles_commande ON articles_commande(commande_id);
CREATE INDEX idx_article_etapes_article ON article_etapes(article_commande_id);
CREATE INDEX idx_pressing_staff_pressing ON pressing_staff(pressing_id);
