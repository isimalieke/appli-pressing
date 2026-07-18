import { useEffect, useState } from 'react'
import { api } from '../api.js'

const LIBELLES_STATUT = {
  creee: 'Créée',
  deposee: 'Déposée',
  en_traitement: 'En traitement',
  prete: 'Prête',
  revisee: 'Créneau révisé',
  retiree: 'Retirée',
  non_recuperee: 'Non récupérée',
  annulee: 'Annulée',
}

// États considérés comme "clos" : on ne les affiche pas dans le suivi quotidien, pour ne montrer
// que ce qui est encore actif (le client n'a pas encore récupéré son linge, ou la commande n'est
// pas annulée).
const STATUTS_CLOS = ['retiree', 'annulee']

// Vue simple, partagée entre Employé, Gérant et Propriétaire : une ligne par commande en cours,
// avec le nom du client et le nombre d'articles prêts sur le total. Objectif : pouvoir répondre
// tout de suite à un client qui appelle pour savoir où en est son linge, sans ouvrir chaque
// commande une par une.
export default function SuiviCommandes({ pressingId }) {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!pressingId) return
    setChargement(true)
    api.listerCommandesPressing(pressingId)
      .then(setCommandes)
      .finally(() => setChargement(false))
  }, [pressingId])

  const enCours = commandes.filter((c) => !STATUTS_CLOS.includes(c.statut))

  return (
    <div>
      <h2>Suivi des commandes</h2>
      {chargement && <p className="sous-titre">Chargement...</p>}
      {!chargement && enCours.length === 0 && (
        <p className="sous-titre">Aucune commande en cours pour ce pressing.</p>
      )}
      {enCours.map((c) => (
        <div key={c.id} className="card">
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.85rem' }}>
              {c.client_prenom} {c.client_nom} — #{c.numero_ticket || '—'}
            </strong>
            <span className="badge badge-neutre">{LIBELLES_STATUT[c.statut] || c.statut}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--texte-muted)', marginTop: 4 }}>
            {c.client_telephone && <span>{c.client_telephone} · </span>}
            {c.nb_articles_prets} / {c.nb_articles} article{c.nb_articles > 1 ? 's' : ''} prêt{c.nb_articles_prets > 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
