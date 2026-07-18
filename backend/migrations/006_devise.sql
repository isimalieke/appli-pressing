-- Migration : devise d'affichage paramétrable par pressing (au lieu de EUR fixe côté frontend).

ALTER TABLE pressings ADD COLUMN devise TEXT NOT NULL DEFAULT 'XOF';
