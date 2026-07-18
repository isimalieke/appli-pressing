-- Migration : mode de facturation au kilo (linge en vrac), en plus du suivi pièce par pièce.

ALTER TABLE pressings ADD COLUMN prix_kilo REAL NOT NULL DEFAULT 0;

ALTER TABLE commandes ADD COLUMN mode_facturation TEXT NOT NULL DEFAULT 'detail';
ALTER TABLE commandes ADD COLUMN poids_kg REAL;
