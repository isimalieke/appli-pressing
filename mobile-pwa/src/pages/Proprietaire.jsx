import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, formaterMontant } from '../api.js'
import SuiviCommandes from '../components/SuiviCommandes.jsx'

export default function Proprietaire() {
  const { pressings } = useApp()
  const [kpiParPressing, setKpiParPressing] = useState({})

  useEffect(() => {
    pressings.forEach((p) => {
      api.listerCommandesPressing(p.id).then((commandes) => {
        const ca = commandes.reduce((s, c) => s + (c.prix_total || 0), 0)
        const nonRecupere = commandes.filter((c) => c.statut === 'non_recuperee').length
        setKpiParPressing((k) => ({ ...k, [p.id]: { commandes: commandes.length, ca, nonRecupere } }))
      })
    })
  }, [pressings])

  const totalCommandes = Object.values(kpiParPressing).reduce((s, k) => s + k.commandes, 0)
  const devisesDistinctes = new Set(pressings.map((p) => p.devise || 'XOF')).size > 1

  return (
    <section>
      <h1>Tableau de bord propriétaire</h1>
      <p className="sous-titre">Vue consolidée de tous les pressings — accès réservé au propriétaire dans la version finale.</p>

      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Commandes (tous pressings)</span><strong>{totalCommandes}</strong></div>
      </div>
      {devisesDistinctes && (
        <p className="sous-titre">
          Le chiffre d'affaires cumulé n'est pas affiché car vos pressings utilisent des devises
          différentes — voir le détail par pressing ci-dessous.
        </p>
      )}

      <h2>Par pressing</h2>
      {pressings.map((p) => {
        const kpi = kpiParPressing[p.id] || { commandes: 0, ca: 0, nonRecupere: 0 }
        return (
          <div key={p.id} className="card">
            <div className="ligne-entre">
              <strong style={{ fontSize: '0.9rem' }}>{p.nom}</strong>
              <span className="badge badge-neutre">Gérant : à définir</span>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Commandes</span><span>{kpi.commandes}</span></div>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Chiffre d'affaires</span><span>{formaterMontant(kpi.ca, p.devise)}</span></div>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Linge non récupéré</span><span>{kpi.nonRecupere}</span></div>
            </div>
            <SuiviCommandes pressingId={p.id} />
          </div>
        )
      })}

      <p className="sous-titre">
        Chiffres calculés à partir des vraies commandes enregistrées en base. La nomination des
        gérants et la création de nouveaux pressings ne sont pas encore branchées.
      </p>
    </section>
  )
}
