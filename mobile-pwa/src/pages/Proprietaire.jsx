import { pressings } from '../data/mock.js'

const kpiMock = {
  p1: { commandesMois: 142, ca: 3120.5, nonRecupere: 4 },
  p2: { commandesMois: 98, ca: 2140.0, nonRecupere: 2 },
}

export default function Proprietaire() {
  const totalCommandes = pressings.reduce((s, p) => s + (kpiMock[p.id]?.commandesMois || 0), 0)
  const totalCa = pressings.reduce((s, p) => s + (kpiMock[p.id]?.ca || 0), 0)

  return (
    <section>
      <h1>Tableau de bord propriétaire</h1>
      <p className="sous-titre">Vue consolidée de tous les pressings — accès réservé au propriétaire dans la version finale.</p>

      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Commandes ce mois-ci (tous pressings)</span><strong>{totalCommandes}</strong></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Chiffre d'affaires ce mois-ci</span><strong>{totalCa.toFixed(2)} EUR</strong></div>
      </div>

      <h2>Par pressing</h2>
      {pressings.map((p) => {
        const kpi = kpiMock[p.id] || { commandesMois: 0, ca: 0, nonRecupere: 0 }
        return (
          <div key={p.id} className="card">
            <div className="ligne-entre">
              <strong style={{ fontSize: '0.9rem' }}>{p.nom}</strong>
              <span className="badge badge-neutre">Gérant : à définir</span>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Commandes</span><span>{kpi.commandesMois}</span></div>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Chiffre d'affaires</span><span>{kpi.ca.toFixed(2)} EUR</span></div>
              <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Linge non récupéré</span><span>{kpi.nonRecupere}</span></div>
            </div>
          </div>
        )
      })}

      <p className="sous-titre">
        Écran de démonstration : les chiffres sont fictifs. La nomination des gérants et la
        création de nouveaux pressings ne sont pas encore branchées.
      </p>
    </section>
  )
}
