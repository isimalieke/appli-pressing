import { createContext, useContext, useEffect, useReducer } from 'react'
import { pressings } from '../data/mock.js'

const AppContext = createContext(null)

const STORAGE_KEY = 'appli-pressing-state-v1'

function mergeCircuits(pressing, soinIds) {
  const etapes = []
  const vus = new Set()
  soinIds.forEach((soinId) => {
    const circuit = pressing.circuits[soinId] || []
    circuit.forEach((libelle) => {
      if (!vus.has(libelle)) {
        vus.add(libelle)
        etapes.push(libelle)
      }
    })
  })
  return etapes.map((libelle, index) => ({
    ordre: index,
    libelle,
    statut: index === 0 ? 'en_cours' : 'a_faire',
    validePar: null,
    horodatage: null,
  }))
}

function calculerPrixArticle(pressing, soinIds) {
  return soinIds.reduce((total, soinId) => {
    const soin = pressing.soins.find((s) => s.id === soinId)
    return total + (soin ? soin.prix : 0)
  }, 0)
}

function statutGlobalCommande(commande) {
  if (!commande.articles.length) return commande.statut
  const tousTermines = commande.articles.every((a) =>
    a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')
  )
  if (tousTermines) return 'prete'
  const auMoinsUne = commande.articles.some((a) => a.etapes.some((e) => e.statut === 'validee'))
  return auMoinsUne ? 'en_traitement' : commande.statut
}

const initialState = {
  pressingSelectionneId: null,
  commande: null,
  notifications: [],
  enLigne: true,
  fileSynchronisation: [],
}

