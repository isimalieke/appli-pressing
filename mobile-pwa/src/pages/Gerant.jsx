import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, normaliserPressing, formaterCreneau, formaterCreneauDomicile, formaterJoursOuverts, formaterMontant } from '../api.js'
import SuiviCommandes from '../components/SuiviCommandes.jsx'

export default function Gerant() {
  const { pressings } = useApp()
  const [pressingId, setPressingId] = useState(null)
  const [pressing, setPressing] = useState(null)
  const [staff, setStaff] = useState([])
  const [creneauxDomicile, setCreneauxDomicile] = useState([])
  const [tauxTvaSaisi, setTauxTvaSaisi] = useState('')
  const [enregistrementTva, setEnregistrementTva] = useState(false)
  const [prixKiloSaisi, setPrixKiloSaisi] = useState('')
  const [enregistrementKilo, setEnregistrementKilo] = useState(false)
  const [deviseSaisie, setDeviseSaisie] = useState('')
  const [enregistrementDevise, setEnregistrementDevise] = useState(false)
  const [numeroWaveSaisi, setNumeroWaveSaisi] = useState('')
  const [numeroOmSaisi, setNumeroOmSaisi] = useState('')
  const [enregistrementMoyensPaiement, setEnregistrementMoyensPaiement] = useState(false)

  useEffect(() => {
    if (!pressingId && pressings.length) setPressingId(pressings[0].id)
  }, [pressings, pressingId])

  useEffect(() => {
    if (!pressingId) return
    api.detailPressing(pressingId).then((d) => {
      const p = normaliserPressing(d)
      setPressing(p)
      setTauxTvaSaisi(String(p.tauxTva))
      setPrixKiloSaisi(String(p.prixKilo))
      setDeviseSaisie(p.devise)
      setNumeroWaveSaisi(p.numeroMarchandWave)
      setNumeroOmSaisi(p.numeroMarchandOm)
    })
    api.listerStaff(pressingId).then(setStaff)
    api.creneauxDomicile(pressingId).then(setCreneauxDomicile)
  }, [pressingId])

  async function enregistrerTauxTva() {
    const taux = Number(tauxTvaSaisi)
    if (Number.isNaN(taux) || taux < 0 || taux > 100) return
    setEnregistrementTva(true)
    try {
      await api.definirTauxTva(pressingId, taux)
      setPressing((p) => ({ ...p, tauxTva: taux }))
    } finally {
      setEnregistrementTva(false)
    }
  }

  async function enregistrerPrixKilo() {
    const prix = Number(prixKiloSaisi)
    if (Number.isNaN(prix) || prix < 0) return
    setEnregistrementKilo(true)
    try {
      await api.definirPrixKilo(pressingId, prix)
      setPressing((p) => ({ ...p, prixKilo: prix }))
    } finally {
      setEnregistrementKilo(false)
    }
  }

  async function enregistrerDevise() {
    const devise = deviseSaisie.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(devise)) return
    setEnregistrementDevise(true)
    try {
      await api.definirDevise(pressingId, devise)
      setPressing((p) => ({ ...p, devise }))
    } finally {
      setEnregistrementDevise(false)
    }
  }

  async function enregistrerMoyensPaiement() {
    setEnregistrementMoyensPaiement(true)
    try {
      await api.definirMoyensPaiement(pressingId, numeroWaveSaisi.trim(), numeroOmSaisi.trim())
      setPressing((p) => ({ ...p, numeroMarchandWave: numeroWaveSaisi.trim(), numeroMarchandOm: numeroOmSaisi.trim() }))
    } finally {
      setEnregistrementMoyensPaiement(false)
    }
  }

  if (!pressing) {
    return (
      <section>
        <h1>Configuration du pressing</h1>
        <p className="sous-titre">Chargement...</p>
      </section>
    )
  }

  return (
    <section>
      <h1>Configuration du pressing</h1>
      <p className="sous-titre">Vue gérant — accès réservé au gérant ou au propriétaire dans la version finale.</p>

      <select value={pressingId} onChange={(e) => setPressingId(e.target.value)} style={{ marginBottom: '1rem' }}>
        {pressings.map((p) => (
          <option key={p.id} value={p.id}>{p.nom}</option>
        ))}
      </select>

      <SuiviCommandes pressingId={pressingId} />

      <h2>Devise</h2>
      <div className="card">
        <p className="sous-titre" style={{ marginTop: 0 }}>
          Code de la devise utilisée pour afficher tous les montants de ce pressing (ex. XOF, EUR, MAD).
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            maxLength={3}
            value={deviseSaisie}
            onChange={(e) => setDeviseSaisie(e.target.value.toUpperCase())}
            style={{ width: 80, textTransform: 'uppercase' }}
          />
          <button
            className="primaire"
            style={{ marginLeft: 'auto', padding: '6px 14px' }}
            disabled={enregistrementDevise || deviseSaisie === pressing.devise}
            onClick={enregistrerDevise}
          >
            {enregistrementDevise ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <h2>Catalogue de soins et tarifs</h2>
      <p className="sous-titre" style={{ marginTop: 0 }}>
        Ces soins forment le cycle standard proposé automatiquement au client pour chaque article
        déposé (le prix total est la somme des soins inclus). Le client garde la possibilité de
        décocher certains soins via "Traitement spécial" pour les cas particuliers (ex. repassage
        seul).
      </p>
      {pressing.soins.map((s) => {
        const tarif = pressing.tarifs.find((t) => t.soin_id === s.id)
        return (
          <div key={s.id} className="card ligne-entre">
            <span style={{ fontSize: '0.85rem' }}>{s.libelle}</span>
            <strong>{tarif ? formaterMontant(tarif.prix, pressing.devise) : '—'}</strong>
          </div>
        )
      })}

      <h2>Linge au kilo</h2>
      <div className="card">
        <p className="sous-titre" style={{ marginTop: 0 }}>
          Tarif TTC au kilo pour le linge déposé en vrac (facturation séparée du catalogue détaillé
          ci-dessus). 0 tant que non renseigné : le dépôt au kilo n'est alors pas proposé au client.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={prixKiloSaisi}
            onChange={(e) => setPrixKiloSaisi(e.target.value)}
            style={{ width: 90 }}
          />
          <span>/ kg</span>
          <button
            className="primaire"
            style={{ marginLeft: 'auto', padding: '6px 14px' }}
            disabled={enregistrementKilo || Number(prixKiloSaisi) === pressing.prixKilo}
            onClick={enregistrerPrixKilo}
          >
            {enregistrementKilo ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <h2>Horaires d'ouverture</h2>
      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Jours ouverts</span><span>{formaterJoursOuverts(pressing.joursOuverts)}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Horaires</span><span>{pressing.heureOuverture}–{pressing.heureFermeture}</span></div>
      </div>

      <h2>TVA</h2>
      <div className="card">
        <p className="sous-titre" style={{ marginTop: 0 }}>
          Taux applicable pour ce pressing (varie selon le pays — ex. 18% au Sénégal). Les prix du
          catalogue ci-dessus sont considérés TTC ; le HT est déduit automatiquement sur les factures.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={tauxTvaSaisi}
            onChange={(e) => setTauxTvaSaisi(e.target.value)}
            style={{ width: 80 }}
          />
          <span>%</span>
          <button
            className="primaire"
            style={{ marginLeft: 'auto', padding: '6px 14px' }}
            disabled={enregistrementTva || Number(tauxTvaSaisi) === pressing.tauxTva}
            onClick={enregistrerTauxTva}
          >
            {enregistrementTva ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <h2>Moyens de paiement</h2>
      <div className="card">
        <p className="sous-titre" style={{ marginTop: 0 }}>
          Numéros marchands Wave et Orange Money du pressing, utilisés pour générer un QR code au
          moment du paiement. Le paiement reste confirmé manuellement — pas de reconnaissance
          automatique du virement à ce stade.
        </p>
        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Numéro marchand Wave</label>
        <input
          type="text"
          placeholder="+221 77 000 00 00"
          value={numeroWaveSaisi}
          onChange={(e) => setNumeroWaveSaisi(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Numéro marchand Orange Money</label>
        <input
          type="text"
          placeholder="+221 77 000 00 00"
          value={numeroOmSaisi}
          onChange={(e) => setNumeroOmSaisi(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <button
          className="primaire"
          style={{ padding: '6px 14px' }}
          disabled={
            enregistrementMoyensPaiement ||
            (numeroWaveSaisi === pressing.numeroMarchandWave && numeroOmSaisi === pressing.numeroMarchandOm)
          }
          onClick={enregistrerMoyensPaiement}
        >
          {enregistrementMoyensPaiement ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <h2>Règles</h2>
      <div className="card">
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Acompte</span><span>{pressing.acomptePourcent}% du total</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai standard</span><span>{pressing.delaiStandardJoursOuvres} jour{pressing.delaiStandardJoursOuvres > 1 ? 's' : ''} ouvré{pressing.delaiStandardJoursOuvres > 1 ? 's' : ''}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Délai express</span><span>{pressing.delaiExpressJoursOuvres} jour{pressing.delaiExpressJoursOuvres > 1 ? 's' : ''} ouvré{pressing.delaiExpressJoursOuvres > 1 ? 's' : ''}</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Frais de garde</span><span>{formaterMontant(pressing.fraisGarde.montantParJour, pressing.devise)}/jour après {pressing.fraisGarde.delaiGlobalJours} j</span></div>
        <div className="ligne-entre"><span style={{ color: 'var(--texte-muted)' }}>Rayon de collecte</span><span>{pressing.rayonCollecteKm} km</span></div>
      </div>

      <h2>Créneaux de collecte à domicile (7 prochains jours, générés depuis le gabarit hebdo)</h2>
      {creneauxDomicile.length === 0 && <p className="sous-titre">Aucun gabarit de créneaux défini pour ce pressing.</p>}
      {creneauxDomicile.slice(0, 8).map((c) => (
        <div key={c.label} className="card ligne-entre">
          <span>{formaterCreneauDomicile(c)}</span>
          <span className="badge badge-neutre">{c.disponible ? `${c.places_restantes} place${c.places_restantes > 1 ? 's' : ''}` : 'Complet'}</span>
        </div>
      ))}

      <h2>Créneaux de retrait (révision manuelle)</h2>
      {pressing.creneauxRetrait.map((c) => (
        <div key={c.id} className="card">{formaterCreneau(c)}</div>
      ))}

      <h2>Employés</h2>
      {staff.length === 0 && <p className="sous-titre">Aucun employé enregistré pour ce pressing.</p>}
      {staff.map((e) => (
        <div key={e.id} className="card ligne-entre">
          <span style={{ fontSize: '0.85rem' }}>{e.prenom} {e.nom}</span>
          <span className="badge badge-neutre">{e.role === 'gerant' ? 'Gérant' : e.poste || 'Employé'}</span>
        </div>
      ))}

      <p className="sous-titre">
        Écran de démonstration : la devise, le taux de TVA et le tarif au kilo sont modifiables.
        La modification des soins, tarifs détaillés, créneaux et employés n'est pas encore
        branchée (lecture seule).
      </p>
    </section>
  )
}
