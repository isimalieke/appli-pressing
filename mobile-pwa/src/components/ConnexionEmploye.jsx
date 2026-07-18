import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

// Filtre d'accès minimal aux vues internes (employé/gérant/propriétaire), pensé pour un appareil
// partagé au comptoir du pressing : choix du pressing + code PIN, pas de mot de passe ni de
// session serveur. À renforcer avant un déploiement multi-pressing public — suffisant pour un
// pilote avec un seul pressing de confiance.
export default function ConnexionEmploye({ children }) {
  const { state, dispatch, pressings } = useApp()
  const { staffSession, erreur } = state
  const [pressingId, setPressingId] = useState(pressings[0]?.id || '')
  const [codePin, setCodePin] = useState('')

  if (staffSession) {
    return (
      <div>
        <div className="ligne-entre" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--texte-muted)' }}>
            Connecté : {staffSession.prenom} {staffSession.nom} ({staffSession.role === 'gerant' ? 'Gérant' : 'Employé'})
          </span>
          <button
            className="discret"
            style={{ fontSize: '0.75rem' }}
            onClick={() => dispatch({ type: 'DECONNEXION_STAFF' })}
          >
            Déconnexion
          </button>
        </div>
        {children}
      </div>
    )
  }

  async function connecter(e) {
    e.preventDefault()
    if (!pressingId || !codePin) return
    try {
      await dispatch({ type: 'CONNEXION_STAFF', pressingId, codePin })
    } catch {
      // L'erreur est déjà affichée via state.erreur
    }
  }

  return (
    <section>
      <h1>Connexion au poste de travail</h1>
      <p className="sous-titre">Réservé au personnel du pressing — choisissez votre pressing et saisissez votre code.</p>

      <form onSubmit={connecter}>
        <div className="card">
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Pressing</label>
          <select value={pressingId} onChange={(e) => setPressingId(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
            {pressings.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>

          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Code PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={codePin}
            onChange={(e) => setCodePin(e.target.value)}
            style={{ width: '100%', fontSize: '1.1rem', letterSpacing: '0.2em' }}
            autoFocus
          />
        </div>

        {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{erreur}</p>}

        <button className="primaire" type="submit" disabled={!pressingId || !codePin} style={{ marginTop: '0.5rem' }}>
          Se connecter
        </button>
      </form>
    </section>
  )
}