function ajouterNotification(state, texte, canal = 'whatsapp') {
  const notif = {
    id: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    texte,
    canal,
    horodatage: new Date().toISOString(),
  }
  return [notif, ...state.notifications]
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload }

    case 'CHOISIR_PRESSING':
      return { ...state, pressingSelectionneId: action.pressingId }

    case 'DEMARRER_COMMANDE': {
      const commande = {
        id: `c${Date.now()}`,
        pressingId: action.pressingId,
        modeDepot: action.modeDepot,
        creneauDepot: action.creneauDepot,
        express: false,
        statut: 'creee',
        articles: [],
        numeroTicket: null,
        prixTotal: 0,
        montantAcompte: 0,
        montantSolde: 0,
        paiements: [],
        reservesGlobales: '',
        dateDepotEffectif: null,
        creneauRetraitPrevu: null,
        creneauRetraitRevise: null,
        evaluation: null,
      }
      return { ...state, commande }
    }

    case 'AJOUTER_ARTICLE': {
      if (!state.commande) return state
      const article = {
        id: `a${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: action.typeArticle,
        soins: [],
        reserve: '',
        photos: [],
        etiquette: null,
        etapes: [],
      }
      return {
        ...state,
        commande: { ...state.commande, articles: [...state.commande.articles, article] },
      }
    }

    case 'RETIRER_ARTICLE': {
      if (!state.commande) return state
      return {
        ...state,
        commande: {
          ...state.commande,
          articles: state.commande.articles.filter((a) => a.id !== action.articleId),
        },
      }
    }

    case 'TOGGLE_SOIN': {
      if (!state.commande) return state
      const pressing = pressings.find((p) => p.id === state.commande.pressingId)
      const articles = state.commande.articles.map((a) => {
        if (a.id !== action.articleId) return a
        const soins = a.soins.includes(action.soinId)
          ? a.soins.filter((s) => s !== action.soinId)
          : [...a.soins, action.soinId]
        return { ...a, soins }
      })
      const prixTotal = articles.reduce(
        (total, a) => total + calculerPrixArticle(pressing, a.soins),
        0
      )
      const montantAcompte = Math.round(prixTotal * (pressing.acomptePourcent / 100) * 100) / 100
      return {
        ...state,
        commande: {
          ...state.commande,
          articles,
          prixTotal: Math.round(prixTotal * 100) / 100,
          montantAcompte,
          montantSolde: Math.round((prixTotal - montantAcompte) * 100) / 100,
        },
      }
    }

    case 'DEFINIR_RESERVE': {
      if (!state.commande) return state
      const articles = state.commande.articles.map((a) =>
        a.id === action.articleId ? { ...a, reserve: action.texte } : a
      )
      return { ...state, commande: { ...state.commande, articles } }
    }

    case 'AJOUTER_PHOTO': {
      if (!state.commande) return state
      const articles = state.commande.articles.map((a) =>
        a.id === action.articleId ? { ...a, photos: [...a.photos, action.dataUrl] } : a
      )
      return { ...state, commande: { ...state.commande, articles } }
    }

    case 'VALIDER_INVENTAIRE': {
      if (!state.commande) return state
      const pressing = pressings.find((p) => p.id === state.commande.pressingId)
      const numeroTicket = state.commande.numeroTicket || `A${Math.floor(200 + Math.random() * 800)}`
      const articles = state.commande.articles.map((a, index) => ({
        ...a,
        etiquette: `${numeroTicket}-${index + 1}`,
        etapes: mergeCircuits(pressing, a.soins),
      }))
      const delaiH = state.commande.express ? pressing.delaiExpressH : pressing.delaiStandardH
      const dateDepotEffectif = new Date().toISOString()
      const dateRestitutionPrevue = new Date(
        Date.now() + delaiH * 3600 * 1000
      ).toISOString()
      const commande = {
        ...state.commande,
        articles,
        numeroTicket,
        statut: 'deposee',
        dateDepotEffectif,
        dateRestitutionPrevue,
      }
      const notifications = ajouterNotification(
        state,
        `Ticket #${numeroTicket} : votre linge (${articles.length} article${articles.length > 1 ? 's' : ''}) est déposé et inventorié. Total ${commande.prixTotal.toFixed(2)} EUR, acompte ${commande.montantAcompte.toFixed(2)} EUR.`
      )
      return { ...state, commande, notifications }
    }

    case 'PAYER': {
      if (!state.commande) return state
      const paiement = {
        id: `pay${Date.now()}`,
        type: action.typePaiement,
        montant: action.montant,
        moyen: action.moyen,
        statut: 'valide',
        date: new Date().toISOString(),
      }
      const commande = { ...state.commande, paiements: [...state.commande.paiements, paiement] }
      const notifications = ajouterNotification(
        state,
        `Paiement ${action.typePaiement === 'acompte' ? "de l'acompte" : 'du solde'} confirmé : ${action.montant.toFixed(2)} EUR via ${action.moyen}.`
      )
      return { ...state, commande, notifications }
    }

    case 'VALIDER_ETAPE': {
      if (!state.commande) return state
      let libelleEtape = ''
      const articles = state.commande.articles.map((a) => {
        if (a.id !== action.articleId) return a
        const etapes = a.etapes.map((e, index) => {
          if (index !== action.etapeIndex) return e
          libelleEtape = e.libelle
          return {
            ...e,
            statut: 'validee',
            validePar: action.employe,
            horodatage: new Date().toISOString(),
          }
        })
        if (etapes[action.etapeIndex + 1]) {
          etapes[action.etapeIndex + 1] = { ...etapes[action.etapeIndex + 1], statut: 'en_cours' }
        }
        return { ...a, etapes }
      })
      const commandeIntermediaire = { ...state.commande, articles }
      const statut = statutGlobalCommande(commandeIntermediaire)
      const commande = { ...commandeIntermediaire, statut }

      let notifications = state.notifications
      const tousLesArticlesOntValideCetteEtape = articles.every((a) => {
        const e = a.etapes[action.etapeIndex]
        return !e || e.statut === 'validee'
      })
      if (tousLesArticlesOntValideCetteEtape) {
        const texte =
          statut === 'prete'
            ? `Votre commande #${commande.numeroTicket} est prête pour le retrait.`
            : `Étape franchie pour votre commande #${commande.numeroTicket} : ${libelleEtape}.`
        notifications = ajouterNotification(state, texte)
      }
      return { ...state, commande, notifications }
    }

    case 'REVISER_CRENEAU': {
      if (!state.commande) return state
      const commande = {
        ...state.commande,
        creneauRetraitRevise: action.creneau,
        statut: 'revisee',
      }
      const notifications = ajouterNotification(
        state,
        `Votre créneau de retrait pour la commande #${commande.numeroTicket} a été révisé : ${action.creneau}.`
      )
      return { ...state, commande, notifications }
    }

    case 'RETIRER_COMMANDE': {
      if (!state.commande) return state
      const commande = { ...state.commande, statut: 'retiree' }
      return { ...state, commande }
    }

    case 'NOTER_COMMANDE': {
      if (!state.commande) return state
      return { ...state, commande: { ...state.commande, evaluation: action.note } }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const sauvegarde = localStorage.getItem(STORAGE_KEY)
    if (sauvegarde) {
      try {
        dispatch({ type: 'HYDRATE', payload: JSON.parse(sauvegarde) })
      } catch {
        // ignore une sauvegarde corrompue
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const pressingCourant = pressings.find((p) => p.id === state.pressingSelectionneId) || null

  return (
    <AppContext.Provider value={{ state, dispatch, pressings, pressingCourant }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé sous AppProvider')
  return ctx
}
