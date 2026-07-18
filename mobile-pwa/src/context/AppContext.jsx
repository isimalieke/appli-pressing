import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, CLIENT_ID_DEMO, normaliserCommande, normaliserPressing, formaterMontant } from '../api.js'

const AppContext = createContext(null)

// Sessions minimales, sans mot de passe ni token serveur — cohérent avec le stade pilote
// (cf. dispatch CONNEXION_STAFF / IDENTIFIER_CLIENT). Persistées en local pour ne pas redemander
// le code PIN ou le numéro de téléphone à chaque rechargement de page sur l'appareil du pressing.
function lireSession(cle) {
  try {
    const brut = localStorage.getItem(cle)
    return brut ? JSON.parse(brut) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  const [pressings, setPressings] = useState([])
  const [pressingCourant, setPressingCourant] = useState(null)
  const [commande, setCommande] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [staffSession, setStaffSession] = useState(() => lireSession('pressing_staff_session'))
  const [clientSession, setClientSession] = useState(() => lireSession('pressing_client_session'))

  useEffect(() => {
    api.listerPressings().then(setPressings).catch((e) => setErreur(e.message))
  }, [])

  function notifier(texte) {
    setNotifications((n) => [{ id: `n${Date.now()}`, texte, canal: 'whatsapp', horodatage: new Date().toISOString() }, ...n])
  }

  async function actionAvecChargement(fn) {
    setChargement(true)
    setErreur(null)
    try {
      return await fn()
    } catch (e) {
      setErreur(e.message)
      throw e
    } finally {
      setChargement(false)
    }
  }

  const rafraichirCommande = useCallback(async (commandeId) => {
    const data = await api.detailCommande(commandeId)
    setCommande(normaliserCommande(data))
  }, [])

  const state = {
    pressingSelectionneId: pressingCourant?.id || null,
    commande,
    notifications,
    enLigne: true,
    chargement,
    erreur,
    staffSession,
    clientSession,
  }

  const dispatch = useCallback(async (action) => {
    switch (action.type) {
      case 'CHOISIR_PRESSING': {
        return actionAvecChargement(async () => {
          const data = await api.detailPressing(action.pressingId)
          setPressingCourant(normaliserPressing(data))
        })
      }

      case 'CONNEXION_STAFF': {
        return actionAvecChargement(async () => {
          const staff = await api.connexionStaff(action.pressingId, action.codePin)
          const session = { ...staff, pressingId: action.pressingId }
          setStaffSession(session)
          localStorage.setItem('pressing_staff_session', JSON.stringify(session))
        })
      }

      case 'DECONNEXION_STAFF': {
        setStaffSession(null)
        localStorage.removeItem('pressing_staff_session')
        return
      }

      case 'IDENTIFIER_CLIENT': {
        return actionAvecChargement(async () => {
          const client = await api.identifierClient(action.telephone, action.nom, action.prenom)
          setClientSession(client)
          localStorage.setItem('pressing_client_session', JSON.stringify(client))
        })
      }

      case 'DECONNEXION_CLIENT': {
        setClientSession(null)
        localStorage.removeItem('pressing_client_session')
        return
      }

      case 'DEMARRER_COMMANDE': {
        return actionAvecChargement(async () => {
          const { id } = await api.creerCommande({
            client_id: clientSession?.id || CLIENT_ID_DEMO,
            pressing_id: action.pressingId,
            mode_depot: action.modeDepot,
            mode_facturation: action.modeFacturation,
            creneau_collecte_prevue: action.creneauCollectePrevue,
          })
          setCommande({
            id,
            pressingId: action.pressingId,
            statut: 'creee',
            modeFacturation: action.modeFacturation || 'detail',
            articles: [],
            prixTotal: 0,
            montantAcompte: 0,
            montantSolde: 0,
            paiements: [],
          })
        })
      }

      case 'AJOUTER_ARTICLE': {
        return actionAvecChargement(async () => {
          const { id: articleId } = await api.ajouterArticle(commande.id, { type_article: action.typeArticle })
          // Cycle standard par défaut : tous les soins configurés par le pressing sont inclus
          // d'emblée (le client s'attend en général à un traitement complet). Le prix total reste
          // la somme des soins inclus — seule la présentation change, pas le calcul. Le client peut
          // ensuite décocher via "Traitement spécial" pour les cas particuliers.
          const tousLesSoins = (pressingCourant?.soins || []).map((s) => s.id)
          if (tousLesSoins.length > 0) {
            await api.definirSoinsArticle(articleId, tousLesSoins)
          }
          await rafraichirCommande(commande.id)
        })
      }

      case 'ENREGISTRER_POIDS': {
        return actionAvecChargement(async () => {
          await api.enregistrerPoids(commande.id, action.poidsKg)
          await rafraichirCommande(commande.id)
        })
      }

      case 'RETIRER_ARTICLE': {
        return actionAvecChargement(async () => {
          await api.supprimerArticle(action.articleId)
          await rafraichirCommande(commande.id)
        })
      }

      case 'REVISER_CRENEAU_COLLECTE': {
        return actionAvecChargement(async () => {
          await api.reviserCreneauCollecte(commande.id, action.creneauCollectePrevue)
          await rafraichirCommande(commande.id)
        })
      }

      case 'TOGGLE_SOIN': {
        return actionAvecChargement(async () => {
          const article = commande.articles.find((a) => a.id === action.articleId)
          const soins = article.soins.includes(action.soinId)
            ? article.soins.filter((s) => s !== action.soinId)
            : [...article.soins, action.soinId]
          await api.definirSoinsArticle(action.articleId, soins)
          await rafraichirCommande(commande.id)
        })
      }

      case 'DEFINIR_RESERVE': {
        return actionAvecChargement(async () => {
          await api.definirReserve(action.articleId, action.texte)
          setCommande((c) => ({
            ...c,
            articles: c.articles.map((a) => (a.id === action.articleId ? { ...a, reserve: action.texte } : a)),
          }))
        })
      }

      case 'AJOUTER_PHOTO': {
        return actionAvecChargement(async () => {
          await api.ajouterPhoto(action.articleId, action.dataUrl)
          await rafraichirCommande(commande.id)
        })
      }

      case 'VALIDER_INVENTAIRE': {
        return actionAvecChargement(async () => {
          await api.validerInventaire(commande.id)
          await rafraichirCommande(commande.id)
          notifier(`Ticket généré : votre linge est déposé et inventorié.`)
        })
      }

      case 'PAYER': {
        return actionAvecChargement(async () => {
          await api.enregistrerPaiement(commande.id, {
            type: action.typePaiement,
            montant: action.montant,
            moyen: action.moyen,
          })
          await rafraichirCommande(commande.id)
          notifier(`Paiement ${action.typePaiement === 'acompte' ? "de l'acompte" : 'du solde'} confirmé : ${formaterMontant(action.montant, pressingCourant?.devise)}.`)
        })
      }

      case 'VALIDER_ETAPE': {
        return actionAvecChargement(async () => {
          await api.validerEtape(action.articleId, action.etapeIndex, action.employe)
          await rafraichirCommande(commande.id)
          // Pas de notification WhatsApp à chaque étape validée : c'est une donnée de suivi
          // interne au pressing, le client n'a pas besoin d'être averti à chaque poste franchi.
        })
      }

      case 'NOTIFIER_CLIENT_PRET': {
        return actionAvecChargement(async () => {
          notifier(`Commande #${commande.numeroTicket} prête — client notifié.`)
        })
      }

      case 'REVISER_CRENEAU': {
        return actionAvecChargement(async () => {
          await api.reviserCreneau(commande.id, action.creneau)
          await rafraichirCommande(commande.id)
          notifier(`Créneau de retrait révisé : ${action.creneau}.`)
        })
      }

      case 'RETIRER_COMMANDE': {
        return actionAvecChargement(async () => rafraichirCommande(commande.id))
      }

      case 'NOTER_COMMANDE': {
        return actionAvecChargement(async () => {
          await api.noterCommande(commande.id, action.note)
          setCommande((c) => ({ ...c, evaluation: action.note }))
        })
      }

      default:
        return
    }
  }, [commande, rafraichirCommande, pressingCourant, clientSession])

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
