import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const CIVILITES = ['Monsieur', 'Madame']

// Identifie le client par numéro de téléphone avant de démarrer un dépôt, sans mot de passe —
// cohérent avec un usage WhatsApp-first. Retrouve son compte s'il existe déjà, le crée sinon.
// Affichée une fois le pressing choisi, pour pouvoir personnaliser l'accueil avec son nom.
export default function IdentificationClient({ pressingNom }) {
  const { state, dispatch } = useApp()
  const { erreur } = state
  const [civilite, setCivilite] = useState('')
  const [telephone, setTelephone] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')

  const peutContinuer = civilite && telephone.trim() && prenom.trim() && nom.trim()

  async function continuer(e) {
    e.preventDefault()
    if (!peutContinuer) return
    try {
      await dispatch({ type: 'IDENTIFIER_CLIENT', telephone, nom, prenom, civilite })
    } catch {
      // L'erreur est déjà affichée via state.erreur
    }
  }

  return (
    <section>
      <h1>Bienvenue</h1>
      <p className="sous-titre">
        {pressingNom
          ? `${pressingNom} est ravi de prendre soin de votre linge. Parlez-nous de vous pour continuer.`
          : 'Parlez-nous de vous pour continuer.'}
      </p>

      <form onSubmit={continuer}>
        <div className="card">
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Civilité</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {CIVILITES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCivilite(c)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: civilite === c ? 'none' : '1px solid var(--gris-bordure)',
                  background: civilite === c ? 'var(--bleu)' : 'var(--gris-carte)',
                  color: civilite === c ? 'white' : 'var(--texte)',
                  fontSize: '0.85rem',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Prénom</label>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Nom</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Numéro de téléphone</label>
          <input
            type="tel"
            placeholder="+221 77 000 00 00"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{erreur}</p>}

        <button className="primaire" type="submit" disabled={!peutContinuer} style={{ marginTop: '0.5rem' }}>
          Continuer
        </button>
      </form>
    </section>
  )
}
