import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BillingProvider } from './context/BillingContext'
import CreditBanner from './components/CreditBanner'
import FloatingNav from './components/FloatingNav'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CompanySettings from './pages/CompanySettings'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ClientForm from './pages/ClientForm'
import ClientList from './pages/ClientList'
import StatusList from './pages/StatusList'
import CreditPurchase from './pages/CreditPurchase'
import BillingDashboard from './pages/BillingDashboard'
import BillingPurchase from './pages/BillingPurchase'
import AdminBilling from './pages/AdminBilling'
import GroupList from './pages/GroupList'
import UserList from './pages/UserList'
import UserForm from './pages/UserForm'
import DossierCreate from './pages/DossierCreate'
import DossierEdit from './pages/DossierEdit'
import DossierList from './pages/DossierList'
import NoteDeDetail from './pages/NoteDeDetail'
import ProductList from './pages/ProductList'
import TiersPage from './pages/TiersPage'
import CotationPage from './pages/CotationPage'
import OrdreTransitPage from './pages/OrdreTransitPage'
import ReferenceDataOTPage from './pages/ReferenceDataOTPage'
import SettingsHub from './pages/SettingsHub'
import EtatsFinanciers from './pages/EtatsFinanciers'
import SuiviDossiers from './pages/SuiviDossiers'
import SuiviTraitements from './pages/SuiviTraitements'
import DocumentManager from './pages/DocumentManager'
import DecisionDashboard from './pages/DecisionDashboard'
import BackupManager from './pages/BackupManager'
import TarifsManager from './pages/TarifsManager'
import ComptesMailsPage from './pages/ComptesMailsPage'
import MoyensTransportPage from './pages/MoyensTransportPage'
import LieuxPage from './pages/LieuxPage'
import EtapesDossiersPage from './pages/EtapesDossiersPage'
import PaysPage from './pages/PaysPage'
import TypesTransportPage from './pages/TypesTransportPage'
import RubriquesPage from './pages/RubriquesPage'
import DevisesPage from './pages/DevisesPage'
import TypesDocumentsManager from './pages/TypesDocumentsManager'
import StatutsOrgPage from './pages/StatutsOrgPage'
import ModesReglementsPage from './pages/ModesReglementsPage'
import UnitesPoidsPage from './pages/UnitesPoidsPage'
import UnitesVolumePage from './pages/UnitesVolumePage'
import RegimesDeclarationPage from './pages/RegimesDeclarationPage'
import CouleursPage from './pages/CouleursPage'
import ReglementsPage from './pages/ReglementsPage'
import SuiviFacturesClient from './pages/SuiviFacturesClient'
import CancellationManager from './pages/CancellationManager'
import TransportArrivals from './pages/TransportArrivals'

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading">Chargement...</div>
    return user ? children : <Navigate to="/login" />
}

const ProtectedWithBilling = ({ children }) => (
    <ProtectedRoute>
        <BillingProvider>
            <CreditBanner />
            <FloatingNav />
            {children}
        </BillingProvider>
    </ProtectedRoute>
)

