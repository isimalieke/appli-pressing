import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function TicketPapier() {
  const { state } = useApp()
  const navigate = useNavigate()
  const commande = state.commande

  if (!commande || !commande.numeroTicket) {
    return (
      <section>
        <p className="sous-titre">Aucun ticket généré pour l'instant.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  return (
    <section>
      <h1>Ticket #{commande.numeroTicket}</h1>
      <p className="sous-titre">
        Souche à conserver par le client, copie collée au registre du pressing. Chaque étiquette
        numérotée ci-dessous doit être imprimée et agrafée au vêtement correspondant — le ticket
        papier reste la référence physique au retrait, même sans l'application.
      </p>

      <div className="card">
        <div className="ligne-entre">
          <strong>Commande #{commande.numeroTicket}</strong>
          <span className="badge badge-neutre">{commande.articles.length} article{commande.articles.length > 1 ? 's' : ''}</span>
        </div>
        {commande.articles.map((a) => (
          <div key={a.id} className="ligne-entre" style={{ fontSize: '0.8rem', marginTop: 6 }}>
            <span>{a.type} — {a.soins.length} soin{a.soins.length > 1 ? 's' : ''}</span>
            {a.reserve ? (
              <span className="badge badge-attention">Réserve notée</span>
            ) : (
              <span className="badge badge-succes">Bon état</span>
            )}
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--gris-bordure)', marginTop: 10, paddingTop: 10 }} className="ligne-entre">
          <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>Total</span>
          <strong>{commande.prixTotal.toFixed(2)} EUR</strong>
        </div>
        <div className="ligne-entre">
          <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>Acompte à régler</span>
          <strong>{commande.montantAcompte.toFixed(2)} EUR</strong>
        </div>
      </div>

      <h2>Étiquettes à agrafer</h2>
      {commande.articles.map((a) => (
        <div key={a.id} className="etiquette" style={{ marginRight: 6, marginBottom: 6 }}>
          <i className="ti ti-tag" aria-hidden="true"></i>
          {a.etiquette} — {a.type}
        </div>
      ))}

      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '1.5rem' }}>
        <button onClick={() => window.print()}>Imprimer le ticket et les étiquettes</button>
        <button className="primaire" onClick={() => navigate('/paiement/acompte')}>
          Payer l'acompte ({commande.montantAcompte.toFixed(2)} EUR)
        </button>
      </div>
    </section>
  )
}
