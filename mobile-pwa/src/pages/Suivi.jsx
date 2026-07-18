import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { formaterMontant } from '../api.js'

// Le mode de remise (comptoir ou domicile) est connu dès la création de la commande : la timeline
// affiche donc directement le bon jalon "prête" ("prête pour retrait" ou "prête, en attente de
// collecte pour livraison"). Le dernier jalon reste un seul statut 'terminee' côté base de
// données (déclenché par "Remis au client", quel que soit le canal), mais garde ici un libellé
// adapté au mode de remise pour rester clair côté client.
function jalons(modeDepot) {
  const livraison = modeDepot === 'domicile'
  return [
    { cle: 'deposee', libelle: 'Déposée et inventoriée' },
    { cle: 'en_traitement', libelle: 'En traitement' },
    {
      cle: livraison ? 'prete_livraison' : 'prete_retrait',
      libelle: livraison ? 'Prête, en attente de collecte pour livraison' : 'Prête pour retrait',
    },
    { cle: 'terminee', libelle: livraison ? 'Livrée' : 'Retirée' },
  ]
}

function indexStatut(statut, listeJalons) {
  if (statut === 'revisee') return 2 // traité comme "prête" avec créneau révisé
  return listeJalons.findIndex((j) => j.cle === statut)
}

export default function Suivi() {
  const { state, pressingCourant } = useApp()
  const navigate = useNavigate()
  const commande = state.commande
  const devise = pressingCourant?.devise
  const [detailOuvert, setDetailOuvert] = useState(false)

  // La remise (comptoir ou domicile) est désormais marquée par le pressing indépendamment du
  // paiement (bouton "Remis au client") : si le client revient sur cet écran après coup, on
  // l'emmène directement vers l'écran de fin de commande plutôt que de laisser la timeline
  // affichée telle quelle.
  useEffect(() => {
    if (commande?.statut === 'terminee') {
      navigate('/commande/retire')
    }
  }, [commande?.statut])

  if (!commande || !commande.numeroTicket) {
    return (
      <section>
        <p className="sous-titre">Aucune commande en cours.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const JALONS = jalons(commande.modeDepot)
  const idx = indexStatut(commande.statut, JALONS)

  return (
    <section>
      <h1>Commande #{commande.numeroTicket}</h1>
      <p className="sous-titre">
        {commande.creneauRetraitRevise
          ? `Créneau révisé par le pressing : ${commande.creneauRetraitRevise}`
          : commande.dateRestitutionPrevue
          ? `Prêt prévu le ${new Date(commande.dateRestitutionPrevue).toLocaleString('fr-FR')}`
          : ''}
      </p>

      {JALONS.map((jalon, i) => (
        <div key={jalon.cle} className="timeline-item">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={`timeline-point ${i < idx ? 'validee' : i === idx ? 'en-cours' : ''}`}>
              {i < idx && <i className="ti ti-check" style={{ fontSize: 11 }} aria-hidden="true"></i>}
            </div>
            {i < JALONS.length - 1 && <div className="timeline-ligne" />}
          </div>
          <div style={{ paddingBottom: 18, fontSize: '0.85rem', fontWeight: i === idx ? 500 : 400 }}>
            {jalon.libelle}
          </div>
        </div>
      ))}

      <button className="discret" onClick={() => setDetailOuvert((v) => !v)} style={{ padding: 0 }}>
        {detailOuvert ? 'Masquer' : 'Voir'} le détail par vêtement
      </button>

      {detailOuvert && commande.articles.map((a) => (
        <div key={a.id} className="card" style={{ marginTop: 8 }}>
          <div className="ligne-entre">
            <strong style={{ fontSize: '0.8rem' }}>{a.type} — {a.etiquette}</strong>
          </div>
          {a.etapes.length === 0 ? (
            <p className="sous-titre" style={{ margin: '4px 0 0' }}>En attente de dépôt effectif.</p>
          ) : (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.75rem' }}>
              {a.etapes.map((e) => (
                <li key={e.libelle} style={{ color: e.statut === 'validee' ? 'var(--vert)' : 'var(--texte-muted)' }}>
                  {e.libelle}{e.statut === 'validee' ? ' — validée' : e.statut === 'en_cours' ? ' — en cours' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {(commande.statut === 'prete_retrait' || commande.statut === 'prete_livraison') && commande.montantSolde > 0 && !commande.paiements.some((p) => p.type === 'solde') && (
        <button className="primaire" style={{ marginTop: '1rem' }} onClick={() => navigate('/paiement/solde')}>
          Payer le solde ({formaterMontant(commande.montantSolde, devise)})
        </button>
      )}
    </section>
  )
}
