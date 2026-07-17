import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function NouvelleCommande() {
  const { pressingCourant, dispatch } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('comptoir')
  const [creneau, setCreneau] = useState(null)

  if (!pressingCourant) {
    return (
      <section>
        <p className="sous-titre">Choisissez d'abord un pressing depuis l'accueil.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const creneaux = pressingCourant.creneauxDepot

  function confirmer() {
    if (!creneau) return
    dispatch({
      type: 'DEMARRER_COMMANDE',
      pressingId: pressingCourant.id,
      modeDepot: mode,
      creneauDepot: creneau,
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
          {pressingCourant.distanceKm} km — {pressingCourant.adresse}
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

      <h2>Créneaux disponibles</h2>
      {creneaux.map((c) => (
        <div
          key={c}
          className={`card card-selectionnable ${creneau === c ? 'actif' : ''}`}
          onClick={() => setCreneau(c)}
        >
          {c}
        </div>
      ))}

      <button className="primaire" disabled={!creneau} onClick={confirmer} style={{ marginTop: '1rem' }}>
        Confirmer le créneau
      </button>
    </section>
  )
}
