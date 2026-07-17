import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

const JALONS = [
  { cle: 'deposee', libelle: 'Déposée et inventoriée' },
  { cle: 'en_traitement', libelle: 'En traitement' },
  { cle: 'prete', libelle: 'Prête pour retrait' },
  { cle: 'retiree', libelle: 'Retirée' },
]

function indexStatut(statut) {
  if (statut === 'revisee') return 2 // traité comme "prête" avec créneau révisé
  return JALONS.findIndex((j) => j.cle === statut)
}

export default function Suivi() {
  const { state } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  const [detailOuvert, setDetailOuvert] = useState(false)

  if (!commande || !commande.numeroTicket) {
    return (
      <section>
        <p className="sous-titre">Aucune commande en cours.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const idx = indexStatut(commande.statut)

  return (
    <section>
      <h1>Commande #{commande.numeroTicket}</h1>
      <p className="sous-titre">
        {commande.creneauRetraitRevise
          ? `Créneau révisé par le pressing : ${commande.creneauRetraitRevise}`
          : commande.dateRestitutionPrevue
          ? `Prêt prévu le ${new Date(commande.dateRestitutionPrevue).toLocaleString('fr-FR')}`
          : ''}
      </p>

      {JALONS.map((jalon, i) => (
        <div key={jalon.cle} className="timeline-item">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={`timeline-point ${i < idx ? 'validee' : i === idx ? 'en-cours' : ''}`}>
              {i < idx && <i className="ti ti-check" style={{ fontSize: 11 }} aria-hidden="true"></i>}
            </div>
            {i < JALONS.length - 1 && <div className="timeline-ligne" />}
          </div>
          <div style={{ paddingBottom: 18, fontSize: '0.85rem', fontWeight: i === idx ? 500 : 400 }}>
            {jalon.libelle}
          </div>
        </div>
      ))}

      <button className="discret" onClick={() => setDetailOuvert((v) => !v)} style={{ padding: 0 }}>
        {detailOuvert ? 'Masquer' : 'Voir'} le détail par vêtement
      </button>

      {detailOuvert && commande.articles.map((a) => (
        <div key={a.id} className="card" style={{ marginTop: 8 }}>
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.8rem' }}>{a.type} — {a.etiquette}</strong>
          </div>
          {a.etapes.length === 0 ? (
            <p className="sous-titre" style={{ margin: '4px 0 0' }}>En attente de dépôt effectif.</p>
          ) : (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.75rem' }}>
              {a.etapes.map((e) => (
                <li key={e.libelle} style={{ color: e.statut === 'validee' ? 'var(--vert)' : 'var(--texte-muted)' }}>
                  {e.libelle}{e.statut === 'validee' ? ' — validée' : e.statut === 'en_cours' ? ' — en cours' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {commande.statut === 'prete' && commande.montantSolde > 0 && !commande.paiements.some((p) => p.type === 'solde') && (
        <button className="primaire" style={{ marginTop: '1rem' }} onClick={() => navigate('/paiement/solde')}>
          Payer le solde ({commande.montantSolde.toFixed(2)} EUR)
        </button>
      )}
    </section>
  )
}
