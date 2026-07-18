// Grille de boutons — une puce par étape du circuit de l'article (détachage, lavage, repassage...).
// Un clic bascule l'étape entre "à faire" (gris) et "faite" (vert) ; un second clic annule une
// validation faite par erreur. Toutes les étapes sont visibles et cliquables en même temps, sans
// ordre imposé : plus rapide que l'ancien flux "une seule étape active à la fois", et utilisable
// aussi bien depuis la fiche de la commande en cours que depuis le suivi global.
export default function EtapesArticle({ article, onToggle, ordreEnCours }) {
  if (!article.etapes || article.etapes.length === 0) {
    return <p className="sous-titre" style={{ margin: '4px 0 0' }}>Circuit non encore généré (inventaire pas encore validé).</p>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {article.etapes.map((e) => {
        const fait = e.statut === 'validee'
        const enCours = ordreEnCours === e.ordre
        return (
          <button
            key={e.ordre}
            onClick={() => onToggle(e.ordre)}
            disabled={enCours}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: fait ? 'var(--vert, #2e7d32)' : 'var(--gris-carte-fonce, #1e293b)',
              color: 'white',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: enCours ? 0.6 : 1,
              transition: 'background 0.15s ease',
            }}
          >
            {fait && <i className="ti ti-check" aria-hidden="true"></i>}
            {e.libelle}
          </button>
        )
      })}
    </div>
  )
}
