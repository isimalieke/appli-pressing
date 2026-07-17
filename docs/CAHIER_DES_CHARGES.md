# Cahier des charges — Application Pressing (nom provisoire : APPLI PRESSING)

Statut : brouillon de travail. Les valeurs marquées **[à valider]** sont des propositions par défaut, pas des décisions arrêtées.

## 1. Objectif

Application mobile (+ back-office) permettant à des pressings de quartier / PME de gérer le cycle complet d'une commande de nettoyage/lavage/repassage : prise de commande (à distance ou au comptoir), collecte, suivi, traitement, restitution, paiement et fidélisation.

## 2. Rôles et permissions

| Rôle | Portée | Droits principaux |
|---|---|---|
| Propriétaire | Un ou plusieurs pressings | Crée des pressings, nomme des gérants (peut se nommer gérant lui-même), consulte un tableau de bord consolidé tous établissements, accède aux données financières globales |
| Gérant | Un pressing | Configure le pressing (soins, tarifs, créneaux, règles de fidélité), gère les employés, supervise les commandes, valide révisions de délai/créneau |
| Employé | Un pressing, un poste (ex : réception, traitement, repassage, caisse) | Actions limitées à son poste : enregistrement dépôt, mise à jour statut, encaissement, préparation retrait — selon droits accordés par le gérant |
| Client | Compte unique, multi-pressings | Recherche un pressing par localisation, dépose/programme une collecte, suit sa commande, paie, cumule et utilise des points de fidélité par pressing |

Décision : la fidélité fonctionne à deux niveaux — un programme propre à chaque pressing (défini par son gérant), et un programme optionnel consolidé activable par le propriétaire pour l'ensemble de ses pressings (cf. §9).

## 3. Parcours client

1. Le client choisit un pressing (recherche par localisation / liste de pressings utilisés).
2. Il choisit le mode de dépôt :
   - Dépôt au pressing, sur une plage horaire définie par le pressing.
   - Collecte à domicile, sur une plage horaire définie par le pressing.
3. Il sélectionne les articles et, pour chacun, le ou les soins souhaités (nettoyage, lavage, repassage — cumulables), parmi la liste et la grille tarifaire définies par le pressing.
4. Un ticket est généré au moment du dépôt effectif (au comptoir ou à la collecte), avec récapitulatif : liste des articles, soins choisis, prix total, date/heure de dépôt, date/heure de restitution prévue, créneau de retrait.
5. Le client règle un acompte (cf. §6).
6. Le client suit sa commande en temps réel (statuts, cf. §5).
7. Le pressing peut réviser la date/le créneau de restitution (cf. §7) ; le client en est notifié.
8. Au retrait ou à la livraison, le client règle le solde et récupère son linge.
9. Le client note la prestation par une évaluation simple (étoiles), sans commentaire libre en V1.

## 4. Configuration par le pressing

Chaque pressing (via son gérant) définit :

- **Catalogue de soins** : nettoyage à sec, lavage, repassage, et toute combinaison ou soin additionnel propre au pressing.
- **Grille tarifaire** : prix par article et par soin (ou par combinaison de soins).
- **Plages horaires de dépôt** et **plages horaires de retrait/livraison**, avec capacité (nombre de créneaux disponibles).
- **Zone de collecte à domicile** (si proposée) : rayon fixe en kilomètres autour du pressing, et éventuels frais associés.
- **Règles de fidélité** (cf. §9).
- **Règles d'acompte** (cf. §6).
- **Offre express** et son surcoût (cf. §8).

## 5. Cycle de vie d'une commande

### 5.1 Circuit configurable par pressing

Le gérant (ou le propriétaire) définit le circuit de traitement de son pressing : la séquence d'étapes que suit le linge, par exemple dépôt et vérification, transport vers le point de nettoyage, tri, détachage, lavage à l'eau ou nettoyage à sec, séchage, repassage, empaquetage, contrôle qualité, sortie vers point de retrait ou livraison à domicile.

