import { Link } from 'react-router-dom'

export default function ModeTest() {
  return (
    <section>
      <h1>Mode test</h1>
      <p className="sous-titre">
        Accès rapide à toutes les vues, pour tester sans passer par le parcours normal. À retirer
        ou protéger avant une mise en production réelle (aucune authentification ne distingue
        encore ces vues).
      </p>

      <h2>Côté client</h2>
      <div className="card">
        <Link to="/">Accueil — recherche de pressing</Link>
      </div>
      <div className="card">
        <Link to="/nouvelle-commande">Choix du mode de dépôt et créneau</Link>
      </div>
      <div className="card">
        <Link to="/commande/soins">Sélection des articles et soins</Link>
      </div>
      <div className="card">
        <Link to="/commande/inventaire">Fiche d'état à l'entrée</Link>
      </div>
      <div className="card">
        <Link to="/commande/ticket">Ticket et étiquettes</Link>
      </div>
      <div className="card">
        <Link to="/commande/suivi">Suivi de commande</Link>
      </div>
      <div className="card">
        <Link to="/compte">Compte et fidélité</Link>
      </div>

      <h2>Côté pressing</h2>
      <div className="card">
        <Link to="/employe">Employé — validation des étapes par poste</Link>
      </div>
      <div className="card">
        <Link to="/gerant">Gérant — configuration du pressing</Link>
      </div>
      <div className="card">
        <Link to="/proprietaire">Propriétaire — tableau de bord multi-pressing</Link>
      </div>

      <p className="sous-titre" style={{ marginTop: '1rem' }}>
        Les vues gérant et propriétaire sont en lecture seule pour l'instant (données de
        démonstration, pas de formulaire de modification branché).
      </p>
    </section>
  )
}
