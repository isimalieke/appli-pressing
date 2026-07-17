-- Migration : créneaux de collecte à domicile générés dynamiquement à partir d'un gabarit
-- hebdomadaire, au lieu de lignes fixes dans `creneaux`.

CREATE TABLE IF NOT EXISTS gabarit_creneaux_domicile (
  id TEXT PRIMARY KEY,
  pressing_id TEXT NOT NULL REFERENCES pressings(id),
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  capacite_max INTEGER NOT NULL DEFAULT 3
);

ALTER TABLE commandes ADD COLUMN creneau_collecte_prevue TEXT;

-- Gabarit de démonstration pour p1 : 5 blocs de 2h, du lundi au samedi, capacité 3 collectes/bloc.
-- (INSERT ... VALUES explicite : D1 limite les SELECT composés à 5 termes.)
INSERT INTO gabarit_creneaux_domicile (id, pressing_id, jour_semaine, heure_debut, heure_fin, capacite_max) VALUES
  ('gcd-p1-1-1', 'p1', 1, '08:00', '10:00', 3),
  ('gcd-p1-1-2', 'p1', 1, '10:00', '12:00', 3),
  ('gcd-p1-1-3', 'p1', 1, '12:00', '14:00', 3),
  ('gcd-p1-1-4', 'p1', 1, '14:00', '16:00', 3),
  ('gcd-p1-1-5', 'p1', 1, '16:00', '18:00', 3),
  ('gcd-p1-2-1', 'p1', 2, '08:00', '10:00', 3),
  ('gcd-p1-2-2', 'p1', 2, '10:00', '12:00', 3),
  ('gcd-p1-2-3', 'p1', 2, '12:00', '14:00', 3),
  ('gcd-p1-2-4', 'p1', 2, '14:00', '16:00', 3),
  ('gcd-p1-2-5', 'p1', 2, '16:00', '18:00', 3),
  ('gcd-p1-3-1', 'p1', 3, '08:00', '10:00', 3),
  ('gcd-p1-3-2', 'p1', 3, '10:00', '12:00', 3),
  ('gcd-p1-3-3', 'p1', 3, '12:00', '14:00', 3),
  ('gcd-p1-3-4', 'p1', 3, '14:00', '16:00', 3),
  ('gcd-p1-3-5', 'p1', 3, '16:00', '18:00', 3),
  ('gcd-p1-4-1', 'p1', 4, '08:00', '10:00', 3),
  ('gcd-p1-4-2', 'p1', 4, '10:00', '12:00', 3),
  ('gcd-p1-4-3', 'p1', 4, '12:00', '14:00', 3),
  ('gcd-p1-4-4', 'p1', 4, '14:00', '16:00', 3),
  ('gcd-p1-4-5', 'p1', 4, '16:00', '18:00', 3),
  ('gcd-p1-5-1', 'p1', 5, '08:00', '10:00', 3),
  ('gcd-p1-5-2', 'p1', 5, '10:00', '12:00', 3),
  ('gcd-p1-5-3', 'p1', 5, '12:00', '14:00', 3),
  ('gcd-p1-5-4', 'p1', 5, '14:00', '16:00', 3),
  ('gcd-p1-5-5', 'p1', 5, '16:00', '18:00', 3),
  ('gcd-p1-6-1', 'p1', 6, '08:00', '10:00', 3),
  ('gcd-p1-6-2', 'p1', 6, '10:00', '12:00', 3),
  ('gcd-p1-6-3', 'p1', 6, '12:00', '14:00', 3),
  ('gcd-p1-6-4', 'p1', 6, '14:00', '16:00', 3),
  ('gcd-p1-6-5', 'p1', 6, '16:00', '18:00', 3);
