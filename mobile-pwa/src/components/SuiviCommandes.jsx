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

const FILTRES = [
  { id: 'toutes', libelle: 'Toutes' },
  { id: 'pretes', libelle: 'Prêtes' },
  { id: 'en_cours', libelle: 'En traitement' },
]

// Vue simple, partagée entre Employé, Gérant et Propriétaire : une ligne par commande en cours,
// avec le nom du client et le nombre d'articles prêts sur le total. Objectif : pouvoir répondre
// tout de suite à un client qui appelle pour savoir où en est son linge, sans ouvrir chaque
// commande une par une. Les commandes prêtes remontent en premier — c'est la file d'attente de
// remise au client — et chacune indique si elle part en livraison ou attend un retrait en
// magasin, pour ne pas préparer la mauvaise remise.
export default function SuiviCommandes({ pressingId }) {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(false)
  const [filtre, setFiltre] = useState('toutes')

  useEffect(() => {
    if (!pressingId) return
    setChargement(true)
    api.listerCommandesPressing(pressingId)
      .then(setCommandes)
      .finally(() => setChargement(false))
  }, [pressingId])

  async function remettreAuClient(commandeId) {
    await api.marquerRemise(commandeId)
    const fraiches = await api.listerCommandesPressing(pressingId)
    setCommandes(fraiches)
  }

  const enCours = commandes
    .filter((c) => !STATUTS_CLOS.includes(c.statut))
    .filter((c) => {
      if (filtre === 'pretes') return c.statut === 'prete'
      if (filtre === 'en_cours') return c.statut !== 'prete'
      return true
    })
    // Les commandes prêtes remontent en tête : c'est la file d'attente de remise au client.
    .sort((a, b) => (a.statut === 'prete') === (b.statut === 'prete') ? 0 : a.statut === 'prete' ? -1 : 1)

  return (
    <div>
      <h2>Suivi des commandes</h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {FILTRES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: filtre === f.id ? 'none' : '1px solid var(--gris-bordure)',
              background: filtre === f.id ? 'var(--bleu)' : 'var(--gris-carte)',
              color: filtre === f.id ? 'white' : 'var(--texte)',
              fontSize: '0.75rem',
            }}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {chargement && <p className="sous-titre">Chargement...</p>}
      {!chargement && enCours.length === 0 && (
        <p className="sous-titre">Aucune commande à afficher pour ce filtre.</p>
      )}
      {enCours.map((c) => (
        <div key={c.id} className="card">
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.85rem' }}>
              {c.client_prenom} {c.client_nom} — #{c.numero_ticket || '—'}
            </strong>
            <span className={`badge ${c.statut === 'prete' ? 'badge-succes' : 'badge-neutre'}`}>
              {LIBELLES_STATUT[c.statut] || c.statut}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--texte-muted)', marginTop: 4 }}>
            {c.client_telephone && <span>{c.client_telephone} · </span>}
            {c.nb_articles_prets} / {c.nb_articles} article{c.nb_articles > 1 ? 's' : ''} prêt{c.nb_articles_prets > 1 ? 's' : ''}
          </div>
          {c.statut === 'prete' && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-neutre">
                <i
                  className={`ti ${c.mode_depot === 'domicile' ? 'ti-truck' : 'ti-building-store'}`}
                  aria-hidden="true"
                  style={{ marginRight: 4 }}
                ></i>
                {c.mode_depot === 'domicile' ? 'À livrer à domicile' : 'À retirer en magasin'}
              </span>
              <button
                onClick={() => remettreAuClient(c.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--vert, #2e7d32)',
                  color: 'white',
                  fontSize: '0.75rem',
                }}
              >
                Remis au client
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