Point de conception important : tous les articles d'une même commande ne suivent pas nécessairement le même circuit — un vêtement en lavage à l'eau et un autre en nettoyage à sec empruntent des étapes différentes au sein de la même commande. Le circuit est donc rattaché au **type de soin** (ou à une combinaison de soins), et chaque `ArticleCommande` progresse individuellement dans le circuit correspondant à ses soins choisis, indépendamment des autres articles de la commande.

Chaque étape est validée manuellement par l'employé du poste concerné via un bouton dédié dans l'application, horodatée et attribuée à l'employé (`PressingStaff`) qui l'a effectuée — traçabilité déjà prévue dans la table `SuiviStatut` du modèle de données, désormais rattachée à l'article plutôt qu'à la seule commande.

### 5.2 Statuts de commande (vue d'ensemble, agrégée depuis les articles)

1. Créée (commande enregistrée, avant dépôt physique)
2. Déposée / Collectée (ticket généré, inventaire et réserves saisis, acompte réglé)
3. En traitement (au moins un article a franchi une étape de son circuit sans que tous les articles soient prêts)
4. Prête (tous les articles de la commande ont terminé leur circuit)
5. Révisée (si le pressing modifie date/créneau — coexiste avec le statut courant, génère une notification)
6. Retirée / Livrée (solde réglé, linge remis)
7. Non récupérée (délai dépassé, relances déclenchées — cf. §8)
8. Annulée

### 5.3 Granularité des notifications client — arbitrage à trancher **[à valider]**

