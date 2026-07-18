import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { moyensPaiement } from '../data/mock.js'
import { formaterMontant } from '../api.js'

// Numéro marchand configuré par moyen de paiement (cf. Gérant > Moyens de paiement). Le QR encode
// un texte lisible (pas un lien de paiement officiel Wave/OM — on n'a pas d'accès API à ce stade),
// pour que le client puisse au moins scanner le numéro sans risque de faute de frappe, puis
// effectuer lui-même le virement depuis son appli. La confirmation reste manuelle.
function numeroMarchand(moyen, pressingCourant) {
  if (moyen === 'wave') return pressingCourant?.numeroMarchandWave || ''
  if (moyen === 'orange_money') return pressingCourant?.numeroMarchandOm || ''
  return ''
}

export default function Paiement() {
  const { type } = useParams() // 'acompte' ou 'solde'
  const { state, dispatch, pressingCourant } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  const devise = pressingCourant?.devise
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
  const numero = numeroMarchand(moyen, pressingCourant)
  const affichageQr = (moyen === 'wave' || moyen === 'orange_money') && numero

  async function payer() {
    await dispatch({ type: 'PAYER', typePaiement: type, montant, moyen })
    if (type === 'solde') {
      navigate('/commande/retire')
    } else {
      navigate('/commande/suivi')
    }
  }

  return (
    <section>
      <h1>Paiement {type === 'solde' ? 'du solde' : "de l'acompte"}</h1>
      <p className="sous-titre">{formaterMontant(montant, devise)} sur {formaterMontant(commande.prixTotal, devise)}</p>

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

      {affichageQr && (
        <div className="card" style={{ textAlign: 'center' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
              `${moyen === 'wave' ? 'Wave' : 'Orange Money'} ${pressingCourant?.nom || ''} - ${numero} - ${formaterMontant(montant, devise)}`
            )}`}
            alt={`QR code de paiement ${moyen === 'wave' ? 'Wave' : 'Orange Money'}`}
            width={180}
            height={180}
            style={{ margin: '0 auto 8px' }}
          />
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Numéro marchand : {numero}</p>
          <p className="sous-titre" style={{ marginTop: 4 }}>
            Scannez ou composez ce numéro dans votre application {moyen === 'wave' ? 'Wave' : 'Orange Money'} pour
            envoyer {formaterMontant(montant, devise)}, puis confirmez ci-dessous.
          </p>
        </div>
      )}

      {(moyen === 'wave' || moyen === 'orange_money') && !numero && (
        <p className="sous-titre">
          Ce pressing n'a pas encore renseigné son numéro marchand {moyen === 'wave' ? 'Wave' : 'Orange Money'}.
        </p>
      )}

      <p className="sous-titre">Confirmation envoyée par WhatsApp et SMS, même sans l'application.</p>

      <button className="primaire" onClick={payer}>
        {affichageQr ? "J'ai effectué le paiement" : `Payer ${formaterMontant(montant, devise)}`}
      </button>
    </section>
  )
}
