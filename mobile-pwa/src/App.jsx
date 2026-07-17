import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Accueil from './pages/Accueil.jsx'
import NouvelleCommande from './pages/NouvelleCommande.jsx'
import ChoixSoins from './pages/ChoixSoins.jsx'
import Inventaire from './pages/Inventaire.jsx'
import TicketPapier from './pages/TicketPapier.jsx'
import Paiement from './pages/Paiement.jsx'
import Suivi from './pages/Suivi.jsx'
import CommandeRetiree from './pages/CommandeRetiree.jsx'
import Compte from './pages/Compte.jsx'
import Employe from './pages/Employe.jsx'

export default function App() {
  const location = useLocation()
  const estVueEmploye = location.pathname.startsWith('/employe')

  return (
    <div className="app">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/nouvelle-commande" element={<NouvelleCommande />} />
          <Route path="/commande/soins" element={<ChoixSoins />} />
          <Route path="/commande/inventaire" element={<Inventaire />} />
          <Route path="/commande/ticket" element={<TicketPapier />} />
          <Route path="/commande/suivi" element={<Suivi />} />
          <Route path="/commande/retire" element={<CommandeRetiree />} />
          <Route path="/paiement/:type" element={<Paiement />} />
          <Route path="/compte" element={<Compte />} />
          <Route path="/employe" element={<Employe />} />
        </Routes>
      </main>
      <nav className="app-nav no-print">
        <Link to="/" className={location.pathname === '/' ? 'actif' : ''}>
          <i className="ti ti-home" aria-hidden="true"></i>Accueil
        </Link>
        <Link to="/commande/suivi" className={location.pathname === '/commande/suivi' ? 'actif' : ''}>
          <i className="ti ti-list" aria-hidden="true"></i>Suivi
        </Link>
        <Link to="/compte" className={location.pathname === '/compte' ? 'actif' : ''}>
          <i className="ti ti-user" aria-hidden="true"></i>Compte
        </Link>
        <Link to="/employe" className={estVueEmploye ? 'actif' : ''}>
          <i className="ti ti-building-store" aria-hidden="true"></i>Employé
        </Link>
      </nav>
    </div>
  )
}
