import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function Accueil() {
  const { pressings, dispatch } = useApp()
  const navigate = useNavigate()

  async function choisir(pressingId) {
    await dispatch({ type: 'CHOISIR_PRESSING', pressingId })
    navigate('/nouvelle-commande')
  }

  return (
    <section>
      <h1>Bonjour</h1>
      <p className="sous-titre">Choisissez un pressing pour déposer ou faire enlever votre linge.</p>

      <input type="text" placeholder="Chercher un pressing près de moi" />

      <h2>Pressings utilisés</h2>
      {pressings.map((p) => (
        <div key={p.id} className="card card-selectionnable" onClick={() => choisir(p.id)}>
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.9rem' }}>{p.nom}</strong>
            <span className="badge badge-succes">Ouvert</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
            {p.adresse}
          </div>
        </div>
      ))}
    </section>
  )
}
