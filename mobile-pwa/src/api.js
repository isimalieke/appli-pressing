// Client API — appelle le backend Cloudflare Worker déployé.
// Pas d'authentification à ce stade : CLIENT_ID_DEMO simule un client unique,
// à remplacer par un vrai identifiant de compte quand l'authentification sera en place.

const BASE_URL = 'https://appli-pressing-api.isima-lieke.workers.dev/api'

export const CLIENT_ID_DEMO = 'c-1'

async function appel(chemin, options = {}) {
  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => ({}))
    throw new Error(corps.erreur || `Erreur ${reponse.status}`)
  }
  return reponse.json()
}

export const api = {
  listerPressings: () => appel('/pressings'),
  detailPressing: (id) => appel(`/pressings/${id}`),
  listerStaff: (pressingId) => appel(`/pressings/${pressingId}/staff`),
  creneauxDomicile: (pressingId) => appel(`/pressings/${pressingId}/creneaux-domicile`),
  definirTauxTva: (pressingId, tauxTva) =>
    appel(`/pressings/${pressingId}/taux-tva`, { method: 'PATCH', body: JSON.stringify({ taux_tva: tauxTva }) }),
  definirPrixKilo: (pressingId, prixKilo) =>
    appel(`/pressings/${pressingId}/prix-kilo`, { method: 'PATCH', body: JSON.stringify({ prix_kilo: prixKilo }) }),
  definirDevise: (pressingId, devise) =>
    appel(`/pressings/${pressingId}/devise`, { method: 'PATCH', body: JSON.stringify({ devise }) }),

  creerCommande: (payload) => appel('/commandes', { method: 'POST', body: JSON.stringify(payload) }),
  detailCommande: (id) => appel(`/commandes/${id}`),
  enregistrerPoids: (commandeId, poidsKg) =>
    appel(`/commandes/${commandeId}/poids`, { method: 'PATCH', body: JSON.stringify({ poids_kg: poidsKg }) }),
  ajouterArticle: (commandeId, payload) =>
    appel(`/commandes/${commandeId}/articles`, { method: 'POST', body: JSON.stringify(payload) }),
  supprimerArticle: (articleId) => appel(`/articles/${articleId}`, { method: 'DELETE' }),
  definirSoinsArticle: (articleId, soinIds) =>
    appel(`/articles/${articleId}/soins`, { method: 'PUT', body: JSON.stringify({ soin_ids: soinIds }) }),
  definirReserve: (articleId, reserve) =>
    appel(`/articles/${articleId}/reserve`, { method: 'PATCH', body: JSON.stringify({ reserve }) }),
  ajouterPhoto: (articleId, url) =>
    appel(`/articles/${articleId}/photos`, { method: 'POST', body: JSON.stringify({ url }) }),
  validerInventaire: (commandeId) => appel(`/commandes/${commandeId}/valider-inventaire`, { method: 'POST' }),
  validerEtape: (articleId, ordre, staffId) =>
    appel(`/articles/${articleId}/etapes/${ordre}/valider`, { method: 'POST', body: JSON.stringify({ staff_id: staffId || null }) }),
  reviserCreneau: (commandeId, creneau) =>
    appel(`/commandes/${commandeId}/creneau-retrait`, { method: 'PATCH', body: JSON.stringify({ creneau }) }),
  reviserCreneauCollecte: (commandeId, creneauCollectePrevue) =>
    appel(`/commandes/${commandeId}/creneau-collecte`, { method: 'PATCH', body: JSON.stringify({ creneau_collecte_prevue: creneauCollectePrevue }) }),
  enregistrerPaiement: (commandeId, payload) =>
    appel(`/commandes/${commandeId}/paiements`, { method: 'POST', body: JSON.stringify(payload) }),
  noterCommande: (commandeId, note) =>
    appel(`/commandes/${commandeId}/evaluation`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  listerCommandesClient: (clientId) => appel(`/clients/${clientId}/commandes`),
  listerCommandesPressing: (pressingId) => appel(`/pressings/${pressingId}/commandes`),
  connexionStaff: (pressingId, codePin) =>
    appel(`/pressings/${pressingId}/connexion-staff`, { method: 'POST', body: JSON.stringify({ code_pin: codePin }) }),
  identifierClient: (telephone, nom, prenom, civilite) =>
    appel('/clients/identification', { method: 'POST', body: JSON.stringify({ telephone, nom, prenom, civilite }) }),
}

// Réduit une photo avant envoi, pour éviter des lignes trop volumineuses côté base de données.
export function redimensionnerImage(fichier, largeurMax = 480, qualite = 0.6) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onload = () => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(1, largeurMax / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', qualite))
      }
      img.onerror = reject
      img.src = lecteur.result
    }
    lecteur.onerror = reject
    lecteur.readAsDataURL(fichier)
  })
}

