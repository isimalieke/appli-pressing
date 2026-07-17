import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau } from '../api.js'

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
      </section>
    )
  }

  function valider(articleId, etape) {
    dispatch({ type: 'VALIDER_ETAPE', articleId, etapeIndex: etape.ordre, employe: 'Employé connecté' })
  }

  function reviserCreneau() {
    if (!creneauChoisi) return
    dispatch({ type: 'REVISER_CRENEAU', creneau: formaterCreneau(creneauChoisi) })
  }

  return (
    <section>
      <h1>Commande #{commande.numeroTicket}</h1>
      <p className="sous-titre">Vue employé — validation des étapes par poste, article par article.</p>

      {commande.articles.map((a) => (
        <div key={a.id} className="card">
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.85rem' }}>{a.type} — {a.etiquette}</strong>
          </div>
          {a.etapes.map((e) => (
            <div key={e.libelle} className="ligne-entre" style={{ padding: '6px 0', fontSize: '0.8rem' }}>
              <span style={{ color: e.statut === 'validee' ? 'var(--vert)' : 'var(--texte)' }}>
                {e.libelle}
                {e.statut === 'validee' && e.horodatage && (
                  <span style={{ color: 'var(--texte-muted)', fontSize: '0.7rem' }}> — {new Date(e.horodatage).toLocaleTimeString('fr-FR')}</span>
                )}
              </span>
              {e.statut === 'validee' ? (
                <span className="badge badge-succes">Validée</span>
              ) : e.statut === 'en_cours' ? (
                <button onClick={() => valider(a.id, e)}>Valider cette étape</button>
              ) : (
                <span style={{ color: 'var(--texte-muted)' }}>À faire</span>
              )}
            </div>
          ))}
        </div>
      ))}

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
