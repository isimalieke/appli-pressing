# Modèle de données — APPLI PRESSING

Schéma conceptuel. Types indicatifs (à adapter au SGBD retenu).

## Entités principales

### User (utilisateur applicatif — table racine d'authentification)
- id (PK)
- email
- telephone
- mot_de_passe_hash
- nom, prenom
- created_at

Un `User` porte un ou plusieurs rôles applicatifs : `Client`, ou une entrée dans `PressingStaff` (propriétaire / gérant / employé). Un même compte peut être à la fois client d'un pressing et employé d'un autre — à confirmer selon besoin réel.

### Client
- id (PK)
- user_id (FK → User, unique)
- points_fidelite_total (dérivé, ou calculé via table FidelitePoints par pressing)
- adresse_principale, coordonnées GPS (pour proposer les pressings à proximité)

### Pressing
- id (PK)
- proprietaire_id (FK → User)
- nom, adresse, coordonnées GPS
- rayon_collecte_domicile (optionnel)
- statut (actif / suspendu)
- created_at

### PressingStaff (association employé/gérant ↔ pressing, avec rôle et poste)
- id (PK)
- pressing_id (FK → Pressing)
- user_id (FK → User)
- role (gérant / employé)
- poste (réception, traitement, repassage, caisse, livraison — nullable si gérant)
- droits (liste de permissions ou référence à un profil de droits)
- actif (bool)

### Soin (catalogue défini par le pressing)
- id (PK)
- pressing_id (FK → Pressing)
- libelle (nettoyage, lavage, repassage, ou combinaison/soin personnalisé)
- description

