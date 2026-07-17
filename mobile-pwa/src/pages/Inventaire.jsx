import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

function versDataUrl(fichier) {
  return new Promise((resolve) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resolve(lecteur.result)
    lecteur.readAsDataURL(fichier)
  })
}

export default function Inventaire() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const commande = state.commande

  if (!commande || commande.articles.length === 0) {
    return (
      <section>
        <p className="sous-titre">Aucun article à inventorier.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  async function ajouterPhoto(articleId, event) {
    const fichier = event.target.files?.[0]
    if (!fichier) return
    const dataUrl = await versDataUrl(fichier)
    dispatch({ type: 'AJOUTER_PHOTO', articleId, dataUrl })
  }

  function definirReserve(articleId, texte) {
    dispatch({ type: 'DEFINIR_RESERVE', articleId, texte })
  }

  function valider() {
    dispatch({ type: 'VALIDER_INVENTAIRE' })
    navigate('/commande/ticket')
  }

  return (
    <section>
      <h1>Fiche d'état à l'entrée</h1>
      <p className="sous-titre">Saisie par l'employé à la réception. Ce numéro de ticket sera imprimé et agrafé au vêtement — l'application n'est pas indispensable pour le retrait.</p>

      {!state.enLigne && (
        <div className="avertissement-hors-ligne">
          Pas de connexion : la fiche est enregistrée sur l'appareil et sera synchronisée dès le retour du réseau.
        </div>
      )}

      {commande.articles.map((article) => (
        <div key={article.id} className="card">
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.85rem' }}>{article.type}</strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--texte-muted)' }}>
              {article.soins.length} soin{article.soins.length > 1 ? 's' : ''}
            </span>
          </div>

          <textarea
            placeholder="Réserve écrite : tache déjà présente, bouton fragile, doublure abîmée... (laisser vide si bon état)"
            value={article.reserve}
            onChange={(e) => definirReserve(article.id, e.target.value)}
            rows={2}
            style={{ marginTop: 8 }}
          />

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {article.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`État à l'entrée ${i + 1}`} className="vignette-photo" />
            ))}
            <label className="bouton-photo">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => ajouterPhoto(article.id, e)}
              />
              <i className="ti ti-camera" aria-hidden="true"></i>
            </label>
          </div>
        </div>
      ))}

      <button className="primaire" onClick={valider} style={{ marginTop: '0.5rem' }}>
        Valider l'inventaire et générer le ticket
      </button>
    </section>
  )
}
