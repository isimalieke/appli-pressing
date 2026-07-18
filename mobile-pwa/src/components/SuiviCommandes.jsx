import { useEffect, useState } from 'react'
import { api, normaliserCommande } from '../api.js'

// Le client (et l'employé) n'ont pas besoin de distinguer "créée", "déposée", "en traitement" ou
// "créneau révisé" : tant que le linge n'est pas prêt, retiré ou annulé, un seul mot suffit —
// "En cours". Réserver un libellé précis aux seuls statuts qui appellent une action ou une
// information concrète (prête à remettre, retirée, non récupérée, annulée).
const LIBELLES_STATUT = {
  prete_retrait: 'Prête (à retirer)',
  prete_livraison: 'Prête (à livrer)',
  terminee: 'Terminée',
  non_recuperee: 'Non récupérée',
  annulee: 'Annulée',
}

function libelleStatut(statut) {
  return LIBELLES_STATUT[statut] || 'En cours'
}

function estPrete(statut) {
  return statut === 'prete_retrait' || statut === 'prete_livraison'
}

// États considérés comme "clos" : masqués par défaut (onglet "Toutes") pour ne montrer que ce qui
// est encore actif, mais restent consultables via l'onglet dédié "Terminées" — l'employé, le
// gérant et le propriétaire doivent pouvoir retrouver une commande déjà remise, pas seulement
// celles en cours. 'creee' reste masqué partout : le linge n'est pas encore physiquement arrivé au
// pressing, il n'y a donc rien à afficher.
const STATUTS_CLOS = ['terminee', 'annulee']
const STATUTS_MASQUES = ['creee']

// Filtres dédiés "À livrer" / "À retirer" plutôt qu'un seul onglet "Prêtes" mélangeant les deux :
// la personne qui prépare les tournées de livraison ne doit voir que sa liste, sans avoir à
// ignorer les commandes qui attendent un simple retrait au comptoir, et inversement pour la
// personne au comptoir. "Terminées" donne la vue complète sur l'historique récent.
const FILTRES = [
  { id: 'toutes', libelle: 'Toutes' },
  { id: 'en_cours', libelle: 'En traitement' },
  { id: 'a_livrer', libelle: 'À livrer' },
  { id: 'a_retirer', libelle: 'À retirer' },
  { id: 'terminees', libelle: 'Terminées' },
]

