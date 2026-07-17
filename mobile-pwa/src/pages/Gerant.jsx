import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau, formaterCreneauDomicile, formaterJoursOuverts } from '../api.js'

export default function Gerant() {
  const { pressings } = useApp()
  const [pressingId, setPressingId] = useState(null)
  const [pressing, setPressing] = useState(null)
  const [staff, setStaff] = useState([])
  const [creneauxDomicile, setCreneauxDomicile] = useState([])

  useEffect(() => {
    if (!pressingId && pressings.length) setPressingId(pressings[0].id)
  }, [pressings, pressingId])

  useEffect(() => {
    if (!pressingId) return
    api.detailPressing(pressingId).then((d) => setPressing(normaliserPressing(d)))
    api.listerStaff(pressingId).then(setStaff)
    api.creneauxDomicile(pressingId).then(setCreneauxDomicile)
  }, [pressingId])

  if (!pressing) {
    return (
      <section>
        <h1>Configuration du pressing</h1>
        <p className="sous-titre">Chargement...</p>
      </section>
    )
  }

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
      {pressing.soins.map((s) => {
        const tarif = pressing.tarifs.find((t) => t.soin_id === s.id)
        return (
          <div key={s.id} className="card ligne-entre">
            <span style={{ fontSize: '0.85rem' }}>{s.libelle}</span>
            <strong>{tarif ? tarif.prix.toFixed(2) : '—'} EUR</strong>
          </div>
        )
      })}

      <h2>Horaires d'ouverture</h2>
      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Jours ouverts</span><span>{formaterJoursOuverts(pressing.joursOuverts)}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Horaires</span><span>{pressing.heureOuverture}–{pressing.heureFermeture}</span></div>
      </div>

      <h2>Règles</h2>
      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Acompte</span><span>{pressing.acomptePourcent}% du total</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai standard</span><span>{pressing.delaiStandardJoursOuvres} jour{pressing.delaiStandardJoursOuvres > 1 ? 's' : ''} ouvré{pressing.delaiStandardJoursOuvres > 1 ? 's' : ''}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai express</span><span>{pressing.delaiExpressJoursOuvres} jour{pressing.delaiExpressJoursOuvres > 1 ? 's' : ''} ouvré{pressing.delaiExpressJoursOuvres > 1 ? 's' : ''}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Frais de garde</span><span>{pressing.fraisGarde.montantParJour.toFixed(2)} EUR/jour après {pressing.fraisGarde.delaiGlobalJours} j</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Rayon de collecte</span><span>{pressing.rayonCollecteKm} km</span></div>
      </div>

      <h2>Créneaux de collecte à domicile (7 prochains jours, générés depuis le gabarit hebdo)</h2>
      {creneauxDomicile.length === 0 && <p className="sous-titre">Aucun gabarit de créneaux défini pour ce pressing.</p>}
      {creneauxDomicile.slice(0, 8).map((c) => (
        <div key={c.label} className="card ligne-entre">
          <span>{formaterCreneauDomicile(c)}</span>
          <span className="badge badge-neutre">{c.disponible ? `${c.places_restantes} place${c.places_restantes > 1 ? 's' : ''}` : 'Complet'}</span>
        </div>
      ))}

      <h2>Créneaux de retrait (révision manuelle)</h2>
      {pressing.creneauxRetrait.map((c) => (
        <div key={c.id} className="card">{formaterCreneau(c)}</div>
      ))}

      <h2>Employés</h2>
      {staff.length === 0 && <p className="sous-titre">Aucun employé enregistré pour ce pressing.</p>}
      {staff.map((e) => (
        <div key={e.id} className="card ligne-entre">
          <span style={{ fontSize: '0.85rem' }}>{e.prenom} {e.nom}</span>
          <span className="badge badge-neutre">{e.role === 'gerant' ? 'Gérant' : e.poste || 'Employé'}</span>
        </div>
      ))}

      <p className="sous-titre">
        Écran de démonstration : la modification des soins, tarifs, créneaux et employés n'est
        pas encore branchée (lecture seule pour l'instant).
      </p>
    </section>
  )
}
