-- Migration : passage du délai en heures fixes à un délai en jours ouvrés,
-- avec horaires/jours d'ouverture paramétrables par pressing.
-- À exécuter une seule fois sur une base déjà créée avec schema.sql (v1).

ALTER TABLE pressings ADD COLUMN delai_standard_jours_ouvres INTEGER DEFAULT 2;
ALTER TABLE pressings ADD COLUMN delai_express_jours_ouvres INTEGER DEFAULT 1;
ALTER TABLE pressings ADD COLUMN jours_ouverts TEXT DEFAULT '1,2,3,4,5,6';
ALTER TABLE pressings ADD COLUMN heure_ouverture TEXT DEFAULT '08:00';
ALTER TABLE pressings ADD COLUMN heure_fermeture TEXT DEFAULT '19:00';

UPDATE pressings SET
  delai_standard_jours_ouvres = 2,
  delai_express_jours_ouvres = 1,
  jours_ouverts = '1,2,3,4,5,6',
  heure_ouverture = '08:00',
  heure_fermeture = '19:00'
WHERE delai_standard_jours_ouvres IS NULL;
