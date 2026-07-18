// API backend — Cloudflare Worker + D1
// Pas de framework externe : routeur minimal pour garder le déploiement simple (pas de build).
// Authentification volontairement absente à ce stade (étape 2 du plan) : tous les endpoints
// sont ouverts, à restreindre avant tout usage avec de vraies données clients.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function erreur(message, status = 400) {
  return json({ erreur: message }, status)
}

function uid(prefixe) {
  return `${prefixe}-${crypto.randomUUID()}`
}

// Ajoute `nbJours` jours ouvrés à `dateDepart`, en ne comptant que les jours listés dans
// `joursOuvertsStr` (ISO : 1=lundi ... 7=dimanche). Conserve l'heure de dateDepart.
// Le dépôt n'ayant lieu que pendant les horaires d'ouverture (contrainte imposée au dépôt),
// le décompte démarre toujours immédiatement, sans report au jour ouvré suivant.
function ajouterJoursOuvres(dateDepart, nbJours, joursOuvertsStr) {
  const joursOuverts = new Set(
    (joursOuvertsStr || '1,2,3,4,5,6').split(',').map((j) => Number(j.trim()))
  )
  const date = new Date(dateDepart)
  let restants = nbJours
  while (restants > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const jourIso = date.getUTCDay() === 0 ? 7 : date.getUTCDay() // JS: 0=dimanche -> converti en 7
    if (joursOuverts.has(jourIso)) restants -= 1
  }
  return date
}

