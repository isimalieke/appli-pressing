// API backend — Cloudflare Worker + D1
// Pas de framework externe : routeur minimal pour garder le déploiement simple (pas de build).
// Authentification volontairement absente à ce stade (étape 2 du plan) : tous les endpoints
// sont ouverts, à restreindre avant tout usage avec de vraies données clients.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
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

// --- Commandes ---------------------------------------------------------------

async function creerCommande(env, body) {
  const { client_id, pressing_id, mode_depot, creneau_depot_id, express } = body
  if (!client_id || !pressing_id || !mode_depot) return erreur('client_id, pressing_id et mode_depot sont requis')
  const id = uid('cmd')
  await env.DB.prepare(
    `INSERT INTO commandes (id, client_id, pressing_id, mode_depot, creneau_depot_id, express, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'creee')`
  ).bind(id, client_id, pressing_id, mode_depot, creneau_depot_id || null, express ? 1 : 0).run()
  return json({ id }, 201)
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

async function recalculerPrixCommande(env, commandeId) {
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(SUM(art_s.prix_applique), 0) AS total
     FROM article_soins art_s
     JOIN articles_commande a ON a.id = art_s.article_commande_id
     WHERE a.commande_id = ?`
  ).bind(commandeId).all()
  const total = results[0]?.total || 0
  const commande = await env.DB.prepare('SELECT pressing_id FROM commandes WHERE id = ?').bind(commandeId).first()
  const pressing = await env.DB.prepare('SELECT acompte_pourcent FROM pressings WHERE id = ?').bind(commande.pressing_id).first()
  const acompte = Math.round(total * (pressing.acompte_pourcent / 100) * 100) / 100
  await env.DB.prepare(
    'UPDATE commandes SET prix_total = ?, montant_acompte = ?, montant_solde = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(total, acompte, Math.round((total - acompte) * 100) / 100, commandeId).run()
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
    const etiquette = `${numeroTicket}-${index}`
    await env.DB.prepare('UPDATE articles_commande SET etiquette = ? WHERE id = ?').bind(etiquette, article.id).run()

    // Fusionne les circuits associés aux soins de l'article (dédoublonnage par libellé, cf. docs/MODELE_DONNEES.md §5.1)
    const { results: soinsArticle } = await env.DB.prepare(
      'SELECT soin_id FROM article_soins WHERE article_commande_id = ?'
    ).bind(article.id).all()

    const etapesVues = new Set()
    let ordre = 0
    await env.DB.prepare('DELETE FROM article_etapes WHERE article_commande_id = ?').bind(article.id).run()
    for (const { soin_id } of soinsArticle) {
      const { results: circuits } = await env.DB.prepare(
        'SELECT circuit_id FROM soins_circuit WHERE soin_id = ?'
      ).bind(soin_id).all()
      for (const { circuit_id } of circuits) {
        const { results: etapes } = await env.DB.prepare(
          'SELECT libelle FROM etapes_circuit WHERE circuit_id = ? ORDER BY ordre'
        ).bind(circuit_id).all()
        for (const { libelle } of etapes) {
          if (etapesVues.has(libelle)) continue
          etapesVues.add(libelle)
          await env.DB.prepare(
            'INSERT INTO article_etapes (id, article_commande_id, ordre, libelle, statut) VALUES (?, ?, ?, ?, ?)'
          ).bind(uid('etape'), article.id, ordre, libelle, ordre === 0 ? 'en_cours' : 'a_faire').run()
          ordre += 1
        }
      }
    }
  }

  const delaiH = commande.express ? pressing.delai_express_h : pressing.delai_standard_h
  const dateDepot = new Date().toISOString()
  const dateRestitution = new Date(Date.now() + delaiH * 3600 * 1000).toISOString()

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

async function listerCommandesPressing(env, pressingId) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM commandes WHERE pressing_id = ? ORDER BY created_at DESC'
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
      if (segments[0] === 'pressings' && segments.length === 1 && method === 'GET') return listerPressings(env)
      if (segments[0] === 'pressings' && segments.length === 2 && method === 'GET') return detailPressing(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'staff' && method === 'GET') return listerStaff(env, segments[1])
      if (segments[0] === 'pressings' && segments[2] === 'commandes' && method === 'GET') return listerCommandesPressing(env, segments[1])

      if (segments[0] === 'clients' && segments[2] === 'commandes' && method === 'GET') return listerCommandesClient(env, segments[1])

      if (segments[0] === 'commandes' && segments.length === 1 && method === 'POST') return creerCommande(env, await lireJSON(request))
      if (segments[0] === 'commandes' && segments.length === 2 && method === 'GET') return detailCommande(env, segments[1])
      if (segments[0] === 'commandes' && segments[2] === 'articles' && method === 'POST') return ajouterArticle(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'valider-inventaire' && method === 'POST') return validerInventaire(env, segments[1])
      if (segments[0] === 'commandes' && segments[2] === 'creneau-retrait' && method === 'PATCH') return reviserCreneau(env, segments[1], await lireJSON(request))
      if (segments[0] === 'commandes' && segments[2] === 'paiements' && method === 'POST') return enregistrerPaiement(env, segments[1], await lireJSON(request))

      if (segments[0] === 'articles' && segments[2] === 'soins' && method === 'PUT') return definirSoinsArticle(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'reserve' && method === 'PATCH') return definirReserve(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'photos' && method === 'POST') return ajouterPhoto(env, segments[1], await lireJSON(request))
      if (segments[0] === 'articles' && segments[2] === 'etapes' && segments[4] === 'valider' && method === 'POST') {
        return validerEtape(env, segments[1], Number(segments[3]), await lireJSON(request))
      }

      return erreur('Route inconnue', 404)
    } catch (e) {
      return erreur(`Erreur serveur : ${e.message}`, 500)
    }
  },
}
