-- Données de démonstration, reprenant les pressings mock du frontend (src/data/mock.js)
-- pour pouvoir tester l'API de bout en bout avant de brancher le vrai frontend dessus.

INSERT INTO users (id, email, telephone, mot_de_passe_hash, nom, prenom) VALUES
  ('u-owner', 'proprietaire@example.com', '+221700000001', 'x', 'Lieke', 'Isima'),
  ('u-gerant1', 'gerant1@example.com', '+221700000002', 'x', 'Diop', 'Fatou'),
  ('u-employe1', 'employe1@example.com', '+221700000004', 'x', 'Ndiaye', 'Moussa'),
  ('u-client1', 'client1@example.com', '+221700000003', 'x', 'Client', 'Test');

INSERT INTO clients (id, user_id, adresse_principale) VALUES
  ('c-1', 'u-client1', '12 rue des Lilas');

INSERT INTO pressings (id, proprietaire_id, nom, adresse, rayon_collecte_km, acompte_pourcent, delai_standard_h, delai_express_h, delai_standard_jours_ouvres, delai_express_jours_ouvres, jours_ouverts, heure_ouverture, heure_fermeture, frais_garde_delai_jours, frais_garde_montant_jour, taux_tva, prix_kilo, devise) VALUES
  ('p1', 'u-owner', 'Pressing du Marché', '12 avenue de la République', 3, 30, 48, 24, 2, 1, '1,2,3,4,5,6', '08:00', '19:00', 30, 0.5, 18, 1.5, 'XOF'),
  ('p2', 'u-owner', 'Clean Express', '5 rue des Lilas', 5, 40, 48, 12, 2, 1, '1,2,3,4,5,6', '08:00', '19:00', 30, 0.3, 0, 0, 'EUR');

INSERT INTO pressing_staff (id, pressing_id, user_id, role, poste, code_pin) VALUES
  ('ps-1', 'p1', 'u-gerant1', 'gerant', NULL, '1234'),
  ('ps-2', 'p1', 'u-employe1', 'employe', 'Comptoir', '5678');

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
  ('e-10', 'cir-p1-nettoyage', 3, 'Nettoyage à sec', 'nettoyage'),
  ('e-11', 'cir-p1-nettoyage', 2, 'Détachage', 'detachage'),
  ('e-12', 'cir-p1-nettoyage', 4, 'Contrôle qualité', 'controle'),
  ('e-13', 'cir-p1-nettoyage', 5, 'Empaquetage', 'controle'),
  ('e-14', 'cir-p1-repassage', 0, 'Dépôt et vérification', 'reception'),
  ('e-15', 'cir-p1-repassage', 1, 'Repassage', 'repassage'),
  ('e-16', 'cir-p1-repassage', 2, 'Contrôle qualité', 'controle'),
  ('e-17', 'cir-p1-repassage', 3, 'Empaquetage', 'controle');

-- Le dépôt/retrait au comptoir n'utilise plus de créneau : le client vient pendant les horaires
-- d'ouverture (jours_ouverts/heure_ouverture/heure_fermeture du pressing). Les créneaux de
-- collecte à domicile sont générés dynamiquement depuis gabarit_creneaux_domicile (cf. plus bas).
-- Ceux qui restent ici servent à la révision manuelle du retrait par le personnel (Employe.jsx).
INSERT INTO creneaux (id, pressing_id, type, jour_ou_date, heure_debut, heure_fin, mode) VALUES
  ('cr-1', 'p1', 'retrait', 'apres-demain', '14:00', '16:00', 'comptoir'),
  ('cr-2', 'p1', 'retrait', 'apres-demain', '16:00', '18:00', 'comptoir');

-- Gabarit hebdomadaire de collecte à domicile pour p1 : 5 blocs de 2h, lundi à samedi,
-- capacité 3 collectes par bloc. (INSERT ... VALUES explicite : D1 limite les SELECT composés
-- à 5 termes, une génération par UNION/CROSS JOIN échoue au-delà.)
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

INSERT INTO fidelite_regles (id, pressing_id, mecanique, seuil, recompense) VALUES
  ('fr-1', 'p1', 'par_prestations', 10, 'Un repassage offert');