async function lireJSON(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

// --- Pressings -------------------------------------------------------------

async function listerPressings(env) {
  const { results } = await env.DB.prepare('SELECT * FROM pressings WHERE statut = ?').bind('actif').all()
  return json(results)
}

async function detailPressing(env, id) {
  const pressing = await env.DB.prepare('SELECT * FROM pressings WHERE id = ?').bind(id).first()
  if (!pressing) return erreur('Pressing introuvable', 404)
  const { results: soins } = await env.DB.prepare('SELECT * FROM soins WHERE pressing_id = ?').bind(id).all()
  const { results: tarifs } = await env.DB.prepare('SELECT * FROM tarifs WHERE pressing_id = ?').bind(id).all()
  const { results: creneaux } = await env.DB.prepare('SELECT * FROM creneaux WHERE pressing_id = ?').bind(id).all()
  return json({ ...pressing, soins, tarifs, creneaux })
}

async function listerStaff(env, pressingId) {
  const { results } = await env.DB.prepare(
    `SELECT ps.id, ps.role, ps.poste, ps.actif, u.nom, u.prenom, u.email
     FROM pressing_staff ps JOIN users u ON u.id = ps.user_id
     WHERE ps.pressing_id = ?`
  ).bind(pressingId).all()
  return json(results)
}

// Filtre d'accès minimal aux vues internes (employé/gérant/propriétaire) pour un pilote sur
// appareil partagé au pressing : pas de mot de passe, pas de session serveur, juste un code PIN
// court par employé. À renforcer avant un déploiement multi-pressing public.
async function connexionStaff(env, pressingId, body) {
  const codePin = (body.code_pin || '').trim()
  if (!codePin) return erreur('Code PIN requis')
  const staff = await env.DB.prepare(
    `SELECT ps.id, ps.role, ps.poste, u.nom, u.prenom
     FROM pressing_staff ps JOIN users u ON u.id = ps.user_id
     WHERE ps.pressing_id = ? AND ps.code_pin = ? AND ps.actif = 1`
  ).bind(pressingId, codePin).first()
  if (!staff) return erreur('Code PIN incorrect', 401)
  return json(staff)
}

// Identifie un client par son numéro de téléphone (pas de mot de passe, cohérent avec un usage
// WhatsApp-first) : retrouve son compte s'il existe, le crée sinon.
async function identifierClient(env, body) {
  const telephone = (body.telephone || '').trim()
  if (!telephone) return erreur('Numéro de téléphone requis')

  let user = await env.DB.prepare('SELECT * FROM users WHERE telephone = ?').bind(telephone).first()
  if (!user) {
    const userId = uid('user')
    await env.DB.prepare(
      `INSERT INTO users (id, telephone, mot_de_passe_hash, nom, prenom, civilite) VALUES (?, ?, 'x', ?, ?, ?)`
    ).bind(userId, telephone, body.nom || null, body.prenom || null, body.civilite || null).run()
    user = { id: userId, nom: body.nom || null, prenom: body.prenom || null, civilite: body.civilite || null }
  }

  let client = await env.DB.prepare('SELECT * FROM clients WHERE user_id = ?').bind(user.id).first()
  if (!client) {
    const clientId = uid('client')
    await env.DB.prepare('INSERT INTO clients (id, user_id) VALUES (?, ?)').bind(clientId, user.id).run()
    client = { id: clientId }
  }

  return json({ id: client.id, nom: user.nom, prenom: user.prenom, civilite: user.civilite, telephone })
}

// --- Commandes ---------------------------------------------------------------

async function creerCommande(env, body) {
  const { client_id, pressing_id, mode_depot, creneau_collecte_prevue, express, mode_facturation } = body
  if (!client_id || !pressing_id || !mode_depot) return erreur('client_id, pressing_id et mode_depot sont requis')
  if (mode_depot === 'domicile' && !creneau_collecte_prevue) {
    return erreur('creneau_collecte_prevue requis pour une collecte à domicile')
  }
  const facturation = mode_facturation === 'kilo' ? 'kilo' : 'detail'
  const id = uid('cmd')
  await env.DB.prepare(
    `INSERT INTO commandes (id, client_id, pressing_id, mode_depot, mode_facturation, creneau_collecte_prevue, express, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'creee')`
  ).bind(id, client_id, pressing_id, mode_depot, facturation, creneau_collecte_prevue || null, express ? 1 : 0).run()
  return json({ id, mode_facturation: facturation }, 201)
}

// Circuit générique fixe pour le linge facturé au kilo (pas de configuration par soin, puisque
// le lot n'est pas rattaché à un soin précis) : dépôt/pesée → lavage → séchage → pliage → sortie.
const ETAPES_KILO = ['Dépôt et pesée', 'Lavage', 'Séchage', 'Pliage', 'Empaquetage']

// Enregistre le poids du linge en vrac et calcule le prix (poids × tarif/kg du pressing).
// Crée (une seule fois) l'article synthétique qui porte l'étiquette unique du lot et son circuit,
// pour réutiliser telles quelles les écrans/étapes déjà construits pour le suivi pièce par pièce.
async function enregistrerPoidsKilo(env, commandeId, body) {
  const poidsKg = Number(body.poids_kg)
  if (!poidsKg || poidsKg <= 0) return erreur('poids_kg doit être un nombre positif')

  const commande = await env.DB.prepare('SELECT * FROM commandes WHERE id = ?').bind(commandeId).first()
  if (!commande) return erreur('Commande introuvable', 404)
  if (commande.mode_facturation !== 'kilo') return erreur('Cette commande n\'est pas en mode facturation au kilo')

  const pressing = await env.DB.prepare('SELECT prix_kilo, acompte_pourcent, taux_tva FROM pressings WHERE id = ?').bind(commande.pressing_id).first()

  let article = await env.DB.prepare('SELECT * FROM articles_commande WHERE commande_id = ? LIMIT 1').bind(commandeId).first()
  if (!article) {
    const articleId = uid('art')
    await env.DB.prepare(
      'INSERT INTO articles_commande (id, commande_id, type_article, description) VALUES (?, ?, ?, ?)'
    ).bind(articleId, commandeId, 'Linge au kilo', null).run()
    article = { id: articleId }
  }

  const totalTTC = Math.round(poidsKg * (pressing.prix_kilo || 0) * 100) / 100
  const tauxTva = pressing.taux_tva || 0
  const montantHT = Math.round((totalTTC / (1 + tauxTva / 100)) * 100) / 100
  const montantTva = Math.round((totalTTC - montantHT) * 100) / 100
  const acompte = Math.round(totalTTC * (pressing.acompte_pourcent / 100) * 100) / 100

  await env.DB.prepare(
    `UPDATE commandes
     SET poids_kg = ?, prix_total = ?, montant_ht = ?, montant_tva = ?, taux_tva_applique = ?,
         montant_acompte = ?, montant_solde = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(poidsKg, totalTTC, montantHT, montantTva, tauxTva, acompte, Math.round((totalTTC - acompte) * 100) / 100, commandeId).run()

  return json({ ok: true, prix_total: totalTTC, article_id: article.id })
}

// Permet au propriétaire/gérant de définir le tarif au kilo (0 tant que non renseigné —
// le pressing n'accepte alors pas de dépôt en mode kilo côté client).
async function definirPrixKilo(env, pressingId, body) {
  const prix = Number(body.prix_kilo)
  if (Number.isNaN(prix) || prix < 0) return erreur('prix_kilo doit être un nombre positif ou nul')
  await env.DB.prepare('UPDATE pressings SET prix_kilo = ? WHERE id = ?').bind(prix, pressingId).run()
  return json({ ok: true, prix_kilo: prix })
}

// Génère les créneaux de collecte à domicile disponibles sur une fenêtre glissante de 7 jours,
// à partir du gabarit hebdomadaire du pressing (cf. table gabarit_creneaux_domicile).
// Un créneau n'est proposé que si le pressing est ouvert ce jour-là (jours_ouverts) et si sa
// capacité n'est pas déjà atteinte (comptage des commandes existantes sur ce créneau précis).
async function creneauxDomicileDisponibles(env, pressingId) {
  const pressing = await env.DB.prepare('SELECT * FROM pressings WHERE id = ?').bind(pressingId).first()
  if (!pressing) return erreur('Pressing introuvable', 404)

  const joursOuverts = new Set((pressing.jours_ouverts || '1,2,3,4,5,6').split(',').map((j) => Number(j.trim())))
  const { results: gabarit } = await env.DB.prepare(
    'SELECT * FROM gabarit_creneaux_domicile WHERE pressing_id = ? ORDER BY jour_semaine, heure_debut'
  ).bind(pressingId).all()

  const maintenant = new Date()
  const creneaux = []

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(maintenant)
    date.setUTCDate(date.getUTCDate() + offset)
    const jourIso = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
    if (!joursOuverts.has(jourIso)) continue
    const dateStr = date.toISOString().slice(0, 10)

    for (const bloc of gabarit.filter((g) => g.jour_semaine === jourIso)) {
      // Ne pas proposer un bloc déjà entamé/passé aujourd'hui.
      if (offset === 0) {
        const [hBloc, mBloc] = bloc.heure_debut.split(':').map(Number)
        const heureBlocUTC = new Date(date)
        heureBlocUTC.setUTCHours(hBloc, mBloc, 0, 0)
        if (heureBlocUTC <= maintenant) continue
      }
      const label = `${dateStr} ${bloc.heure_debut}-${bloc.heure_fin}`
      const { count } = await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM commandes WHERE pressing_id = ? AND creneau_collecte_prevue = ?'
      ).bind(pressingId, label).first()
      const placesRestantes = bloc.capacite_max - count
      creneaux.push({
        label,
        date: dateStr,
        heure_debut: bloc.heure_debut,
        heure_fin: bloc.heure_fin,
        capacite_max: bloc.capacite_max,
        places_restantes: placesRestantes,
        disponible: placesRestantes > 0,
      })
    }
  }

  return json(creneaux)
}

// Permet au client de changer son créneau de collecte à domicile après confirmation (erreur de
// saisie, ou créneau devenu indisponible entre-temps). Autorisé uniquement avant la collecte
// effective (commande encore au statut 'creee' — dès que le linge est physiquement récupéré et
// l'inventaire validé, le créneau de collecte n'a plus de sens à modifier).
async function reviserCreneauCollecte(env, commandeId, body) {
  const nouveauLabel = body.creneau_collecte_prevue
  if (!nouveauLabel) return erreur('creneau_collecte_prevue requis')

  const commande = await env.DB.prepare('SELECT * FROM commandes WHERE id = ?').bind(commandeId).first()
  if (!commande) return erreur('Commande introuvable', 404)
  if (commande.mode_depot !== 'domicile') return erreur('Cette commande n\'est pas en collecte à domicile')
  if (commande.statut !== 'creee') return erreur('Le créneau de collecte ne peut plus être modifié après la collecte')

  // Vérifie que le nouveau créneau correspond bien à un bloc du gabarit et qu'il a de la place.
  const [dateStr, plage] = nouveauLabel.split(' ')
  const [heureDebut] = (plage || '').split('-')
  const dateSlot = new Date(`${dateStr}T00:00:00Z`)
  const jourIso = dateSlot.getUTCDay() === 0 ? 7 : dateSlot.getUTCDay()
  const bloc = await env.DB.prepare(
    'SELECT * FROM gabarit_creneaux_domicile WHERE pressing_id = ? AND jour_semaine = ? AND heure_debut = ?'
  ).bind(commande.pressing_id, jourIso, heureDebut).first()
  if (!bloc) return erreur('Créneau invalide')

  const { count } = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM commandes WHERE pressing_id = ? AND creneau_collecte_prevue = ? AND id != ?'
  ).bind(commande.pressing_id, nouveauLabel, commandeId).first()
  if (count >= bloc.capacite_max) return erreur('Ce créneau est complet, choisissez-en un autre')

  await env.DB.prepare(
    `UPDATE commandes SET creneau_collecte_prevue = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(nouveauLabel, commandeId).run()
  return json({ ok: true, creneau_collecte_prevue: nouveauLabel })
}

async function ajouterArticle(env, commandeId, body) {
  const { type_article, description } = body
  if (!type_article) return erreur('type_article requis')
  const id = uid('art')
  await env.DB.prepare(
    'INSERT INTO articles_commande (id, commande_id, type_article, description) VALUES (?, ?, ?, ?)'
  ).bind(id, commandeId, type_article, description || null).run()
  return json({ id }, 201)
}

async function definirSoinsArticle(env, articleId, body) {
  const { soin_ids } = body
  if (!Array.isArray(soin_ids)) return erreur('soin_ids doit être un tableau')

  const article = await env.DB.prepare('SELECT commande_id FROM articles_commande WHERE id = ?').bind(articleId).first()
  if (!article) return erreur('Article introuvable', 404)
  const commande = await env.DB.prepare('SELECT pressing_id FROM commandes WHERE id = ?').bind(article.commande_id).first()

  await env.DB.prepare('DELETE FROM article_soins WHERE article_commande_id = ?').bind(articleId).run()

  let prixArticle = 0
  for (const soinId of soin_ids) {
    const tarif = await env.DB.prepare(
      'SELECT prix FROM tarifs WHERE pressing_id = ? AND soin_id = ? LIMIT 1'
    ).bind(commande.pressing_id, soinId).first()
    const prix = tarif ? tarif.prix : 0
    prixArticle += prix
    await env.DB.prepare(
      'INSERT INTO article_soins (id, article_commande_id, soin_id, prix_applique) VALUES (?, ?, ?, ?)'
    ).bind(uid('as'), articleId, soinId, prix).run()
  }

  await recalculerPrixCommande(env, article.commande_id)
  return json({ ok: true, prix_article: prixArticle })
}

// Les prix du catalogue (tarifs) sont saisis TTC par le gérant. `total` ci-dessous est donc le
// montant TTC de la commande ; le HT et la TVA sont déduits à partir du taux du pressing.
async function recalculerPrixCommande(env, commandeId) {
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(SUM(art_s.prix_applique), 0) AS total
     FROM article_soins art_s
     JOIN articles_commande a ON a.id = art_s.article_commande_id
     WHERE a.commande_id = ?`
  ).bind(commandeId).all()
  const totalTTC = results[0]?.total || 0
  const commande = await env.DB.prepare('SELECT pressing_id FROM commandes WHERE id = ?').bind(commandeId).first()
  const pressing = await env.DB.prepare('SELECT acompte_pourcent, taux_tva FROM pressings WHERE id = ?').bind(commande.pressing_id).first()

  const tauxTva = pressing.taux_tva || 0
  const montantHT = Math.round((totalTTC / (1 + tauxTva / 100)) * 100) / 100
  const montantTva = Math.round((totalTTC - montantHT) * 100) / 100
  const acompte = Math.round(totalTTC * (pressing.acompte_pourcent / 100) * 100) / 100

  await env.DB.prepare(
    `UPDATE commandes
     SET prix_total = ?, montant_ht = ?, montant_tva = ?, taux_tva_applique = ?,
         montant_acompte = ?, montant_solde = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(totalTTC, montantHT, montantTva, tauxTva, acompte, Math.round((totalTTC - acompte) * 100) / 100, commandeId).run()
}

// Permet au propriétaire/gérant de définir le taux de TVA applicable (varie selon le pays
// du pressing, ex. 18% au Sénégal ; 0% si non assujetti ou pas encore renseigné).
async function definirTauxTva(env, pressingId, body) {
  const taux = Number(body.taux_tva)
  if (Number.isNaN(taux) || taux < 0 || taux > 100) return erreur('taux_tva doit être un nombre entre 0 et 100')
  await env.DB.prepare('UPDATE pressings SET taux_tva = ? WHERE id = ?').bind(taux, pressingId).run()
  return json({ ok: true, taux_tva: taux })
}

// Permet au propriétaire/gérant de définir la devise d'affichage (code ISO 4217, ex. XOF, EUR),
// puisque le propriétaire peut avoir des pressings dans des pays différents.
async function definirDevise(env, pressingId, body) {
  const devise = String(body.devise || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(devise)) return erreur('devise doit être un code ISO 4217 à 3 lettres (ex. XOF, EUR)')
  await env.DB.prepare('UPDATE pressings SET devise = ? WHERE id = ?').bind(devise, pressingId).run()
  return json({ ok: true, devise })
}

// Numéros marchands Wave / Orange Money, utilisés pour générer un QR code de paiement côté
// client. Pas de vérification de format stricte (les numéros marchands ne suivent pas tous le
// même format selon le pays) — un champ vide désactive simplement le QR pour ce moyen.
async function definirMoyensPaiement(env, pressingId, body) {
  const numeroWave = body.numero_marchand_wave != null ? String(body.numero_marchand_wave).trim() : null
  const numeroOm = body.numero_marchand_om != null ? String(body.numero_marchand_om).trim() : null
  await env.DB.prepare(
    'UPDATE pressings SET numero_marchand_wave = ?, numero_marchand_om = ? WHERE id = ?'
  ).bind(numeroWave || null, numeroOm || null, pressingId).run()
  return json({ ok: true, numero_marchand_wave: numeroWave, numero_marchand_om: numeroOm })
}

// Suppression d'un article ajouté par erreur. Autorisée uniquement avant validation de
// l'inventaire (commande encore au statut 'creee') : au-delà, l'étiquette a pu être imprimée
// et agrafée au vêtement, donc la composition de la commande ne doit plus changer côté client.
async function supprimerArticle(env, articleId) {
  const article = await env.DB.prepare('SELECT commande_id FROM articles_commande WHERE id = ?').bind(articleId).first()
  if (!article) return erreur('Article introuvable', 404)
  const commande = await env.DB.prepare('SELECT statut FROM commandes WHERE id = ?').bind(article.commande_id).first()
  if (commande.statut !== 'creee') {
    return erreur('Impossible de supprimer un article après validation de l\'inventaire')
  }

  await env.DB.prepare('DELETE FROM article_soins WHERE article_commande_id = ?').bind(articleId).run()
  await env.DB.prepare('DELETE FROM article_photos WHERE article_commande_id = ?').bind(articleId).run()
  await env.DB.prepare('DELETE FROM articles_commande WHERE id = ?').bind(articleId).run()

  await recalculerPrixCommande(env, article.commande_id)
  return json({ ok: true })
}

async function definirReserve(env, articleId, body) {
  await env.DB.prepare('UPDATE articles_commande SET reserve = ? WHERE id = ?').bind(body.reserve || '', articleId).run()
  return json({ ok: true })
}

async function ajouterPhoto(env, articleId, body) {
  if (!body.url) return erreur('url requise')
  const id = uid('photo')
  await env.DB.prepare('INSERT INTO article_photos (id, article_commande_id, url) VALUES (?, ?, ?)').bind(id, articleId, body.url).run()
  return json({ id }, 201)
}

async function validerInventaire(env, commandeId) {
  const commande = await env.DB.prepare('SELECT * FROM commandes WHERE id = ?').bind(commandeId).first()
  if (!commande) return erreur('Commande introuvable', 404)

  const numeroTicket = commande.numero_ticket || `A${Math.floor(200 + Math.random() * 800)}`
  const { results: articles } = await env.DB.prepare('SELECT * FROM articles_commande WHERE commande_id = ?').bind(commandeId).all()
  const pressing = await env.DB.prepare('SELECT * FROM pressings WHERE id = ?').bind(commande.pressing_id).first()

  let index = 0
  for (const article of articles) {
    index += 1
    // Format "numéro/total" (ex. A312-1/3) : une étiquette isolée indique combien de pièces
    // la commande doit compter au total, ce qui facilite le contrôle au retrait.
    const etiquette = `${numeroTicket}-${index}/${articles.length}`
    await env.DB.prepare('UPDATE articles_commande SET etiquette = ? WHERE id = ?').bind(etiquette, article.id).run()

    await env.DB.prepare('DELETE FROM article_etapes WHERE article_commande_id = ?').bind(article.id).run()

    if (commande.mode_facturation === 'kilo') {
      // Circuit générique fixe (pas de soins à combiner pour un lot en vrac).
      for (let ordre = 0; ordre < ETAPES_KILO.length; ordre += 1) {
        await env.DB.prepare(
          'INSERT INTO article_etapes (id, article_commande_id, ordre, libelle, statut) VALUES (?, ?, ?, ?, ?)'
        ).bind(uid('etape'), article.id, ordre, ETAPES_KILO[ordre], ordre === 0 ? 'en_cours' : 'a_faire').run()
      }
      continue
    }

    // Fusionne les circuits associés aux soins de l'article (dédoublonnage par libellé, cf. docs/MODELE_DONNEES.md §5.1).
    // Le circuit d'un soin donné est déjà dans le bon ordre physique, mais fusionner plusieurs
    // circuits dans l'ordre de sélection des soins peut casser cet ordre (ex. "Empaquetage" du
    // premier soin choisi apparaissant avant "Détachage" d'un second soin). On re-trie donc
    // l'ensemble fusionné par grande phase du parcours (poste_associe), pour garder un enchaînement
    // physiquement cohérent quel que soit l'ordre de sélection des soins par le client.
    const { results: soinsArticle } = await env.DB.prepare(
      'SELECT soin_id FROM article_soins WHERE article_commande_id = ?'
    ).bind(article.id).all()

    const rangPhase = { reception: 0, lavage: 1, nettoyage: 1, repassage: 2, controle: 3 }
    const etapesFusionnees = []
    const etapesVues = new Set()
    for (const { soin_id } of soinsArticle) {
      const { results: circuits } = await env.DB.prepare(
        'SELECT circuit_id FROM soins_circuit WHERE soin_id = ?'
      ).bind(soin_id).all()
      for (const { circuit_id } of circuits) {
        const { results: etapes } = await env.DB.prepare(
          'SELECT libelle, poste_associe FROM etapes_circuit WHERE circuit_id = ? ORDER BY ordre'
        ).bind(circuit_id).all()
        for (const { libelle, poste_associe } of etapes) {
          if (etapesVues.has(libelle)) continue
          etapesVues.add(libelle)
          etapesFusionnees.push({ libelle, rang: rangPhase[poste_associe] ?? 4 })
        }
      }
    }
    etapesFusionnees.sort((a, b) => a.rang - b.rang)

    for (let ordre = 0; ordre < etapesFusionnees.length; ordre += 1) {
      await env.DB.prepare(
        'INSERT INTO article_etapes (id, article_commande_id, ordre, libelle, statut) VALUES (?, ?, ?, ?, ?)'
      ).bind(uid('etape'), article.id, ordre, etapesFusionnees[ordre].libelle, ordre === 0 ? 'en_cours' : 'a_faire').run()
    }
  }

  const nbJoursOuvres = commande.express
    ? (pressing.delai_express_jours_ouvres ?? 1)
    : (pressing.delai_standard_jours_ouvres ?? 2)
  const dateDepotObj = new Date()
  const dateDepot = dateDepotObj.toISOString()
  const dateRestitution = ajouterJoursOuvres(dateDepotObj, nbJoursOuvres, pressing.jours_ouverts).toISOString()

  await env.DB.prepare(
    `UPDATE commandes SET numero_ticket = ?, statut = 'deposee', date_depot_effectif = ?, date_restitution_prevue = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(numeroTicket, dateDepot, dateRestitution, commandeId).run()

  return json({ numero_ticket: numeroTicket, date_restitution_prevue: dateRestitution })
}

async function detailCommande(env, id) {
  const commande = await env.DB.prepare('SELECT * FROM commandes WHERE id = ?').bind(id).first()
  if (!commande) return erreur('Commande introuvable', 404)
  const { results: articles } = await env.DB.prepare('SELECT * FROM articles_commande WHERE commande_id = ?').bind(id).all()
  for (const article of articles) {
    const { results: etapes } = await env.DB.prepare(
      'SELECT * FROM article_etapes WHERE article_commande_id = ? ORDER BY ordre'
    ).bind(article.id).all()
    const { results: soins } = await env.DB.prepare(
      'SELECT * FROM article_soins WHERE article_commande_id = ?'
    ).bind(article.id).all()
    const { results: photos } = await env.DB.prepare(
      'SELECT * FROM article_photos WHERE article_commande_id = ?'
    ).bind(article.id).all()
    article.etapes = etapes
    article.soins = soins
    article.photos = photos
  }
  const { results: paiements } = await env.DB.prepare('SELECT * FROM paiements WHERE commande_id = ?').bind(id).all()
  return json({ ...commande, articles, paiements })
}

async function listerCommandesClient(env, clientId) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM commandes WHERE client_id = ? ORDER BY created_at DESC'
  ).bind(clientId).all()
  return json(results)
}

// Vue de suivi simple pour le personnel (employé, gérant, propriétaire) : une ligne par commande
// en cours, avec le nom du client et le nombre d'articles prêts sur le total — de quoi répondre
// tout de suite à un client qui appelle pour savoir où en est son linge, sans avoir à ouvrir
// chaque commande une par une.
async function listerCommandesPressing(env, pressingId) {
  const { results } = await env.DB.prepare(
    `SELECT
       c.*,
       u.nom AS client_nom, u.prenom AS client_prenom, u.telephone AS client_telephone,
       (SELECT COUNT(*) FROM articles_commande WHERE commande_id = c.id) AS nb_articles,
       (SELECT COUNT(*) FROM articles_commande a
          WHERE a.commande_id = c.id
            AND NOT EXISTS (
              SELECT 1 FROM article_etapes e
              WHERE e.article_commande_id = a.id AND e.statut != 'validee'
            )
            AND EXISTS (SELECT 1 FROM article_etapes e WHERE e.article_commande_id = a.id)
       ) AS nb_articles_prets
     FROM commandes c
     JOIN clients cl ON cl.id = c.client_id
     JOIN users u ON u.id = cl.user_id
     WHERE c.pressing_id = ?
     ORDER BY c.created_at DESC`
  ).bind(pressingId).all()
  return json(results)
}

async function validerEtape(env, articleId, ordre, body) {
  const etape = await env.DB.prepare(
    'SELECT * FROM article_etapes WHERE article_commande_id = ? AND ordre = ?'
  ).bind(articleId, ordre).first()
  if (!etape) return erreur('Étape introuvable', 404)

  await env.DB.prepare(
    `UPDATE article_etapes SET statut = 'validee', valide_par = ?, horodatage = datetime('now') WHERE id = ?`
  ).bind(body.staff_id || null, etape.id).run()

  await env.DB.prepare(
    `UPDATE article_etapes SET statut = 'en_cours' WHERE article_commande_id = ? AND ordre = ? AND statut = 'a_faire'`
  ).bind(articleId, ordre + 1).run()

  // Recalcule le statut agrégé de la commande (§5.2 du cahier des charges)
  const article = await env.DB.prepare('SELECT commande_id FROM articles_commande WHERE id = ?').bind(articleId).first()
  const { results: tousArticles } = await env.DB.prepare(
    'SELECT id FROM articles_commande WHERE commande_id = ?'
  ).bind(article.commande_id).all()

  let toutesTerminees = true
  let auMoinsUneValidee = false
  for (const a of tousArticles) {
    const { results: etapes } = await env.DB.prepare('SELECT statut FROM article_etapes WHERE article_commande_id = ?').bind(a.id).all()
    if (etapes.some((e) => e.statut === 'validee')) auMoinsUneValidee = true
    if (!etapes.length || etapes.some((e) => e.statut !== 'validee')) toutesTerminees = false
  }
  const nouveauStatut = toutesTerminees ? 'prete' : auMoinsUneValidee ? 'en_traitement' : 'deposee'
  await env.DB.prepare(`UPDATE commandes SET statut = ?, updated_at = datetime('now') WHERE id = ?`).bind(nouveauStatut, article.commande_id).run()

  return json({ ok: true, statut_commande: nouveauStatut })
}

async function noterCommande(env, commandeId, body) {
  const note = Number(body.note)
  if (!note || note < 1 || note > 5) return erreur('note doit être un entier entre 1 et 5')
  await env.DB.prepare(`UPDATE commandes SET evaluation = ?, updated_at = datetime('now') WHERE id = ?`).bind(note, commandeId).run()
  return json({ ok: true })
}

async function reviserCreneau(env, commandeId, body) {
  await env.DB.prepare(
    `UPDATE commandes SET creneau_retrait_revise = ?, statut = 'revisee', updated_at = datetime('now') WHERE id = ?`
  ).bind(body.creneau || '', commandeId).run()
  return json({ ok: true })
}

async function enregistrerPaiement(env, commandeId, body) {
  const { type, montant, moyen } = body
  if (!type || montant == null || !moyen) return erreur('type, montant et moyen sont requis')
  const id = uid('pay')
  await env.DB.prepare(
    'INSERT INTO paiements (id, commande_id, type, montant, moyen, reference_prestataire) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, commandeId, type, montant, moyen, body.reference || null).run()

  if (type === 'solde') {
    await env.DB.prepare(`UPDATE commandes SET statut = 'retiree', updated_at = datetime('now') WHERE id = ?`).bind(commandeId).run()
  }
  return json({ id }, 201)
}

// --- Routeur -----------------------------------------------------------------

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)
    const segments = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean)
    const method = request.method

    try {
      // Important : chaque route est "await"-ée explicitement. Sans ça, une exception levée
      // dans un handler async produit une promesse rejetée que "return handler(...)" propage
      // sans passer par ce catch — Cloudflare renvoie alors une erreur brute sans en-têtes CORS,
      // que le navigateur bloque avant même d'afficher le vrai message d'erreur.
      if (segments[0] === 'pressings' && segments.length === 1 && method === 'GET') return await listerPressings(env)
      if (segments[0] === 'pressings' && segments.length === 2 && method === 'GET') return await detailPressing(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'staff' && method === 'GET') return await listerStaff(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'creneaux-domicile' && method === 'GET') return await creneauxDomicileDisponibles(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'taux-tva' && method === 'PATCH') return await definirTauxTva(env, segments[1], await lireJSON(request))
      if (segments[0] === 'pressings' && segments[2] === 'prix-kilo' && method === 'PATCH') return await definirPrixKilo(env, segments[1], await lireJSON(request))
      if (segments[0] === 'pressings' && segments[2] === 'devise' && method === 'PATCH') return await definirDevise(env, segments[1], await lireJSON(request))
      if (segments[0] === 'pressings' && segments[2] === 'moyens-paiement' && method === 'PATCH') return await definirMoyensPaiement(env, segments[1], await lireJSON(request))
      if (segments[0] === 'pressings' && segments[2] === 'commandes' && method === 'GET') return await listerCommandesPressing(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'connexion-staff' && method === 'POST') return await connexionStaff(env, segments[1], await lireJSON(request))

      if (segments[0] === 'clients' && segments[1] === 'identification' && method === 'POST') return await identifierClient(env, await lireJSON(request))
      if (segments[0] === 'clients' && segments[2] === 'commandes' && method === 'GET') return await listerCommandesClient(env, segments[1])

      if (segments[0] === 'commandes' && segments.length === 1 && method === 'POST') return await creerCommande(env, await lireJSON(request))
      if (segments[0] === 'commandes' && segments.length === 2 && method === 'GET') return await detailCommande(env, segments[1])
      if (segments[0] === 'commandes' && segments[2] === 'articles' && method === 'POST') return await ajouterArticle(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'poids' && method === 'PATCH') return await enregistrerPoidsKilo(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'creneau-collecte' && method === 'PATCH') return await reviserCreneauCollecte(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'valider-inventaire' && method === 'POST') return await validerInventaire(env, segments[1])
      if (segments[0] === 'commandes' && segments[2] === 'creneau-retrait' && method === 'PATCH') return await reviserCreneau(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'evaluation' && method === 'PATCH') return await noterCommande(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'paiements' && method === 'POST') return await enregistrerPaiement(env, segments[1], await lireJSON(request))

      if (segments[0] === 'articles' && segments.length === 2 && method === 'DELETE') return await supprimerArticle(env, segments[1])
      if (segments[0] === 'articles' && segments[2] === 'soins' && method === 'PUT') return await definirSoinsArticle(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'reserve' && method === 'PATCH') return await definirReserve(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'photos' && method === 'POST') return await ajouterPhoto(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'etapes' && segments[4] === 'valider' && method === 'POST') {
        return await validerEtape(env, segments[1], Number(segments[3]), await lireJSON(request))
      }

      return erreur('Route inconnue', 404)
    } catch (e) {
      return erreur(`Erreur serveur : ${e.message}`, 500)
    }
  },
}
