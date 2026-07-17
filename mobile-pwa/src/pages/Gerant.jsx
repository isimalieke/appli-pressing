import { useState } from 'react'
import { pressings } from '../data/mock.js'

export default function Gerant() {
  const [pressingId, setPressingId] = useState(pressings[0].id)
  const pressing = pressings.find((p) => p.id === pressingId)

  const employesMock = [
    { nom: 'Fatou D.', poste: 'Réception' },
    { nom: 'Ibrahim K.', poste: 'Lavage' },
    { nom: 'Awa K.', poste: 'Repassage' },
    { nom: 'Moussa T.', poste: 'Caisse' },
  ]

  return (
    <section>
      <h1>Configuration du pressing</h1>
      <p className="sous-titre">Vue gérant — accès réservé au gérant ou au propriétaire dans la version finale.</p>

      <select value={pressingId} onChange={(e) => setPressingId(e.target.value)} style={{ marginBottom: '1rem' }}>
        {pressings.map((p) => (
          <option key={p.id} value={p.id}>{p.nom}</option>
        ))}
      </select>

      <h2>Catalogue de soins et tarifs</h2>
      {pressing.soins.map((s) => (
        <div key={s.id} className="card ligne-entre">
          <span style={{ fontSize: '0.85rem' }}>{s.libelle}</span>
          <strong>{s.prix.toFixed(2)} EUR</strong>
        </div>
      ))}

      <h2>Règles</h2>
      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Acompte</span><span>{pressing.acomptePourcent}% du total</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai standard</span><span>{pressing.delaiStandardH} h</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai express</span><span>{pressing.delaiExpressH} h</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Frais de garde</span><span>{pressing.fraisGarde.montantParJour.toFixed(2)} EUR/jour après {pressing.fraisGarde.delaiGlobalJours} j</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Rayon de collecte</span><span>{pressing.rayonCollecteKm} km</span></div>
      </div>

      <h2>Créneaux de dépôt</h2>
      {pressing.creneauxDepot.map((c) => (
        <div key={c} className="card">{c}</div>
      ))}

      <h2>Créneaux de retrait</h2>
      {pressing.creneauxRetrait.map((c) => (
        <div key={c} className="card">{c}</div>
      ))}

      <h2>Employés</h2>
      {employesMock.map((e) => (
        <div key={e.nom} className="card ligne-entre">
          <span style={{ fontSize: '0.85rem' }}>{e.nom}</span>
          <span className="badge badge-neutre">{e.poste}</span>
        </div>
      ))}

      <p className="sous-titre">
        Écran de démonstration : la modification des soins, tarifs, créneaux et employés n'est
        pas encore branchée (lecture seule pour l'instant).
      </p>
    </section>
  )
}
