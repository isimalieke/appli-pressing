-- Code PIN pour l'accès aux vues internes (employé/gérant/propriétaire) depuis un appareil
-- partagé au pressing. Filtre minimal pour un pilote — pas une authentification forte.
ALTER TABLE pressing_staff ADD COLUMN code_pin TEXT;
