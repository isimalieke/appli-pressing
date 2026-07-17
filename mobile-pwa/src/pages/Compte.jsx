import { useApp } from '../context/AppContext.jsx'

export default function Compte() {
  const { pressings } = useApp()

  return (
    <section>
      <h1>Mon compte</h1>
      <p className="sous-titre">Identifiant unique, valable dans tous les pressings que vous utilisez.</p>

      <h2>Points de fidélité</h2>
      {pressings.map((p) => (
        <div key={p.id} className="card ligne-entre">
          <span style={{ fontSize: '0.85rem' }}>{p.nom}</span>
          <span className="badge badge-neutre">120 pts</span>
        </div>
      ))}

      <p className="sous-titre">
        Chaque pressing définit sa propre récompense. Si le propriétaire d'un groupe de pressings
        active un programme consolidé, vos points se cumulent aussi à ce niveau.
      </p>
    </section>
  )
}
