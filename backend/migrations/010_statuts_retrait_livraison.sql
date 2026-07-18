-- Remplace le statut générique 'prete' par 'prete_retrait' / 'prete_livraison', et distingue la
-- remise finale 'retiree' (comptoir) de 'livree' (domicile), au lieu d'un seul statut 'retiree'
-- pour les deux cas. SQLite ne permet pas de modifier une contrainte CHECK en place : on reconstruit
-- la table.

PRAGMA foreign_keys=OFF;

CREATE TABLE commandes_new (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  numero_ticket TEXT UNIQUE,
  mode_facturation TEXT NOT NULL DEFAULT 'detail' CHECK (mode_facturation IN ('detail', 'kilo')),
  poids_kg REAL,
  mode_depot TEXT NOT NULL CHECK (mode_depot IN ('comptoir', 'domicile')),
  mode_retrait TEXT CHECK (mode_retrait IN ('comptoir', 'domicile')),
  creneau_depot_id TEXT REFERENCES creneaux(id),
  creneau_collecte_prevue TEXT,
  creneau_retrait_prevu_id TEXT REFERENCES creneaux(id),
  creneau_retrait_revise TEXT,
  express INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'creee'
    CHECK (statut IN ('creee', 'deposee', 'en_traitement', 'prete_retrait', 'prete_livraison', 'revisee', 'retiree', 'livree', 'non_recuperee', 'annulee')),
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

INSERT INTO commandes_new
SELECT
  id, client_id, pressing_id, numero_ticket, mode_facturation, poids_kg, mode_depot, mode_retrait,
  creneau_depot_id, creneau_collecte_prevue, creneau_retrait_prevu_id, creneau_retrait_revise, express,
  CASE
    WHEN statut = 'prete' AND mode_depot = 'domicile' THEN 'prete_livraison'
    WHEN statut = 'prete' THEN 'prete_retrait'
    WHEN statut = 'retiree' AND mode_depot = 'domicile' THEN 'livree'
    ELSE statut
  END,
  prix_total, montant_ht, montant_tva, taux_tva_applique, montant_acompte, montant_solde,
  date_depot_effectif, date_restitution_prevue, evaluation, created_at, updated_at
FROM commandes;

DROP TABLE commandes;
ALTER TABLE commandes_new RENAME TO commandes;

CREATE INDEX idx_commandes_pressing ON commandes(pressing_id);
CREATE INDEX idx_commandes_client ON commandes(client_id);

PRAGMA foreign_keys=ON;
