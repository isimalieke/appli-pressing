import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau } from '../api.js'
import SuiviCommandes from '../components/SuiviCommandes.jsx'

export default function Employe() {
  const { state, dispatch } = useApp()
  const commande = state.commande
  const [creneauChoisi, setCreneauChoisi] = useState(null)
  const [pressing, setPressing] = useState(null)

  useEffect(() => {
    if (commande?.pressingId) {
      api.detailPressing(commande.pressingId).then((d) => setPressing(normaliserPressing(d)))
    }
  }, [commande?.pressingId])

  if (!commande || !commande.numeroTicket) {
    return (
      <section>
        <h1>Poste de travail</h1>
        <p className="sous-titre">
          Aucune commande déposée pour l'instant. Vue destinée au personnel, distincte du parcours
          client — dans la version finale, l'accès sera réservé aux comptes employé/gérant.
        </p>
        <SuiviCommandes pressingId={pressing?.id} />
      </section>
    )
  }

  // "staff_id" doit correspondre à une vraie ligne de pressing_staff (contrainte de clé
  // étrangère), sinon le serveur rejette l'appel. Tant que l'authentification employé n'est pas
  // branchée, on ne transmet aucun staff_id (NULL est accepté).
  function valider(articleId, etape) {
    dispatch({ type: 'VALIDER_ETAPE', articleId, etapeIndex: etape.ordre })
  }

  function reviserCreneau() {
    if (!creneauChoisi) return
    dispatch({ type: 'REVISER_CRENEAU', creneau: formaterCreneau(creneauChoisi) })
  }

  // Une ligne par article du lot, toujours visible en même temps — pas d'écran unique qui saute
  // d'un article à l'autre. Chaque ligne montre l'étape en cours de CET article et son propre
  // bouton "Valider" : l'employé voit tout le lot d'un coup d'œil et agit directement sur la
  // bonne ligne, sans avoir à faire défiler pour retrouver où en est tel ou tel vêtement.
  const nbArticlesTermines = commande.articles.filter((a) => a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')).length
  const commandeComplete = commande.articles.length > 0 && nbArticlesTermines === commande.articles.length

  function notifierClient() {
    dispatch({ type: 'NOTIFIER_CLIENT_PRET' })
  }

  return (
    <section>
      <h1>Commande #{commande.numeroTicket}</h1>
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
          const etape = a.etapes.find((e) => e.statut === 'en_cours')
          const termine = a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')
          return (
            <div key={a.id} className="card">
              <div className="ligne-entre">
                <strong style={{ fontSize: '0.85rem' }}>{a.type} — {a.etiquette}</strong>
                {termine && <span className="badge badge-succes">Prêt</span>}
              </div>
              {!termine && etape && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.95rem', marginBottom: 8 }}>{etape.libelle}</div>
                  <button
                    className="primaire"
                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                    onClick={() => valider(a.id, etape)}
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SuiviCommandes pressingId={commande.pressingId} />

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
    </section>
  )
}
