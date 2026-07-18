import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { api, formaterJourCourt, formaterJoursOuverts } from '../api.js'

export default function NouvelleCommande() {
  const { pressingCourant, dispatch } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('comptoir')
  const [modeFacturation, setModeFacturation] = useState('detail')
  const [creneauLabel, setCreneauLabel] = useState(null)
  const [creneauxDisponibles, setCreneauxDisponibles] = useState([])
  const [chargementCreneaux, setChargementCreneaux] = useState(false)
  const [jourSelectionne, setJourSelectionne] = useState(null)

  useEffect(() => {
    if (mode === 'domicile' && pressingCourant) {
      setChargementCreneaux(true)
      api.creneauxDomicile(pressingCourant.id)
        .then((creneaux) => {
          // On ne propose au client que les créneaux réellement disponibles — le nombre de
          // places restantes n'a pas d'intérêt pour lui, seulement le fait de pouvoir réserver.
          const disponibles = creneaux.filter((c) => c.disponible)
          setCreneauxDisponibles(disponibles)
          setJourSelectionne(disponibles[0]?.date || null)
        })
        .finally(() => setChargementCreneaux(false))
    }
  }, [mode, pressingCourant])

  if (!pressingCourant) {
    return (
      <section>
        <p className="sous-titre">Choisissez d'abord un pressing depuis l'accueil.</p>
        <button className="primaire" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </section>
    )
  }

  const peutConfirmer = mode === 'comptoir' || !!creneauLabel

  // Regroupe les créneaux par jour pour l'affichage (7 jours glissants).
  const creneauxParJour = creneauxDisponibles.reduce((acc, c) => {
    acc[c.date] = acc[c.date] || []
    acc[c.date].push(c)
    return acc
  }, {})

  async function confirmer() {
    if (!peutConfirmer) return
    await dispatch({
      type: 'DEMARRER_COMMANDE',
      pressingId: pressingCourant.id,
      modeDepot: mode,
      modeFacturation,
      creneauCollectePrevue: mode === 'domicile' ? creneauLabel : null,
    })
    navigate(modeFacturation === 'kilo' ? '/commande/kilo' : '/commande/soins')
  }

  return (
    <section>
      <h1>Comment déposer votre linge ?</h1>
      <p className="sous-titre">{pressingCourant.nom}</p>

      <div
        className={`card card-selectionnable ${mode === 'comptoir' ? 'actif' : ''}`}
        onClick={() => setMode('comptoir')}
      >
        <div className="ligne-entre">
          <span><i className="ti ti-building-store" aria-hidden="true" style={{ marginRight: 6 }}></i>Déposer au pressing</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
          {pressingCourant.adresse}
        </div>
      </div>

      <div
        className={`card card-selectionnable ${mode === 'domicile' ? 'actif' : ''}`}
        onClick={() => setMode('domicile')}
      >
        <div className="ligne-entre">
          <span><i className="ti ti-truck" aria-hidden="true" style={{ marginRight: 6 }}></i>Faire enlever à domicile</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
          Rayon de collecte : {pressingCourant.rayonCollecteKm} km autour du pressing
        </div>
      </div>

      {pressingCourant.prixKilo > 0 && (
        <>
          <h2>Facturation</h2>
          <div
            className={`card card-selectionnable ${modeFacturation === 'detail' ? 'actif' : ''}`}
            onClick={() => setModeFacturation('detail')}
          >
            <div className="ligne-entre">
              <span><i className="ti ti-shirt" aria-hidden="true" style={{ marginRight: 6 }}></i>Au détail, pièce par pièce</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
              Chaque vêtement est étiqueté et suivi individuellement.
            </div>
          </div>
          <div
            className={`card card-selectionnable ${modeFacturation === 'kilo' ? 'actif' : ''}`}
            onClick={() => setModeFacturation('kilo')}
          >
            <div className="ligne-entre">
              <span><i className="ti ti-scale" aria-hidden="true" style={{ marginRight: 6 }}></i>Au kilo, en vrac</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--texte-muted)', marginTop: 4 }}>
              Linge pesé et facturé en un seul lot — plus rapide pour un gros volume.
            </div>
          </div>
        </>
      )}

      {mode === 'comptoir' ? (
        <div className="card">
          <div className="ligne-entre">
            <span><i className="ti ti-clock" aria-hidden="true" style={{ marginRight: 6 }}></i>Horaires d'ouverture</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--texte-muted)', marginTop: 4 }}>
            {formaterJoursOuverts(pressingCourant.joursOuverts)}, {pressingCourant.heureOuverture}–{pressingCourant.heureFermeture}
          </div>
          <p className="sous-titre" style={{ marginTop: 8 }}>
            Venez déposer votre linge à tout moment pendant ces horaires — aucun créneau à réserver.
          </p>
        </div>
      ) : (
        <>
          <h2>Créneau de collecte</h2>
          {chargementCreneaux && <p className="sous-titre">Chargement des créneaux...</p>}
          {!chargementCreneaux && creneauxDisponibles.length === 0 && (
            <p className="sous-titre">Aucun créneau de collecte à domicile n'est disponible pour le moment.</p>
          )}

          {!chargementCreneaux && creneauxDisponibles.length > 0 && (
            <>
              {/* Sélecteur de jour façon calendrier : une bande horizontale de jours, puis les
                  créneaux horaires du seul jour sélectionné (moins de défilement, plus lisible). */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
                {Object.keys(creneauxParJour).map((date) => (
                  <button
                    key={date}
                    onClick={() => setJourSelectionne(date)}
                    style={{
                      flex: '0 0 auto',
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: jourSelectionne === date ? 'none' : '1px solid var(--gris-bordure)',
                      background: jourSelectionne === date ? 'var(--bleu)' : 'var(--gris-carte)',
                      color: jourSelectionne === date ? 'white' : 'var(--texte)',
                      fontSize: '0.8rem',
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
                    className={`card card-selectionnable ${creneauLabel === c.label ? 'actif' : ''}`}
                    style={{ flex: '1 1 auto', padding: '10px 14px', textAlign: 'center' }}
                    onClick={() => setCreneauLabel(c.label)}
                  >
                    <div style={{ fontSize: '0.85rem' }}>{c.heure_debut}–{c.heure_fin}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <button className="primaire" disabled={!peutConfirmer} onClick={confirmer} style={{ marginTop: '1rem' }}>
        {mode === 'comptoir' ? 'Commencer le dépôt' : 'Confirmer le créneau de collecte'}
      </button>
    </section>
  )
}