function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Billing */}
            <Route path="/billing" element={<ProtectedWithBilling><BillingDashboard /></ProtectedWithBilling>} />
            <Route path="/billing/purchase" element={<ProtectedWithBilling><BillingPurchase /></ProtectedWithBilling>} />
            <Route path="/billing/payment/success" element={<ProtectedWithBilling><BillingPurchase /></ProtectedWithBilling>} />
            <Route path="/billing/payment/cancel" element={<ProtectedWithBilling><BillingPurchase /></ProtectedWithBilling>} />
            <Route path="/admin/billing" element={<ProtectedWithBilling><AdminBilling /></ProtectedWithBilling>} />

            {/* Ancienne route crédits → redirect */}
            <Route path="/credits/buy" element={<Navigate to="/billing/purchase" />} />

            {/* App */}
            <Route path="/dashboard" element={<ProtectedWithBilling><Dashboard /></ProtectedWithBilling>} />
            <Route path="/settings" element={<ProtectedWithBilling><CompanySettings /></ProtectedWithBilling>} />
            <Route path="/company-settings" element={<ProtectedWithBilling><CompanySettings /></ProtectedWithBilling>} />
            <Route path="/statuts" element={<ProtectedWithBilling><StatusList /></ProtectedWithBilling>} />
            <Route path="/groupes" element={<ProtectedWithBilling><GroupList /></ProtectedWithBilling>} />
            <Route path="/users" element={<ProtectedWithBilling><UserList /></ProtectedWithBilling>} />
            <Route path="/users/new" element={<ProtectedWithBilling><UserForm /></ProtectedWithBilling>} />
            <Route path="/users/:id" element={<ProtectedWithBilling><UserForm /></ProtectedWithBilling>} />
            <Route path="/clients" element={<ProtectedWithBilling><ClientList /></ProtectedWithBilling>} />
            <Route path="/clients/new" element={<ProtectedWithBilling><ClientForm /></ProtectedWithBilling>} />
            <Route path="/clients/:id" element={<ProtectedWithBilling><ClientForm /></ProtectedWithBilling>} />
            <Route path="/tiers" element={<ProtectedWithBilling><TiersPage /></ProtectedWithBilling>} />
            <Route path="/cotations" element={<ProtectedWithBilling><CotationPage /></ProtectedWithBilling>} />
            <Route path="/ordres-transit" element={<ProtectedWithBilling><OrdreTransitPage /></ProtectedWithBilling>} />
            <Route path="/config-transit" element={<ProtectedWithBilling><ReferenceDataOTPage /></ProtectedWithBilling>} />
            <Route path="/dossiers" element={<ProtectedWithBilling><DossierList /></ProtectedWithBilling>} />
            <Route path="/dossiers/new" element={<ProtectedWithBilling><DossierCreate /></ProtectedWithBilling>} />
            <Route path="/dossiers/:id" element={<ProtectedWithBilling><DossierEdit /></ProtectedWithBilling>} />
            <Route path="/notes" element={<ProtectedWithBilling><NoteDeDetail /></ProtectedWithBilling>} />
            <Route path="/produits" element={<ProtectedWithBilling><ProductList /></ProtectedWithBilling>} />
            <Route path="/parameters-hub" element={<ProtectedWithBilling><SettingsHub /></ProtectedWithBilling>} />
            <Route path="/etats-financiers" element={<ProtectedWithBilling><EtatsFinanciers /></ProtectedWithBilling>} />
            <Route path="/reglements" element={<ProtectedWithBilling><ReglementsPage /></ProtectedWithBilling>} />
            <Route path="/suivi-factures" element={<ProtectedWithBilling><SuiviFacturesClient /></ProtectedWithBilling>} />
            <Route path="/reglements/cancellation" element={<ProtectedWithBilling><CancellationManager /></ProtectedWithBilling>} />
            <Route path="/suivi-dossiers" element={<ProtectedWithBilling><SuiviDossiers /></ProtectedWithBilling>} />
            <Route path="/documents" element={<ProtectedWithBilling><DocumentManager /></ProtectedWithBilling>} />
            <Route path="/decision-dashboard" element={<ProtectedWithBilling><DecisionDashboard /></ProtectedWithBilling>} />
            <Route path="/backups" element={<ProtectedWithBilling><BackupManager /></ProtectedWithBilling>} />
            <Route path="/suivi-traitements" element={<ProtectedWithBilling><SuiviTraitements /></ProtectedWithBilling>} />
            <Route path="/transport-arrivals" element={<ProtectedWithBilling><TransportArrivals /></ProtectedWithBilling>} />
            <Route path="/tarifs" element={<ProtectedWithBilling><TarifsManager /></ProtectedWithBilling>} />

            {/* ── Settings hub sub-pages ── */}
            <Route path="/comptes-mails"         element={<ProtectedWithBilling><ComptesMailsPage /></ProtectedWithBilling>} />
            <Route path="/moyens-transport"       element={<ProtectedWithBilling><MoyensTransportPage /></ProtectedWithBilling>} />
            <Route path="/lieux"                  element={<ProtectedWithBilling><LieuxPage /></ProtectedWithBilling>} />
            <Route path="/etapes-dossiers"        element={<ProtectedWithBilling><EtapesDossiersPage /></ProtectedWithBilling>} />
            <Route path="/pays"                   element={<ProtectedWithBilling><PaysPage /></ProtectedWithBilling>} />
            <Route path="/types-transport"        element={<ProtectedWithBilling><TypesTransportPage /></ProtectedWithBilling>} />
            <Route path="/rubriques"              element={<ProtectedWithBilling><RubriquesPage /></ProtectedWithBilling>} />
            <Route path="/devises"                element={<ProtectedWithBilling><DevisesPage /></ProtectedWithBilling>} />
            <Route path="/types-documents"        element={<ProtectedWithBilling><TypesDocumentsManager /></ProtectedWithBilling>} />
            <Route path="/statuts-organisations"  element={<ProtectedWithBilling><StatutsOrgPage /></ProtectedWithBilling>} />
            <Route path="/modes-reglement"        element={<ProtectedWithBilling><ModesReglementsPage /></ProtectedWithBilling>} />
            <Route path="/unites-poids"           element={<ProtectedWithBilling><UnitesPoidsPage /></ProtectedWithBilling>} />
            <Route path="/unites-volume"          element={<ProtectedWithBilling><UnitesVolumePage /></ProtectedWithBilling>} />
            <Route path="/regimes-declaration"    element={<ProtectedWithBilling><RegimesDeclarationPage /></ProtectedWithBilling>} />
            <Route path="/codes-couleurs"         element={<ProtectedWithBilling><CouleursPage /></ProtectedWithBilling>} />

            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    )
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    )
}

export default App
