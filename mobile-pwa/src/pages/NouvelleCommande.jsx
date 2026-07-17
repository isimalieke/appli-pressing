import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formaterCreneau, formaterJoursOuverts } from '../api.js'

export default function NouvelleCommande() {
  const { pressingCourant, dispatch } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('comptoir')
  const [creneauId, setCreneauId] = useState(null)

  if (!pressingCourant) {
    return (
      <section>
        <p className="sous-titre">Choisissez d'abord un pressing depuis l'accueil.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  // Le dépôt au comptoir n'a pas de créneau : le client vient pendant les horaires d'ouverture.
  // Seule la collecte à domicile réserve un créneau (contrainte de tournée du livreur).
  const creneauxCollecte = pressingCourant.creneauxCollecteDomicile
  const peutConfirmer = mode === 'comptoir' || !!creneauId

  async function confirmer() {
    if (!peutConfirmer) return
    await dispatch({
      type: 'DEMARRER_COMMANDE',
      pressingId: pressingCourant.id,
      modeDepot: mode,
      creneauDepotId: mode === 'domicile' ? creneauId : null,
    })
    navigate('/commande/soins')
  }

  return (
    <section>
      <h1>Comment déposer votre linge ?</h1>
      <p className="sous-titre">{pressingCourant.nom}</p>

      <div
        className={`card card-selectionnable ${mode === 'comptoir' ? 'actif' : ''}`}
        onClick={() => setMode('comptoir')}
      >
        <div className="ligne-entre">
          <span><i className="ti ti-building-store" aria-hidden="true" style={{ marginRight: 6 }}></i>Déposer au pressing</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
          {pressingCourant.adresse}
        </div>
      </div>

      <div
        className={`card card-selectionnable ${mode === 'domicile' ? 'actif' : ''}`}
        onClick={() => setMode('domicile')}
      >
        <div className="ligne-entre">
          <span><i className="ti ti-truck" aria-hidden="true" style={{ marginRight: 6 }}></i>Faire enlever à domicile</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
          Rayon de collecte : {pressingCourant.rayonCollecteKm} km autour du pressing
        </div>
      </div>

      {mode === 'comptoir' ? (
        <div className="card">
          <div className="ligne-entre">
            <span><i className="ti ti-clock" aria-hidden="true" style={{ marginRight: 6 }}></i>Horaires d'ouverture</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--texte-muted)', marginTop: 4 }}>
            {formaterJoursOuverts(pressingCourant.joursOuverts)}, {pressingCourant.heureOuverture}–{pressingCourant.heureFermeture}
          </div>
          <p className="sous-titre" style={{ marginTop: 8 }}>
            Venez déposer votre linge à tout moment pendant ces horaires — aucun créneau à réserver.
          </p>
        </div>
      ) : (
        <>
          <h2>Créneaux de collecte disponibles</h2>
          {creneauxCollecte.length === 0 && (
            <p className="sous-titre">Aucun créneau de collecte à domicile n'est disponible pour ce pressing.</p>
          )}
          {creneauxCollecte.map((c) => (
            <div
              key={c.id}
              className={`card card-selectionnable ${creneauId === c.id ? 'actif' : ''}`}
              onClick={() => setCreneauId(c.id)}
            >
              {formaterCreneau(c)}
            </div>
          ))}
        </>
      )}

      <button className="primaire" disabled={!peutConfirmer} onClick={confirmer} style={{ marginTop: '1rem' }}>
        {mode === 'comptoir' ? 'Commencer le dépôt' : 'Confirmer le créneau de collecte'}
      </button>
    </section>
  )
}