Notifier à chaque étape et pour chaque article individuellement peut représenter plusieurs dizaines de messages pour une seule commande à plusieurs articles et plusieurs circuits, avec trois conséquences concrètes : un coût direct (l'API WhatsApp Business facture les messages modèles envoyés hors fenêtre de conversation de 24h), un risque que le client désactive les notifications faute d'en voir l'utilité, et une charge opérationnelle supplémentaire pour le personnel si la validation doit se faire vêtement par vêtement plutôt que par lot.

Décision : suivi interne complet par article et par étape (traçabilité totale, consultable à la demande dans l'écran de suivi client), mais notifications push/WhatsApp agrégées au niveau de la commande sur un nombre limité de jalons (déposée, en traitement, prête, retirée), complétées par une notification d'exception si un article précis prend du retard ou déclenche un incident (tache non partie, dommage constaté).

## 6. Paiement : acompte et solde

- À la création du ticket, le prix total est connu et affiché au client.
- Un acompte est exigé au dépôt, calculé en **pourcentage du prix total**, configurable par pressing (proposition de valeur par défaut : 30 %, modifiable par le gérant).
- Le solde est réglé au retrait, avant ou au moment de la remise du linge.
- Moyens de paiement retenus pour le lancement : **mobile money** (Orange Money, Wave, MTN MoMo — priorité pour le contexte visé), **espèces au comptoir** (pointage par l'employé côté caisse), et **carte bancaire in-app** (nécessite un PSP compatible carte, ex. Stripe ou équivalent local — prestataire à choisir).

## 7. Délai de traitement et cas express

- Délai standard : 48 heures entre le dépôt effectif et la disponibilité du linge.
- Offre express : délai réduit à 24 heures, avec majoration tarifaire définie par le pressing.
- Le pressing (gérant ou employé habilité) peut réviser la date et le créneau de restitution après le dépôt, avec notification automatique au client et motif optionnel (ex. volume, panne machine).
- Le client ne peut pas modifier la date lui-même mais peut être notifié pour proposer une contrainte au pressing (à discuter si cette fonctionnalité doit exister).

## 8. Relances pour linge non récupéré

- Si le client ne se présente pas à la date de retrait, des relances automatiques sont envoyées.
- Séquence de relances (valeur par défaut, ajustable par pressing) :
  - Relance 1 : à J+0 (jour du retrait prévu non honoré), notification.
  - Relance 2 : à J+3, rappel.
  - Relance 3 : à J+7, rappel mentionnant les frais de garde applicables (cf. ci-dessous).
- Décision : l'application outille une **politique de frais de garde configurable par pressing** (montant par jour de retard au-delà du délai global, proposition par défaut à 30 jours), affichée au client dès le déclenchement. Elle n'impose pas de politique de destruction/don — cette décision reste du ressort du pressing, l'application se limite à notifier et journaliser au-delà du délai global.

## 9. Programme de fidélité

- Chaque pressing définit son propre barème de récompense (autonomie totale, pas de règle imposée par la plateforme).
- Mécanique par défaut suggérée **[à valider]** : accumulation de points par montant dépensé ou par nombre de prestations validées, converti en une prestation gratuite (ex. repassage offert après N prestations, ou nettoyage offert après un montant cumulé).
- Le client visualise son solde de points par pressing utilisé.
- Décision : programme à deux niveaux — un programme propre à chaque pressing (défini par son gérant), et un programme optionnel consolidé que le propriétaire peut activer pour cumuler les points sur l'ensemble de ses pressings. Un pressing peut fonctionner uniquement avec son propre programme si son propriétaire n'active pas le niveau consolidé.

## 10. Multi-pressing et tableau de bord propriétaire

- Un propriétaire peut posséder plusieurs pressings.
- Il nomme un gérant par pressing (ou occupe lui-même ce rôle).
- Tableau de bord consolidé : chiffre d'affaires, volume de commandes, taux de linge non récupéré, performance par pressing, comparaisons.

## 11. Notifications

WhatsApp retenu comme canal principal (demande explicite du porteur de projet), en complément du push in-app et du SMS en secours si le client n'a pas WhatsApp.

- Chaque bouton de validation d'étape actionné par un employé (§5) déclenche un message WhatsApp automatique au client avec le libellé de l'étape franchie.
- Événements déclencheurs : confirmation de dépôt (avec récapitulatif et réserves), chaque étape de traitement validée, linge prêt, révision de date/créneau, rappel de retrait, relances non-récupération, confirmation de paiement, crédit de points de fidélité.
- Mise en œuvre technique **[à valider]** : l'API WhatsApp Business (Meta) impose un compte entreprise vérifié et des modèles de message pré-approuvés pour les messages sortants hors fenêtre de conversation de 24h — à anticiper dans le choix du prestataire d'envoi (ex. Twilio, 360dialog, ou l'API Cloud Meta directement).
- Le client peut consulter le même historique d'étapes dans l'application (écran de suivi), pour ne pas dépendre uniquement de WhatsApp en cas de changement de numéro ou de désinstallation.

## 12. Points encore ouverts

Les arbitrages précédemment listés ici (acompte, moyens de paiement, délais, granularité du suivi, fidélité, zone de collecte, évaluation) ont été tranchés — voir les sections correspondantes. Restent ouverts :

- Prestataire de paiement (PSP) pour la carte bancaire in-app et pour le mobile money : à sélectionner selon les pays de déploiement visés (les agrégateurs mobile money varient par pays).
- Prestataire d'envoi WhatsApp Business (Twilio, 360dialog, API Cloud Meta directe) et modèles de message à faire pré-approuver par Meta.
- Barème précis de fidélité (seuils, récompenses) — la mécanique générale est actée (§9), les valeurs chiffrées restent à définir pressing par pressing.
- Règle de fusion des circuits quand un article cumule plusieurs soins associés à des circuits différents (dédoublonnage des étapes communes, ex. contrôle qualité) — détail technique du modèle de données (§5.1, `SoinCircuit`).
- Montant et barème des frais de garde (fixe, dégressif, plafonné ?).

## 13. État de l'art (applications existantes)

Recherche effectuée en juillet 2026, à considérer comme un aperçu et non un audit exhaustif.

**Solutions internationales généralistes** (CleanCloud, Cents, Geelus, SMRT Systems, Garment Master, QDry, LaundryGrow) : POS cloud, gestion de tournées de livraison, CRM client, notifications SMS/e-mail/push/WhatsApp pour certaines (CleanCloud), paiement carte intégré. Tarification par abonnement mensuel (repérée entre ~49 $ et ~199 $/mois selon le nombre d'établissements), conçues pour des marchés à connectivité stable et paiement par carte dominant.

**Solution régionale identifiée** : PressFlow, SaaS destiné aux pressings d'Afrique centrale (Cameroun, Congo, Gabon, RDC), couvrant clients, production, caisse, stock, personnel, reporting, avec compatibilité Mobile Money. Le contenu détaillé du produit n'a pas pu être vérifié en profondeur (site non consultable en détail depuis cet environnement) — à explorer directement avant de se positionner par rapport à cette offre.

**Lacunes constatées par recoupement des descriptions publiques, à vérifier au cas par cas avant conception finale :**

- Fonctionnement hors-ligne : les solutions généralistes présument une connexion stable ; peu documentent une saisie possible sans réseau avec synchronisation différée, pourtant nécessaire pour beaucoup de quartiers à connectivité intermittente.
- Paiement mobile money natif (Orange Money, Wave, MTN MoMo) : présent chez PressFlow, absent ou non mis en avant chez les solutions généralistes qui misent sur les rails carte bancaire/Stripe.
- Coût d'entrée : les abonnements mensuels des solutions généralistes représentent une charge fixe potentiellement lourde pour un pressing de quartier ; un modèle gratuit ou à très faible coût d'entrée constitue une différence notable pour ce segment.
- Transition douce depuis le papier : peu de solutions reprennent explicitement le format du ticket papier existant (numérotation, souche, réserves écrites) comme point de départ — la plupart proposent une bascule complète vers un système numérique, ce qui peut freiner l'adoption par des employés habitués au papier.
- Canal de notification accessible sans smartphone récent : SMS/WhatsApp est couvert par certains acteurs (CleanCloud), mais rarement combiné à un mode de consultation par simple numéro de ticket (sans compte, sans appli) pour les clients sans smartphone.
- Pas d'installation via store : une PWA s'installe directement depuis le navigateur, sans passer par Google Play, ce qui réduit la friction et l'espace de stockage requis sur des téléphones d'entrée de gamme — argument technique plutôt que fonctionnel, mais pertinent pour ce contexte.

## 14. Fonctionnalités proposées pour se différencier

À valider — ce sont des propositions issues de l'analyse ci-dessus, pas des faits établis sur ce que fait ou ne fait pas chaque concurrent :

- Mode hors-ligne : saisie du dépôt, de l'inventaire/réserves et des statuts possible sans réseau, avec file de synchronisation dès que la connexion revient.
- Paiement mobile money natif comme option par défaut (pas seulement carte), aux côtés des espèces.
- Notification client multicanal : push (si appli installée), SMS et WhatsApp, avec un lien de suivi consultable sans compte via le numéro de ticket.
- Fiche d'état à l'entrée avec réserves écrites horodatées et photos, alignée sur la pratique commerciale reconnue (protection du pressing en cas de litige), déjà intégrée à la conception (voir §12 sur la traçabilité).
- Modèle économique accessible : gratuit ou à coût marginal pour une seule boutique, afin de concurrencer le statu quo « papier + cahier » plutôt que les solutions à abonnement.
- Tableau de bord multi-pressing inclus nativement pour le propriétaire, plutôt que réservé à un palier tarifaire supérieur.
- Interface pensée pour un usage tactile rapide par du personnel peu formé à l'informatique (peu de texte, icônes, peu d'étapes) plutôt qu'un back-office dense hérité du desktop.
