import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formaterMontant } from '../api.js'

export default function Kilo() {
  const { state, dispatch, pressingCourant } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  const [poids, setPoids] = useState('')

  if (!commande || !pressingCourant) {
    return (
      <section>
        <p className="sous-titre">Aucune commande en cours.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const poidsNombre = Number(poids)
  const prixEstime = poidsNombre > 0 ? poidsNombre * pressingCourant.prixKilo : 0
  const peutContinuer = poidsNombre > 0

  async function continuer() {
    if (!peutContinuer) return
    await dispatch({ type: 'ENREGISTRER_POIDS', poidsKg: poidsNombre })
    navigate('/commande/inventaire')
  }

  return (
    <section>
      <h1>{pressingCourant.nom}</h1>
      <p className="sous-titre">Linge en vrac — pesez le lot et validez, une seule étiquette sera générée pour l'ensemble.</p>

      <div className="card">
        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Poids du linge (kg)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="0.0"
          value={poids}
          onChange={(e) => setPoids(e.target.value)}
          style={{ fontSize: '1.1rem' }}
          autoFocus
        />
      </div>

      <div className="card ligne-entre">
        <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
          Tarif : {formaterMontant(pressingCourant.prixKilo, pressingCourant.devise)} / kg
        </span>
        <strong>{formaterMontant(prixEstime, pressingCourant.devise)}</strong>
      </div>

      <button className="primaire" disabled={!peutContinuer} onClick={continuer} style={{ marginTop: '0.5rem' }}>
        Continuer vers la réception
      </button>
    </section>
  )
}
