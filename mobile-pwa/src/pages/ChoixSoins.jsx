import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { typesArticle } from '../data/mock.js'
import { formaterMontant } from '../api.js'
import CreneauCollecte from '../components/CreneauCollecte.jsx'

export default function ChoixSoins() {
  const { state, dispatch, pressingCourant } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  // Chaque article reçoit le cycle standard (tous les soins du pressing) par défaut — c'est ce à
  // quoi s'attend la majorité des clients. Le détail des cases à cocher reste accessible mais
  // replié, pour les cas particuliers (ex. repassage seul sur du linge déjà propre).
  const [articlesOuverts, setArticlesOuverts] = useState({})

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

  function retirerArticle(articleId) {
    dispatch({ type: 'RETIRER_ARTICLE', articleId })
  }

  function toggleOuvert(articleId) {
    setArticlesOuverts((o) => ({ ...o, [articleId]: !o[articleId] }))
  }

  function prixArticle(article) {
    return article.soins.reduce((total, soinId) => {
      const tarif = pressingCourant.tarifs.find((t) => t.soin_id === soinId)
      return total + (tarif ? tarif.prix : 0)
    }, 0)
  }

  const peutContinuer =
    commande.articles.length > 0 && commande.articles.every((a) => a.soins.length > 0)

  return (
    <section>
      <h1>{pressingCourant.nom}</h1>
      <p className="sous-titre">Ajoutez vos articles — le traitement standard est inclus automatiquement.</p>

      <CreneauCollecte />

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

      {commande.articles.map((article) => {
        const ouvert = !!articlesOuverts[article.id]
        return (
          <div key={article.id} className="card">
            <div className="ligne-entre">
              <strong style={{ fontSize: '0.85rem' }}>{article.type}</strong>
              <button
                className="discret"
                style={{ color: 'var(--rouge)', padding: '2px 4px', fontSize: '0.75rem' }}
                onClick={() => retirerArticle(article.id)}
              >
                <i className="ti ti-trash" aria-hidden="true" style={{ marginRight: 4 }}></i>Retirer
              </button>
            </div>

            {!ouvert && (
              <div className="ligne-entre" style={{ marginTop: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--texte-muted)' }}>
                  Traitement standard inclus ({article.soins.length} soin{article.soins.length > 1 ? 's' : ''})
                </span>
                <strong>{formaterMontant(prixArticle(article), pressingCourant.devise)}</strong>
              </div>
            )}

            {ouvert && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pressingCourant.soins.map((soin) => {
                  const actif = article.soins.includes(soin.id)
                  const tarif = pressingCourant.tarifs.find((t) => t.soin_id === soin.id)
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
                      <span>{tarif ? formaterMontant(tarif.prix, pressingCourant.devise) : '—'}</span>
                    </label>
                  )
                })}
              </div>
            )}

            <button
              style={{
                fontSize: '0.75rem',
                marginTop: 10,
                padding: '6px 12px',
                border: '1px solid var(--or)',
                borderRadius: 20,
                background: 'transparent',
                color: 'var(--or)',
              }}
              onClick={() => toggleOuvert(article.id)}
            >
              {ouvert ? 'Revenir au traitement standard' : '⚙ Traitement spécial'}
            </button>
          </div>
        )
      })}

      {commande.articles.length > 0 && (
        <div className="card">
          <div className="ligne-entre">
            <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
              Total ({commande.articles.length} article{commande.articles.length > 1 ? 's' : ''})
            </span>
            <strong>{formaterMontant(commande.prixTotal, pressingCourant.devise)}</strong>
          </div>
          <div className="ligne-entre">
            <span style={{ color: 'var(--texte-muted)', fontSize: '0.85rem' }}>
              Acompte à payer ({pressingCourant.acomptePourcent}%)
            </span>
            <strong>{formaterMontant(commande.montantAcompte, pressingCourant.devise)}</strong>
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
