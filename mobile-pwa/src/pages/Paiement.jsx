import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { moyensPaiement } from '../data/mock.js'

export default function Paiement() {
  const { type } = useParams() // 'acompte' ou 'solde'
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  const [moyen, setMoyen] = useState('orange_money')

  if (!commande) {
    return (
      <section>
        <p className="sous-titre">Aucune commande en cours.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const montant = type === 'solde' ? commande.montantSolde : commande.montantAcompte

  function payer() {
    dispatch({ type: 'PAYER', typePaiement: type, montant, moyen })
    if (type === 'solde') {
      dispatch({ type: 'RETIRER_COMMANDE' })
      navigate('/commande/retire')
    } else {
      navigate('/commande/suivi')
    }
  }

  return (
    <section>
      <h1>Paiement {type === 'solde' ? 'du solde' : "de l'acompte"}</h1>
      <p className="sous-titre">{montant.toFixed(2)} EUR sur {commande.prixTotal.toFixed(2)} EUR</p>

      {moyensPaiement.map((m) => (
        <label
          key={m.id}
          className="ligne-entre"
          style={{
            background: moyen === m.id ? 'var(--bleu-clair)' : 'var(--gris-carte)',
            color: moyen === m.id ? 'var(--bleu)' : 'var(--texte)',
            border: '1px solid var(--gris-bordure)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 8,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <span>
            <input
              type="radio"
              name="moyen"
              checked={moyen === m.id}
              onChange={() => setMoyen(m.id)}
              style={{ marginRight: 8 }}
            />
            <i className={`ti ${m.icon}`} aria-hidden="true" style={{ marginRight: 6 }}></i>
            {m.libelle}
          </span>
        </label>
      ))}

      <p className="sous-titre">Confirmation envoyée par WhatsApp et SMS, même sans l'application.</p>

      <button className="primaire" onClick={payer}>
        Payer {montant.toFixed(2)} EUR
      </button>
    </section>
  )
}
