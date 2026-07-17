import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { typesArticle } from '../data/mock.js'

export default function ChoixSoins() {
  const { state, dispatch, pressingCourant } = useApp()
  const navigate = useNavigate()
  const commande = state.commande

  if (!commande || !pressingCourant) {
    return (
      <section>
        <p className="sous-titre">Aucune commande en cours.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  function ajouterArticle(type) {
    dispatch({ type: 'AJOUTER_ARTICLE', typeArticle: type })
  }

  function toggleSoin(articleId, soinId) {
    dispatch({ type: 'TOGGLE_SOIN', articleId, soinId })
  }

  function retirer(articleId) {
    dispatch({ type: 'RETIRER_ARTICLE', articleId })
  }

  const peutContinuer =
    commande.articles.length > 0 && commande.articles.every((a) => a.soins.length > 0)

  return (
    <section>
      <h1>{pressingCourant.nom}</h1>
      <p className="sous-titre">Ajoutez vos articles et choisissez les soins souhaités.</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {typesArticle.map((t) => (
          <button key={t} onClick={() => ajouterArticle(t)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.7rem' }}>
            + {t}
          </button>
        ))}
      </div>

      {commande.articles.length === 0 && (
        <p className="sous-titre">Aucun article ajouté pour l'instant.</p>
      )}

      {commande.articles.map((article) => (
        <div key={article.id} className="card">
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.85rem' }}>{article.type}</strong>
            <button className="discret" onClick={() => retirer(article.id)}>Retirer</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {pressingCourant.soins.map((soin) => {
              const actif = article.soins.includes(soin.id)
              return (
                <label
                  key={soin.id}
                  className="ligne-entre"
                  style={{
                    background: actif ? 'var(--bleu-clair)' : 'var(--gris-fond)',
                    color: actif ? 'var(--bleu)' : 'var(--texte)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <span>
                    <input
                      type="checkbox"
                      checked={actif}
                      onChange={() => toggleSoin(article.id, soin.id)}
                      style={{ marginRight: 8 }}
                    />
                    {soin.libelle}
                  </span>
                  <span>{soin.prix.toFixed(2)} EUR</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {commande.articles.length > 0 && (
        <div className="card">
          <div className="ligne-entre">
            <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
              Total ({commande.articles.length} article{commande.articles.length > 1 ? 's' : ''})
            </span>
            <strong>{commande.prixTotal.toFixed(2)} EUR</strong>
          </div>
          <div className="ligne-entre">
            <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
              Acompte à payer ({pressingCourant.acomptePourcent}%)
            </span>
            <strong>{commande.montantAcompte.toFixed(2)} EUR</strong>
          </div>
        </div>
      )}

      <button
        className="primaire"
        disabled={!peutContinuer}
        onClick={() => navigate('/commande/inventaire')}
        style={{ marginTop: '0.5rem' }}
      >
        Continuer vers la réception
      </button>
    </section>
  )
}
