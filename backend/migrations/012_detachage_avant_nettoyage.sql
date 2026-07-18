-- Le détachage (pré-traitement des taches) doit se faire avant le nettoyage à sec / lavage, pas
-- après. Reclasse "Détachage" dans sa propre phase (poste_associe = 'detachage'), classée juste
-- après la réception dans le tri par phase (cf. rangPhase dans validerInventaire côté backend).
-- Générique par libellé plutôt que par circuit_id : s'applique à tout pressing existant ou futur,
-- pas seulement au pressing de démonstration.
UPDATE etapes_circuit SET poste_associe = 'detachage' WHERE libelle = 'Détachage';
