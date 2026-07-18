import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau } from '../api.js'
import SuiviCommandes from '../components/SuiviCommandes.jsx'

// Deux écrans distincts, accessibles par onglet : "Commande en cours" pour traiter le lot que
// l'employé a en main (validation étape par étape), et "Toutes les commandes" pour la vue
// d'ensemble du pressing (file d'attente, retraits/livraisons, recherche client au téléphone).
// Mélanger les deux dans un seul écran obligeait à faire défiler la fiche en cours pour retrouver
// la liste globale — les deux besoins sont désormais séparés clairement.
export default function Employe() {
  const { state, dispatch } = useApp()
  const commande = state.commande
  const [onglet, setOnglet] = useState('traitement')
  const [creneauChoisi, setCreneauChoisi] = useState(null)
  const [pressing, setPressing] = useState(null)
  // Mémorise l'article en cours de validation pour donner un retour visuel immédiat (bouton vert)
  // le temps de l'appel réseau, sinon rien ne signale que le clic a bien été pris en compte avant
  // que l'étape suivante ne s'affiche.
  const [validationEnCours, setValidationEnCours] = useState(null)

  const pressingId = commande?.pressingId || state.staffSession?.pressingId

  useEffect(() => {
    if (pressingId) {
      api.detailPressing(pressingId).then((d) => setPressing(normaliserPressing(d)))
    }
  }, [pressingId])

  // "staff_id" doit correspondre à une vraie ligne de pressing_staff (contrainte de clé
  // étrangère), sinon le serveur rejette l'appel. Tant que l'authentification employé n'est pas
  // branchée, on ne transmet aucun staff_id (NULL est accepté).
  async function valider(articleId, etape) {
    setValidationEnCours(articleId)
    try {
      await dispatch({ type: 'VALIDER_ETAPE', articleId, etapeIndex: etape.ordre })
    } finally {
      setValidationEnCours(null)
    }
  }

  function reviserCreneau() {
    if (!creneauChoisi) return
    dispatch({ type: 'REVISER_CRENEAU', creneau: formaterCreneau(creneauChoisi) })
  }

  function notifierClient() {
    dispatch({ type: 'NOTIFIER_CLIENT_PRET' })
  }

  const aUneCommande = commande && commande.numeroTicket
  // Une ligne par article du lot, toujours visible en même temps — pas d'écran unique qui saute
  // d'un article à l'autre. Chaque ligne montre l'étape en cours de CET article et son propre
  // bouton "Valider" : l'employé voit tout le lot d'un coup d'œil et agit directement sur la
  // bonne ligne, sans avoir à faire défiler pour retrouver où en est tel ou tel vêtement.
  const nbArticlesTermines = aUneCommande
    ? commande.articles.filter((a) => a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')).length
    : 0
  const commandeComplete = aUneCommande && commande.articles.length > 0 && nbArticlesTermines === commande.articles.length

  return (
    <section>
      <h1>Poste de travail</h1>

      <div className="onglets" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setOnglet('traitement')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 20,
            border: onglet === 'traitement' ? 'none' : '1px solid var(--gris-bordure)',
            background: onglet === 'traitement' ? 'var(--bleu)' : 'var(--gris-carte)',
            color: onglet === 'traitement' ? 'white' : 'var(--texte)',
            fontSize: '0.8rem',
          }}
        >
          Commande en cours
        </button>
        <button
          onClick={() => setOnglet('suivi')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 20,
            border: onglet === 'suivi' ? 'none' : '1px solid var(--gris-bordure)',
            background: onglet === 'suivi' ? 'var(--bleu)' : 'var(--gris-carte)',
            color: onglet === 'suivi' ? 'white' : 'var(--texte)',
            fontSize: '0.8rem',
          }}
        >
          Toutes les commandes
        </button>
      </div>

      {onglet === 'traitement' && (
        !aUneCommande ? (
          <p className="sous-titre">
            Aucune commande en cours de traitement sur ce poste. Ouvrez "Toutes les commandes" pour
            voir l'ensemble des commandes du pressing.
          </p>
        ) : (
          <>
            <h2>Commande #{commande.numeroTicket}</h2>
            <p className="sous-titre">
              {nbArticlesTermines} / {commande.articles.length} articles prêts
            </p>

            {commandeComplete && (
              <button className="primaire" style={{ marginBottom: 10 }} onClick={notifierClient}>
                Notifier le client — commande prête
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commande.articles.map((a) => {
                const etape = a.etapes.find((e) => e.statut === 'en_cours')
                const termine = a.etapes.length > 0 && a.etapes.every((e) => e.statut === 'validee')
                const enCoursDeValidation = validationEnCours === a.id
                return (
                  <div key={a.id} className="card">
                    <div className="ligne-entre">
                      <strong style={{ fontSize: '0.85rem' }}>{a.type} — {a.etiquette}</strong>
                      {termine && <span className="badge badge-succes">Prêt</span>}
                    </div>
                    {!termine && etape && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: '0.95rem' }}>{etape.libelle}</div>
                        <button
                          onClick={() => valider(a.id, etape)}
                          disabled={enCoursDeValidation}
                          aria-label={`Valider ${etape.libelle}`}
                          style={{
                            flexShrink: 0,
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            border: 'none',
                            background: enCoursDeValidation ? 'var(--vert, #2e7d32)' : 'var(--gris-carte-fonce, #1e293b)',
                            color: 'white',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <i className="ti ti-check" aria-hidden="true"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <h2>Réviser le créneau de retrait</h2>
            <p className="sous-titre">Réservé au gérant ou à un employé habilité.</p>
            {(pressing?.creneauxRetrait || []).map((c) => (
              <div
                key={c.id}
                className={`card card-selectionnable ${creneauChoisi?.id === c.id ? 'actif' : ''}`}
                onClick={() => setCreneauChoisi(c)}
              >
                {formaterCreneau(c)}
              </div>
            ))}
            <button className="primaire" disabled={!creneauChoisi} onClick={reviserCreneau}>
              Notifier le client du nouveau créneau
            </button>

            <h2>Notifications envoyées (WhatsApp)</h2>
            {state.notifications.length === 0 && <p className="sous-titre">Aucune notification pour l'instant.</p>}
            {state.notifications.map((n) => (
              <div key={n.id} className="notif-whatsapp">
                {n.texte}
              </div>
            ))}
          </>
        )
      )}

      {onglet === 'suivi' && <SuiviCommandes pressingId={pressingId} />}
    </section>
  )
}