// Normalise une commande renvoyée par l'API (snake_case) vers le format utilisé par les pages
// (camelCase), pour limiter les changements dans les composants existants.
export function normaliserCommande(c) {
  if (!c) return null
  return {
    id: c.id,
    pressingId: c.pressing_id,
    clientId: c.client_id,
    numeroTicket: c.numero_ticket,
    modeDepot: c.mode_depot,
    modeFacturation: c.mode_facturation || 'detail',
    poidsKg: c.poids_kg,
    express: !!c.express,
    statut: c.statut,
    prixTotal: c.prix_total || 0,
    montantHT: c.montant_ht || 0,
    montantTva: c.montant_tva || 0,
    tauxTvaApplique: c.taux_tva_applique || 0,
    montantAcompte: c.montant_acompte || 0,
    montantSolde: c.montant_solde || 0,
    dateDepotEffectif: c.date_depot_effectif,
    dateRestitutionPrevue: c.date_restitution_prevue,
    creneauCollectePrevue: c.creneau_collecte_prevue,
    creneauRetraitRevise: c.creneau_retrait_revise,
    evaluation: c.evaluation,
    articles: (c.articles || []).map((a) => ({
      id: a.id,
      type: a.type_article,
      description: a.description,
      etiquette: a.etiquette,
      reserve: a.reserve || '',
      soins: (a.soins || []).map((s) => s.soin_id),
      photos: (a.photos || []).map((p) => p.url),
      etapes: (a.etapes || []).map((e) => ({
        ordre: e.ordre,
        libelle: e.libelle,
        statut: e.statut,
        validePar: e.valide_par,
        horodatage: e.horodatage,
      })),
    })),
    paiements: (c.paiements || []).map((p) => ({
      id: p.id,
      type: p.type,
      montant: p.montant,
      moyen: p.moyen,
      date: p.date_paiement,
    })),
  }
}

export function normaliserPressing(p) {
  if (!p) return null
  return {
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    rayonCollecteKm: p.rayon_collecte_km,
    acomptePourcent: p.acompte_pourcent,
    tauxTva: p.taux_tva || 0,
    prixKilo: p.prix_kilo || 0,
    devise: p.devise || 'XOF',
    delaiStandardH: p.delai_standard_h,
    delaiExpressH: p.delai_express_h,
    delaiStandardJoursOuvres: p.delai_standard_jours_ouvres ?? 2,
    delaiExpressJoursOuvres: p.delai_express_jours_ouvres ?? 1,
    joursOuverts: (p.jours_ouverts || '1,2,3,4,5,6').split(',').map((j) => Number(j.trim())),
    heureOuverture: p.heure_ouverture || '08:00',
    heureFermeture: p.heure_fermeture || '19:00',
    fraisGarde: { delaiGlobalJours: p.frais_garde_delai_jours, montantParJour: p.frais_garde_montant_jour },
    soins: p.soins || [],
    tarifs: p.tarifs || [],
    // Le dépôt/retrait au comptoir se fait pendant les horaires d'ouverture, sans créneau.
    // Les créneaux de collecte à domicile sont générés dynamiquement, cf. api.creneauxDomicile().
    creneauxRetrait: (p.creneaux || []).filter((c) => c.type === 'retrait'),
  }
}

