import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, formaterJourCourt, formaterLabelCreneauCollecte } from '../api.js'

// Affiche le créneau de collecte à domicile choisi, avec la possibilité de le changer tant que
// la collecte n'a pas eu lieu (erreur de saisie, ou créneau devenu indisponible entre-temps).
// N'affiche rien si la commande n'est pas en mode domicile.
export default function CreneauCollecte() {
  const { state, dispatch, pressingCourant } = useApp()
  const commande = state.commande
  const [ouvert, setOuvert] = useState(false)
  const [creneaux, setCreneaux] = useState([])
  const [chargement, setChargement] = useState(false)
  const [jourSelectionne, setJourSelectionne] = useState(null)

  useEffect(() => {
    if (ouvert && pressingCourant) {
      setChargement(true)
      api.creneauxDomicile(pressingCourant.id)
        .then((tous) => {
          const disponibles = tous.filter((c) => c.disponible)
          setCreneaux(disponibles)
          setJourSelectionne(disponibles[0]?.date || null)
        })
        .finally(() => setChargement(false))
    }
  }, [ouvert, pressingCourant])

  if (!commande || commande.modeDepot !== 'domicile' || commande.statut !== 'creee') return null

  const creneauxParJour = creneaux.reduce((acc, c) => {
    acc[c.date] = acc[c.date] || []
    acc[c.date].push(c)
    return acc
  }, {})

  async function choisir(label) {
    await dispatch({ type: 'REVISER_CRENEAU_COLLECTE', creneauCollectePrevue: label })
    setOuvert(false)
  }

  return (
    <div className="card">
      <div className="ligne-entre">
        <span style={{ fontSize: '0.85rem' }}>
          <i className="ti ti-truck" aria-hidden="true" style={{ marginRight: 6 }}></i>
          {formaterLabelCreneauCollecte(commande.creneauCollectePrevue)}
        </span>
        <button className="discret" style={{ fontSize: '0.75rem' }} onClick={() => setOuvert((v) => !v)}>
          {ouvert ? 'Annuler' : 'Modifier'}
        </button>
      </div>

      {ouvert && (
        <div style={{ marginTop: 10 }}>
          {chargement && <p className="sous-titre">Chargement des créneaux...</p>}
          {!chargement && creneaux.length === 0 && (
            <p className="sous-titre">Aucun autre créneau disponible pour le moment.</p>
          )}
          {!chargement && creneaux.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
                {Object.keys(creneauxParJour).map((date) => (
                  <button
                    key={date}
                    onClick={() => setJourSelectionne(date)}
                    style={{
                      flex: '0 0 auto',
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: jourSelectionne === date ? 'none' : '1px solid var(--gris-bordure)',
                      background: jourSelectionne === date ? 'var(--bleu)' : 'var(--gris-carte)',
                      color: jourSelectionne === date ? 'white' : 'var(--texte)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {formaterJourCourt(date)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(creneauxParJour[jourSelectionne] || []).map((c) => (
                  <div
                    key={c.label}
                    className="card card-selectionnable"
                    style={{ flex: '1 1 auto', padding: '8px 12px', textAlign: 'center' }}
                    onClick={() => choisir(c.label)}
                  >
                    <div style={{ fontSize: '0.8rem' }}>{c.heure_debut}–{c.heure_fin}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
