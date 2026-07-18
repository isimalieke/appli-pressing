-- Migration : taux de TVA paramétrable par pressing + décomposition HT/TVA/TTC sur les commandes.
-- Les prix du catalogue (table tarifs) sont considérés TTC ; le HT est déduit par calcul.

ALTER TABLE pressings ADD COLUMN taux_tva REAL NOT NULL DEFAULT 0;

ALTER TABLE commandes ADD COLUMN montant_ht REAL DEFAULT 0;
ALTER TABLE commandes ADD COLUMN montant_tva REAL DEFAULT 0;
ALTER TABLE commandes ADD COLUMN taux_tva_applique REAL DEFAULT 0;
