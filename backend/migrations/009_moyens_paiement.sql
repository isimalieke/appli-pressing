-- Numéros marchands Wave / Orange Money du pressing, pour générer un QR code de paiement.
-- Pas d'intégration API (webhook de confirmation automatique) à ce stade — la confirmation
-- du paiement reste manuelle, cf. commentaire sur enregistrerPaiement.
ALTER TABLE pressings ADD COLUMN numero_marchand_wave TEXT;
ALTER TABLE pressings ADD COLUMN numero_marchand_om TEXT;