const NOMS_JOURS = { 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi', 7: 'dimanche' }

// Résume les jours d'ouverture sous forme lisible ("lundi à samedi", ou une liste si non consécutifs).
export function formaterJoursOuverts(jours) {
  if (!jours || jours.length === 0) return ''
  const tries = [...jours].sort((a, b) => a - b)
  const consecutifs = tries.every((j, i) => i === 0 || j === tries[i - 1] + 1)
  if (consecutifs && tries.length > 1) {
    return `${NOMS_JOURS[tries[0]]} à ${NOMS_JOURS[tries[tries.length - 1]]}`
  }
  return tries.map((j) => NOMS_JOURS[j]).join(', ')
}

// Formate un montant dans la devise du pressing (ex. 1 500 XOF, 3,50 EUR). Intl.NumberFormat gère
// automatiquement le nombre de décimales propre à chaque devise (0 pour XOF, 2 pour EUR...).
export function formaterMontant(montant, devise = 'XOF') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise }).format(montant || 0)
  } catch {
    return `${(montant || 0).toFixed(2)} ${devise}`
  }
}

export function formaterCreneau(c) {
  if (!c) return ''
  return `${c.jour_ou_date}, ${c.heure_debut}-${c.heure_fin}`
}

const NOMS_JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// Formate un créneau de collecte à domicile généré dynamiquement (date ISO + heures) en libellé
// lisible : "aujourd'hui", "demain", ou "vendredi 20 juillet".
const NOMS_JOURS_COURTS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']

// Libellé court pour une puce de sélection de jour dans un sélecteur type calendrier
// ("aujourd'hui", "demain", ou "ven 20").
export function formaterJourCourt(dateStr) {
  const aujourdhui = new Date()
  const debutAujourdhui = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())
  const date = new Date(`${dateStr}T00:00:00`)
  const diffJours = Math.round((date - debutAujourdhui) / 86400000)
  if (diffJours === 0) return "Aujourd'hui"
  if (diffJours === 1) return 'Demain'
  return `${NOMS_JOURS_COURTS[date.getDay()]} ${date.getDate()}`
}

export function formaterCreneauDomicile(c) {
  if (!c) return ''
  const aujourdhui = new Date()
  const dateSlot = new Date(`${c.date}T00:00:00`)
  const diffJours = Math.round((dateSlot - new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())) / 86400000)
  let jourLabel
  if (diffJours === 0) jourLabel = "aujourd'hui"
  else if (diffJours === 1) jourLabel = 'demain'
  else jourLabel = `${NOMS_JOURS_LONGS[dateSlot.getDay()]} ${dateSlot.getDate()}/${dateSlot.getMonth() + 1}`
  return `${jourLabel}, ${c.heure_debut}-${c.heure_fin}`
}

const NOMS_MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

// Formate le libellé brut stocké sur la commande ("2026-07-23 10:00-12:00") en texte lisible :
// "collecte le 23 juillet 2026, créneau 10h00–12h00". Reste tolérant si le format est inattendu.
export function formaterLabelCreneauCollecte(label) {
  if (!label) return ''
  const correspondance = label.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})-(\d{2}:\d{2})$/)
  if (!correspondance) return label
  const [, annee, mois, jour, heureDebut, heureFin] = correspondance
  const date = new Date(`${annee}-${mois}-${jour}T00:00:00`)
  const jourTexte = `${Number(jour)} ${NOMS_MOIS[date.getMonth()]} ${annee}`
  const format = (h) => h.replace(':', 'h')
  return `collecte le ${jourTexte}, créneau ${format(heureDebut)}–${format(heureFin)}`
}
