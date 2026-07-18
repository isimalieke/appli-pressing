import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau } from '../api.js'
import SuiviCommandes from '../components/SuiviCommandes.jsx'
import EtapesArticle from '../components/EtapesArticle.jsx'

// Deux écrans distincts, accessibles par onglet : "Commande en cours" pour traiter le lot que
// l'employé a en main (validation étape par étape), et "Toutes les commandes" pour la vue
// d'ensemble du pressing (file d'attente, retraits/livraisons, recherche client au téléphone).
// Mélanger les deux dans un seul écran obligeait à faire défiler la fiche en cours pour retrouver
// la liste globale — les deux besoins sont désormais séparés clairement.
export default function Employe() {
  const { state, dispatch } = useApp()
  const commande = state.commande
  const [onglet, setOnglet] = useState('traitement')
  const [creneauChoisi, setCreneauChoisi] = useState(null)
  const [pressing, setPressing] = useState(null)
  // Mémorise l'étape en cours de bascule (articleId + ordre) pour désactiver brièvement ce bouton
  // précis le temps de l'appel réseau, sans bloquer les autres.
  const [etapeEnCours, setEtapeEnCours] = useState(null)

  const pressingId = commande?.pressingId || state.staffSession?.pressingId

  useEffect(() => {
    if (pressingId) {
      api.detailPressing(pressingId).then((d) => setPressing(normaliserPressing(d)))
    }
  }, [pressingId])

  // "staff_id" doit correspondre à une vraie ligne de pressing_staff (contrainte de clé
  // étrangère), sinon le serveur rejette l'appel. Tant que l'authentification employé n'est pas
  // branchée, on ne transmet aucun staff_id (NULL est accepté).
  async function basculer(articleId, ordre) {
    setEtapeEnCours({ articleId, ordre })
    try {
      await dispatch({ type: 'BASCULER_ETAPE', articleId, etapeIndex: ordre })
    } finally {
      setEtapeEnCours(null)
    }
  }

  function reviserCreneau() {
    if (!creneauChoisi) return
    dispatch({ type: 'REVISER_CRENEAU', creneau: formaterCreneau(creneauChoisi) })
  }

  function notifierClient() {
    dispatch({ type: 'NOTIFIER_CLIENT_PRET' })
  }

  const aUneCommande = commande && commande.numeroTicket
  // Une ligne par article du lot, toujours visible en même temps — pas d'écran unique qui saute
  // d'un article à l'autre. Chaque ligne montre l'étape en cours de CET article et son propre
  // bouton "Valider" : l'employé voit tout le lot d'un coup d'œil et agit directement sur la
  // bonne ligne, sans avoir à faire défiler pour retrouver où en est tel ou tel vêtement.
  const nbArticlesTermines = aUneCommande
    ? commande.articles.filter((a) => a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')).length
    : 0
  const commandeComplete = aUneCommande && commande.articles.length > 0 && nbArticlesTermines === commande.articles.length

  return (
    <section>
      <h1>Poste de travail</h1>

      <div className="onglets" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setOnglet('traitement')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 20,
            border: onglet === 'traitement' ? 'none' : '1px solid var(--gris-bordure)',
            background: onglet === 'traitement' ? 'var(--bleu)' : 'var(--gris-carte)',
            color: onglet === 'traitement' ? 'white' : 'var(--texte)',
            fontSize: '0.8rem',
          }}
        >
          Commande en cours
        </button>
        <button
          onClick={() => setOnglet('suivi')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 20,
            border: onglet === 'suivi' ? 'none' : '1px solid var(--gris-bordure)',
            background: onglet === 'suivi' ? 'var(--bleu)' : 'var(--gris-carte)',
            color: onglet === 'suivi' ? 'white' : 'var(--texte)',
            fontSize: '0.8rem',
          }}
        >
          Toutes les commandes
        </button>
      </div>

      {onglet === 'traitement' && (
        !aUneCommande ? (
          <p className="sous-titre">
            Aucune commande en cours de traitement sur ce poste. Ouvrez "Toutes les commandes" pour
            voir l'ensemble des commandes du pressing.
          </p>
        ) : (
          <>
            <h2>Commande #{commande.numeroTicket}</h2>
            <p className="sous-titre">
              {nbArticlesTermines} / {commande.articles.length} articles prêts
            </p>

            {commandeComplete && (
              <button className="primaire" style={{ marginBottom: 10 }} onClick={notifierClient}>
                Notifier le client — commande prête
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commande.articles.map((a) => {
                const termine = a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')
                return (
                  <div key={a.id} className="card">
                    <div className="ligne-entre">
                      <strong style={{ fontSize: '0.85rem' }}>{a.type} — {a.etiquette}</strong>
                      {termine && <span className="badge badge-succes">Prêt</span>}
                    </div>
                    <EtapesArticle
                      article={a}
                      onToggle={(ordre) => basculer(a.id, ordre)}
                      ordreEnCours={etapeEnCours?.articleId === a.id ? etapeEnCours.ordre : null}
                    />
                  </div>
                )
              })}
            </div>

            <h2>Réviser le créneau de retrait</h2>
            <p className="sous-titre">Réservé au gérant ou à un employé habilité.</p>
            {(pressing?.creneauxRetrait || []).map((c) => (
              <div
                key={c.id}
                className={`card card-selectionnable ${creneauChoisi?.id === c.id ? 'actif' : ''}`}
                onClick={() => setCreneauChoisi(c)}
              >
                {formaterCreneau(c)}
              </div>
            ))}
            <button className="primaire" disabled={!creneauChoisi} onClick={reviserCreneau}>
              Notifier le client du nouveau créneau
            </button>

            <h2>Notifications envoyées (WhatsApp)</h2>
            {state.notifications.length === 0 && <p className="sous-titre">Aucune notification pour l'instant.</p>}
            {state.notifications.map((n) => (
              <div key={n.id} className="notif-whatsapp">
                {n.texte}
              </div>
            ))}
          </>
        )
      )}

      {onglet === 'suivi' && <SuiviCommandes pressingId={pressingId} />}
    </section>
  )
}
