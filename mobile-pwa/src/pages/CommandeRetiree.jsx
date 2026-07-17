import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function CommandeRetiree() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const commande = state.commande

  if (!commande) {
    return (
      <section>
        <p className="sous-titre">Aucune commande.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  function noter(valeur) {
    dispatch({ type: 'NOTER_COMMANDE', note: valeur })
  }

  return (
    <section>
      <h1>Linge récupéré</h1>
      <p className="sous-titre">Commande #{commande.numeroTicket} — merci d'avoir utilisé ce pressing.</p>

      <div className="card">
        <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Comment évaluez-vous cette prestation ?</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => noter(n)}
              style={{ padding: '0.4rem 0.6rem', color: commande.evaluation >= n ? 'var(--ambre)' : 'var(--texte-muted)' }}
            >
              <i className="ti ti-star" aria-hidden="true"></i>
            </button>
          ))}
        </div>
      </div>

      <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
    </section>
  )
}
