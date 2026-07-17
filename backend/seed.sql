-- Données de démonstration, reprenant les pressings mock du frontend (src/data/mock.js)
-- pour pouvoir tester l'API de bout en bout avant de brancher le vrai frontend dessus.

INSERT INTO users (id, email, telephone, mot_de_passe_hash, nom, prenom) VALUES
  ('u-owner', 'proprietaire@example.com', '+221700000001', 'x', 'Lieke', 'Isima'),
  ('u-gerant1', 'gerant1@example.com', '+221700000002', 'x', 'Diop', 'Fatou'),
  ('u-client1', 'client1@example.com', '+221700000003', 'x', 'Client', 'Test');

INSERT INTO clients (id, user_id, adresse_principale) VALUES
  ('c-1', 'u-client1', '12 rue des Lilas');

INSERT INTO pressings (id, proprietaire_id, nom, adresse, rayon_collecte_km, acompte_pourcent, delai_standard_h, delai_express_h, delai_standard_jours_ouvres, delai_express_jours_ouvres, jours_ouverts, heure_ouverture, heure_fermeture, frais_garde_delai_jours, frais_garde_montant_jour) VALUES
  ('p1', 'u-owner', 'Pressing du Marché', '12 avenue de la République', 3, 30, 48, 24, 2, 1, '1,2,3,4,5,6', '08:00', '19:00', 30, 0.5),
  ('p2', 'u-owner', 'Clean Express', '5 rue des Lilas', 5, 40, 48, 12, 2, 1, '1,2,3,4,5,6', '08:00', '19:00', 30, 0.3);

INSERT INTO pressing_staff (id, pressing_id, user_id, role, poste) VALUES
  ('ps-1', 'p1', 'u-gerant1', 'gerant', NULL);

INSERT INTO soins (id, pressing_id, libelle) VALUES
  ('s-p1-lavage', 'p1', 'Lavage à l''eau'),
  ('s-p1-nettoyage', 'p1', 'Nettoyage à sec'),
  ('s-p1-repassage', 'p1', 'Repassage'),
  ('s-p2-lavage', 'p2', 'Lavage à l''eau'),
  ('s-p2-nettoyage', 'p2', 'Nettoyage à sec'),
  ('s-p2-repassage', 'p2', 'Repassage');

INSERT INTO tarifs (id, pressing_id, type_article, soin_id, prix) VALUES
  ('t-1', 'p1', 'Générique', 's-p1-lavage', 3.5),
  ('t-2', 'p1', 'Générique', 's-p1-nettoyage', 5.0),
  ('t-3', 'p1', 'Générique', 's-p1-repassage', 2.0),
  ('t-4', 'p2', 'Générique', 's-p2-lavage', 3.0),
  ('t-5', 'p2', 'Générique', 's-p2-nettoyage', 4.5),
  ('t-6', 'p2', 'Générique', 's-p2-repassage', 1.5);

INSERT INTO circuits (id, pressing_id, libelle) VALUES
  ('cir-p1-lavage', 'p1', 'Circuit lavage à l''eau'),
  ('cir-p1-nettoyage', 'p1', 'Circuit nettoyage à sec'),
  ('cir-p1-repassage', 'p1', 'Circuit repassage seul');

INSERT INTO soins_circuit (id, soin_id, circuit_id) VALUES
  ('sc-1', 's-p1-lavage', 'cir-p1-lavage'),
  ('sc-2', 's-p1-nettoyage', 'cir-p1-nettoyage'),
  ('sc-3', 's-p1-repassage', 'cir-p1-repassage');

INSERT INTO etapes_circuit (id, circuit_id, ordre, libelle, poste_associe) VALUES
  ('e-1', 'cir-p1-lavage', 0, 'Dépôt et vérification', 'reception'),
  ('e-2', 'cir-p1-lavage', 1, 'Tri', 'reception'),
  ('e-3', 'cir-p1-lavage', 2, 'Lavage à l''eau', 'lavage'),
  ('e-4', 'cir-p1-lavage', 3, 'Séchage', 'lavage'),
  ('e-5', 'cir-p1-lavage', 4, 'Repassage', 'repassage'),
  ('e-6', 'cir-p1-lavage', 5, 'Contrôle qualité', 'controle'),
  ('e-7', 'cir-p1-lavage', 6, 'Empaquetage', 'controle'),
  ('e-8', 'cir-p1-nettoyage', 0, 'Dépôt et vérification', 'reception'),
  ('e-9', 'cir-p1-nettoyage', 1, 'Tri', 'reception'),
  ('e-10', 'cir-p1-nettoyage', 2, 'Détachage', 'nettoyage'),
  ('e-11', 'cir-p1-nettoyage', 3, 'Nettoyage à sec', 'nettoyage'),
  ('e-12', 'cir-p1-nettoyage', 4, 'Contrôle qualité', 'controle'),
  ('e-13', 'cir-p1-nettoyage', 5, 'Empaquetage', 'controle'),
  ('e-14', 'cir-p1-repassage', 0, 'Dépôt et vérification', 'reception'),
  ('e-15', 'cir-p1-repassage', 1, 'Repassage', 'repassage'),
  ('e-16', 'cir-p1-repassage', 2, 'Contrôle qualité', 'controle'),
  ('e-17', 'cir-p1-repassage', 3, 'Empaquetage', 'controle');

-- Le dépôt/retrait au comptoir n'utilise plus de créneau : le client vient pendant les horaires
-- d'ouverture (jours_ouverts/heure_ouverture/heure_fermeture du pressing). Les créneaux restants
-- servent uniquement à la collecte à domicile (logistique réelle) et à la révision manuelle du
-- retrait par le personnel (Employe.jsx).
INSERT INTO creneaux (id, pressing_id, type, jour_ou_date, heure_debut, heure_fin, mode) VALUES
  ('cd-3', 'p1', 'depot', 'demain', '09:00', '11:00', 'domicile'),
  ('cr-1', 'p1', 'retrait', 'apres-demain', '14:00', '16:00', 'comptoir'),
  ('cr-2', 'p1', 'retrait', 'apres-demain', '16:00', '18:00', 'comptoir');

INSERT INTO fidelite_regles (id, pressing_id, mecanique, seuil, recompense) VALUES
  ('fr-1', 'p1', 'par_prestations', 10, 'Un repassage offert');
