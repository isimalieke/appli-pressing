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

  // Une seule tâche visible à la fois : on prend le premier article qui a encore une étape
  // "en_cours" et on n'affiche que celle-ci, en grand, avec un unique bouton d'action.
  // Objectif : pas de liste à parcourir, pas de choix à faire — l'employé valide, l'écran
  // passe automatiquement à la tâche suivante.
  const articleActif = commande.articles.find((a) => a.etapes.some((e) => e.statut === 'en_cours'))
  const etapeActive = articleActif?.etapes.find((e) => e.statut === 'en_cours')
  const nbArticlesTermines = commande.articles.filter((a) => a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')).length

  return (
    <section>
      <h1>Commande #{commande.numeroTicket}</h1>
      <p className="sous-titre">
        Article {Math.min(nbArticlesTermines + 1, commande.articles.length)} / {commande.articles.length}
      </p>

      {articleActif && etapeActive ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ color: 'var(--texte-muted)', fontSize: '0.8rem', marginBottom: 4 }}>
            {articleActif.type} — {articleActif.etiquette}
          </div>
          <div style={{ fontFamily: 'var(--police-titre)', fontSize: '1.5rem', margin: '0.5rem 0 1.25rem' }}>
            {etapeActive.libelle}
          </div>
          <button
            className="primaire"
            style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            onClick={() => valider(articleActif.id, etapeActive)}
          >
            Valider cette étape
          </button>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <span className="badge badge-succes" style={{ fontSize: '0.9rem' }}>Tous les articles sont prêts</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '1rem' }}>
        {commande.articles.map((a) => {
          const termine = a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')
          const enCours = a.id === articleActif?.id
          return (
            <div key={a.id} className="ligne-entre" style={{ fontSize: '0.75rem', padding: '4px 2px' }}>
              <span style={{ color: enCours ? 'var(--texte)' : 'var(--texte-muted)' }}>
                {a.type} — {a.etiquette}
              </span>
              {termine ? (
                <span className="badge badge-succes">Prêt</span>
              ) : enCours ? (
                <span className="badge badge-neutre">En cours</span>
              ) : (
                <span style={{ color: 'var(--texte-muted)' }}>En attente</span>
              )}
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
    </section>
  )
}