// Vue simple, partagée entre Employé, Gérant et Propriétaire : une ligne par commande en cours,
// avec le nom du client et le nombre d'articles prêts sur le total. Objectif : pouvoir répondre
// tout de suite à un client qui appelle pour savoir où en est son linge, sans ouvrir chaque
// commande une par une. Les commandes prêtes remontent en premier — c'est la file d'attente de
// remise au client — et chacune indique si elle part en livraison ou attend un retrait en
// magasin, pour ne pas préparer la mauvaise remise.
export default function SuiviCommandes({ pressingId }) {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(false)
  const [filtre, setFiltre] = useState('toutes')
  // Détail par article/étape chargé à la demande, uniquement pour la commande dépliée — évite de
  // récupérer le détail complet de toutes les commandes juste pour afficher la liste.
  const [commandeOuverte, setCommandeOuverte] = useState(null)
  const [detailOuvert, setDetailOuvert] = useState(null)
  const [chargementDetail, setChargementDetail] = useState(false)

  useEffect(() => {
    if (!pressingId) return
    setChargement(true)
    api.listerCommandesPressing(pressingId)
      .then(setCommandes)
      .finally(() => setChargement(false))
  }, [pressingId])

  async function remettreAuClient(commandeId) {
    await api.marquerRemise(commandeId)
    const fraiches = await api.listerCommandesPressing(pressingId)
    setCommandes(fraiches)
  }

  async function basculerDetail(commandeId) {
    if (commandeOuverte === commandeId) {
      setCommandeOuverte(null)
      setDetailOuvert(null)
      return
    }
    setCommandeOuverte(commandeId)
    setDetailOuvert(null)
    setChargementDetail(true)
    const d = await api.detailCommande(commandeId)
    setDetailOuvert(normaliserCommande(d))
    setChargementDetail(false)
  }

  const LIBELLES_ETAPE_STATUT = { validee: 'Fait', en_cours: 'En cours', a_faire: 'À faire' }

  const enCours = commandes
    .filter((c) => !STATUTS_MASQUES.includes(c.statut))
    .filter((c) => {
      if (filtre === 'terminees') return c.statut === 'terminee'
      if (filtre === 'a_livrer') return c.statut === 'prete_livraison'
      if (filtre === 'a_retirer') return c.statut === 'prete_retrait'
      if (filtre === 'en_cours') return !estPrete(c.statut)
      // "Toutes" : la vue active du jour, sans les commandes déjà terminées ou annulées — celles-ci
      // restent consultables via l'onglet "Terminées".
      return !STATUTS_CLOS.includes(c.statut)
    })
    // Les commandes prêtes remontent en tête : c'est la file d'attente de remise au client.
    .sort((a, b) => (estPrete(a.statut) === estPrete(b.statut)) ? 0 : estPrete(a.statut) ? -1 : 1)

  // Sur les filtres dédiés, le mode de remise est déjà donné par l'onglet choisi : le badge
  // livraison/magasin sur chaque carte devient redondant et n'est utile que sur "Toutes".
  const filtreDejaExplicite = filtre === 'a_livrer' || filtre === 'a_retirer'

  function carteCommande(c) {
    return (
      <div key={c.id} className="card" onClick={() => basculerDetail(c.id)} style={{ cursor: 'pointer' }}>
        <div className="ligne-entre">
          <strong style={{ fontSize: '0.85rem' }}>
            {c.client_prenom} {c.client_nom} — #{c.numero_ticket || '—'}
          </strong>
          <span className={`badge ${estPrete(c.statut) ? 'badge-succes' : 'badge-neutre'}`}>
            {libelleStatut(c.statut)}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--texte-muted)', marginTop: 4 }}>
          {c.client_telephone && <span>{c.client_telephone} · </span>}
          {c.nb_articles_prets} / {c.nb_articles} article{c.nb_articles > 1 ? 's' : ''} prêt{c.nb_articles_prets > 1 ? 's' : ''}
        </div>
        {estPrete(c.statut) && (
          <div
            style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
            onClick={(e) => e.stopPropagation()}
          >
            {!filtreDejaExplicite && (
              <span className="badge badge-neutre">
                <i
                  className={`ti ${c.mode_depot === 'domicile' ? 'ti-truck' : 'ti-building-store'}`}
                  aria-hidden="true"
                  style={{ marginRight: 4 }}
                ></i>
                {c.mode_depot === 'domicile' ? 'À livrer à domicile' : 'À retirer en magasin'}
              </span>
            )}
            <button
              onClick={() => remettreAuClient(c.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--vert, #2e7d32)',
                color: 'white',
                fontSize: '0.75rem',
              }}
            >
              Remis au client
            </button>
          </div>
        )}

        {commandeOuverte === c.id && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--gris-bordure)', paddingTop: 8 }}>
            {chargementDetail && <p className="sous-titre">Chargement du détail...</p>}
            {!chargementDetail && detailOuvert && detailOuvert.articles.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.type} — {a.etiquette}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {a.etapes.map((e) => (
                    <span
                      key={e.ordre}
                      className={`badge ${e.statut === 'validee' ? 'badge-succes' : 'badge-neutre'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {e.libelle} — {LIBELLES_ETAPE_STATUT[e.statut] || e.statut}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2>Suivi des commandes</h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {FILTRES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: filtre === f.id ? 'none' : '1px solid var(--gris-bordure)',
              background: filtre === f.id ? 'var(--bleu)' : 'var(--gris-carte)',
              color: filtre === f.id ? 'white' : 'var(--texte)',
              fontSize: '0.75rem',
            }}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {chargement && <p className="sous-titre">Chargement...</p>}
      {!chargement && enCours.length === 0 && (
        <p className="sous-titre">Aucune commande à afficher pour ce filtre.</p>
      )}

      {!chargement && enCours.map((c) => carteCommande(c))}
    </div>
  )
}
