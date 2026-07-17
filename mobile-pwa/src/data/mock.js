// Données de démonstration. À remplacer par des appels API une fois le backend disponible.

export const pressings = [
  {
    id: 'p1',
    nom: 'Pressing du Marché',
    adresse: '12 avenue de la République',
    distanceKm: 0.4,
    soins: [
      { id: 's-lavage', libelle: 'Lavage à l\'eau', prix: 3.5 },
      { id: 's-nettoyage', libelle: 'Nettoyage à sec', prix: 5.0 },
      { id: 's-repassage', libelle: 'Repassage', prix: 2.0 },
    ],
    circuits: {
      's-lavage': ['Dépôt et vérification', 'Tri', 'Lavage à l\'eau', 'Séchage', 'Repassage', 'Contrôle qualité', 'Empaquetage'],
      's-nettoyage': ['Dépôt et vérification', 'Tri', 'Détachage', 'Nettoyage à sec', 'Contrôle qualité', 'Empaquetage'],
      's-repassage': ['Dépôt et vérification', 'Repassage', 'Contrôle qualité', 'Empaquetage'],
    },
    creneauxDepot: ['Aujourd\'hui, 14h-16h', 'Aujourd\'hui, 16h-18h', 'Demain, 09h-11h'],
    creneauxRetrait: ['Après-demain, 14h-16h', 'Après-demain, 16h-18h'],
    acomptePourcent: 30,
    delaiStandardH: 48,
    delaiExpressH: 24,
    fraisGarde: { delaiGlobalJours: 30, montantParJour: 0.5 },
    rayonCollecteKm: 3,
  },
  {
    id: 'p2',
    nom: 'Clean Express',
    adresse: '5 rue des Lilas',
    distanceKm: 1.2,
    soins: [
      { id: 's-lavage', libelle: 'Lavage à l\'eau', prix: 3.0 },
      { id: 's-nettoyage', libelle: 'Nettoyage à sec', prix: 4.5 },
      { id: 's-repassage', libelle: 'Repassage', prix: 1.5 },
    ],
    circuits: {
      's-lavage': ['Dépôt et vérification', 'Lavage à l\'eau', 'Séchage', 'Repassage', 'Empaquetage'],
      's-nettoyage': ['Dépôt et vérification', 'Détachage', 'Nettoyage à sec', 'Contrôle qualité', 'Empaquetage'],
      's-repassage': ['Dépôt et vérification', 'Repassage', 'Empaquetage'],
    },
    creneauxDepot: ['Aujourd\'hui, 10h-12h', 'Demain, 14h-16h'],
    creneauxRetrait: ['Après-demain, 10h-12h'],
    acomptePourcent: 40,
    delaiStandardH: 48,
    delaiExpressH: 12,
    fraisGarde: { delaiGlobalJours: 30, montantParJour: 0.3 },
    rayonCollecteKm: 5,
  },
]

export const typesArticle = [
  'Chemise', 'Pantalon', 'Veste', 'Robe', 'Costume complet', 'Manteau', 'Couette', 'Nappe',
]

export const moyensPaiement = [
  { id: 'orange_money', libelle: 'Orange Money', icon: 'ti-device-mobile' },
  { id: 'wave', libelle: 'Wave', icon: 'ti-device-mobile' },
  { id: 'mtn_momo', libelle: 'MTN MoMo', icon: 'ti-device-mobile' },
  { id: 'carte_bancaire', libelle: 'Carte bancaire', icon: 'ti-credit-card' },
  { id: 'especes', libelle: 'Espèces au comptoir', icon: 'ti-cash' },
]