### Circuit (séquence d'étapes de traitement, définie par le pressing)
- id (PK)
- pressing_id (FK → Pressing)
- libelle (ex. « Circuit nettoyage à sec », « Circuit lavage à l'eau »)

### EtapeCircuit (une étape ordonnée dans un circuit)
- id (PK)
- circuit_id (FK → Circuit)
- ordre (entier, position dans la séquence)
- libelle (ex. dépôt et vérification, transport, tri, détachage, lavage à l'eau, nettoyage à sec, séchage, repassage, empaquetage, contrôle qualité, sortie)
- poste_associe (type de poste habilité à valider cette étape, référence à `PressingStaff.poste`)

### SoinCircuit (association entre un soin et le circuit qu'il déclenche)
- id (PK)
- soin_id (FK → Soin)
- circuit_id (FK → Circuit)

Un `Soin` (ex. nettoyage à sec) est associé à un `Circuit` propre. Comme un `ArticleSoin` peut cumuler plusieurs soins, l'article suit en pratique la réunion ordonnée des étapes des circuits associés à ses soins — règle de fusion à préciser techniquement (ex. dédoublonnage des étapes communes comme le contrôle qualité).

### ArticleCircuitEtape (progression d'un article dans son circuit — remplace le suivi au seul niveau commande)
- id (PK)
- article_commande_id (FK → ArticleCommande)
- etape_circuit_id (FK → EtapeCircuit)
- statut (à faire / en cours / validée)
- valide_par (FK → PressingStaff, nullable)
- horodatage (nullable tant que non validée)

Le statut agrégé de la `Commande` (§5.2 du cahier des charges) se déduit de l'état de toutes les `ArticleCircuitEtape` de ses articles : « prête » seulement quand tous les articles ont validé leur dernière étape.

### Tarif (grille de prix)
- id (PK)
- pressing_id (FK → Pressing)
- type_article (chemise, costume, robe, couette, ...)
- soin_id (FK → Soin)
- prix

Un article de commande peut cumuler plusieurs soins ⇒ prix total article = somme des tarifs des soins sélectionnés pour ce type d'article (modèle à valider selon la façon dont le pressing veut tarifer les combinaisons — un tarif dédié « nettoyage + repassage » est aussi possible en alternative).

### CreneauDepot / CreneauRetrait (plages horaires définies par le pressing)
- id (PK)
- pressing_id (FK → Pressing)
- type (depot / retrait)
- jour_semaine ou date spécifique
- heure_debut, heure_fin
- capacite_max
- mode (comptoir / domicile)

### Commande
- id (PK)
- client_id (FK → Client)
- pressing_id (FK → Pressing)
- mode_depot (comptoir / domicile)
- mode_retrait (comptoir / domicile)
- creneau_depot_id (FK)
- creneau_retrait_prevu_id (FK)
- creneau_retrait_reel_id (FK, nullable — si révisé)
- express (bool)
- statut (créée / déposée / en traitement / prête / retirée / non récupérée / annulée)
- prix_total
- montant_acompte
- montant_solde
- date_depot_effectif
- date_restitution_prevue
- date_restitution_revisee (nullable)
- created_at, updated_at

### ArticleCommande
- id (PK)
- commande_id (FK → Commande)
- type_article
- description (optionnel, ex. couleur, particularité)

### ArticleSoin (association article ↔ soins choisis)
- id (PK)
- article_commande_id (FK → ArticleCommande)
- soin_id (FK → Soin)
- prix_applique (copie du tarif au moment de la commande, pour historique)

### Ticket
- id (PK)
- commande_id (FK → Commande, unique)
- numero_ticket
- date_emission
- recapitulatif (snapshot articles/soins/prix — pour traçabilité même si les tarifs changent ensuite)

### Paiement
- id (PK)
- commande_id (FK → Commande)
- type (acompte / solde / frais_garde)
- montant
- moyen (carte_bancaire / orange_money / wave / mtn_momo / especes)
- statut (en attente / validé / échoué / remboursé)
- date_paiement
- reference_prestataire (identifiant transaction côté PSP/agrégateur mobile money, nullable pour espèces)

### SuiviStatut (historique des changements de statut — traçabilité du linge)
- id (PK)
- commande_id (FK → Commande)
- statut
- poste_responsable (FK → PressingStaff, nullable)
- horodatage
- commentaire (optionnel)

### ReglesFidelite (définies par pressing)
- id (PK)
- pressing_id (FK → Pressing)
- mecanique (par montant / par nombre de prestations)
- seuil (ex. 10 prestations, ou 200€ cumulés)
- recompense (ex. soin gratuit, lequel)

### FidelitePoints (solde par client et par pressing)
- id (PK)
- client_id (FK → Client)
- pressing_id (FK → Pressing)
- points_actuels
- historique (table de mouvements séparée recommandée : FideliteMouvement)

### ReglesFideliteProprietaire (programme consolidé optionnel, niveau propriétaire)
- id (PK)
- proprietaire_id (FK → User)
- actif (bool — le propriétaire peut ne pas activer ce niveau)
- mecanique, seuil, recompense (mêmes principes que `ReglesFidelite`, mais appliqués au cumul sur tous les pressings du propriétaire)

### FidelitePointsProprietaire (solde consolidé par client, pour un propriétaire ayant activé le programme)
- id (PK)
- client_id (FK → Client)
- proprietaire_id (FK → User)
- points_actuels

### EvaluationCommande (satisfaction client après retrait)
- id (PK)
- commande_id (FK → Commande, unique)
- note (entier, ex. 1 à 5 étoiles)
- date_evaluation

### PolitiqueGarde (frais de garde configurables par pressing)
- id (PK)
- pressing_id (FK → Pressing)
- delai_global_jours (ex. 30, à partir duquel les frais s'appliquent)
- montant_par_jour
- plafond (nullable)

### Notification
- id (PK)
- destinataire_user_id (FK → User)
- commande_id (FK, nullable)
- article_commande_id (FK, nullable — renseigné uniquement pour une notification d'exception ciblant un article précis, cf. §5.3 du cahier des charges)
- type (confirmation_depot, statut_en_traitement, statut_pret, revision_creneau, rappel_retrait, relance_j0/j3/j7, paiement_confirme, fidelite_credit, exception_article)
- canal (whatsapp / push / SMS / email)
- envoye_le
- lu (bool)

Par défaut, les notifications de progression (`statut_en_traitement`, `statut_pret`) sont agrégées au niveau de la `Commande`, pas envoyées par article — voir l'arbitrage §5.3 du cahier des charges. Le type `exception_article` est le seul à cibler explicitement un `ArticleCommande`.

## Relations clés (résumé)

- Un `Propriétaire` (User) possède plusieurs `Pressing`.
- Un `Pressing` a plusieurs `PressingStaff` (gérants, employés par poste).
- Un `Client` (User) peut passer des commandes dans plusieurs `Pressing`.
- Un `Client` a un solde de fidélité distinct par `Pressing` (via `FidelitePoints`), cohérent avec le fait que chaque pressing définit ses propres règles.
- Une `Commande` appartient à un seul `Client` et un seul `Pressing`, contient plusieurs `ArticleCommande`, chacun avec un ou plusieurs `ArticleSoin`.
- Une `Commande` génère un `Ticket` unique et un historique `SuiviStatut`.
- Une `Commande` a deux `Paiement` attendus (acompte, solde).

## Remarque de conception

Le choix de stocker `prix_applique` sur `ArticleSoin` et un `recapitulatif` figé sur `Ticket` vise à garantir que le client voit toujours le prix qui lui a été annoncé, même si le pressing modifie sa grille tarifaire après coup. Ce point de conception est proposé par prudence métier, pas une exigence exprimée — à confirmer.
