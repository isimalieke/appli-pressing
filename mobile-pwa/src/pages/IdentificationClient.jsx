import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

// Identifie le client par numéro de téléphone avant d'utiliser l'app, sans mot de passe — cohérent
// avec un usage WhatsApp-first. Retrouve son compte s'il existe déjà, le crée sinon.
export default function IdentificationClient() {
  const { state, dispatch } = useApp()
  const { erreur } = state
  const [telephone, setTelephone] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')

  async function continuer(e) {
    e.preventDefault()
    if (!telephone) return
    try {
      await dispatch({ type: 'IDENTIFIER_CLIENT', telephone, nom, prenom })
    } catch {
      // L'erreur est déjà affichée via state.erreur
    }
  }

  return (
    <section>
      <h1>Bienvenue</h1>
      <p className="sous-titre">Indiquez votre numéro de téléphone pour continuer.</p>

      <form onSubmit={continuer}>
        <div className="card">
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Numéro de téléphone</label>
          <input
            type="tel"
            placeholder="+221 77 000 00 00"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
            autoFocus
          />
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Prénom (optionnel)</label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Nom (optionnel)</label>
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} style={{ width: '100%' }} />
        </div>

        {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{erreur}</p>}

        <button className="primaire" type="submit" disabled={!telephone} style={{ marginTop: '0.5rem' }}>
          Continuer
        </button>
      </form>
    </section>
  )
}
