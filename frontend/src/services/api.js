import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })
}

export const structureAPI = {
    getMe: () => api.get('/structures/me'),
    updateMe: (formData) => api.put('/structures/me', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),
    getCountries: () => api.get('/pays')
}

export const clientsAPI = {
    getAll: () => api.get('/clients'),
    getOne: (id) => api.get(`/clients/${id}`),
    create: (data) => api.post('/clients', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, data) => api.put(`/clients/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const statutsAPI = {
    getAll: () => api.get('/statuts'),
    create: (data) => api.post('/statuts', data),
    update: (id, data) => api.put(`/statuts/${id}`, data),
    delete: (id) => api.delete(`/statuts/${id}`)
}

export const transactionsAPI = {
    getAll: () => api.get('/transactions'),
    purchase: (data) => api.post('/transactions/purchase', data),
    confirm: (data) => api.post('/transactions/confirm', data)
}

export const groupesAPI = {
    getAll: () => api.get('/groupes'),
    getOne: (id) => api.get(`/groupes/${id}`),
    create: (data) => api.post('/groupes', data),
    update: (id, data) => api.put(`/groupes/${id}`, data),
    delete: (id) => api.delete(`/groupes/${id}`)
}

export const usersAPI = {
    getAll: () => api.get('/users'),
    getDeclarants: () => api.get('/users/declarants'),
    getOne: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    reactivate: (id) => api.patch(`/users/${id}/reactivate`),
    getPermissions: (id) => api.get(`/users/${id}/permissions`),
    getPermissionsList: () => api.get('/users/permissions/list'),
    updatePermissions: (id, permissions) => api.put(`/users/${id}/permissions`, { permissions }),
    toggleSuperAdmin: (id, grant) => api.put(`/users/${id}/super-admin`, { grant }),
    getMyPermissions: () => api.get('/users/me/permissions'),
}

export const dossiersAPI = {
    getAll: () => api.get('/dossiers'),
    getOne: (id) => api.get(`/dossiers/${id}`),
    getByClient: (clientId) => api.get(`/dossiers/client/${clientId}`),
    create: (data) => api.post('/dossiers', data),
    update: (id, data) => api.put(`/dossiers/${id}`, data),
    delete: (id) => api.delete(`/dossiers/${id}`)
};

export const notesAPI = {
    getAll: (dossierId) => api.get(`/notes${dossierId ? `?dossier_id=${dossierId}` : ''}`),
    getOne: (id) => api.get(`/notes/${id}`),
    create: (data) => api.post('/notes', data),
    update: (id, data) => api.put(`/notes/${id}`, data),
    delete: (id) => api.delete(`/notes/${id}`),
    getArticles: (noteId) => api.get(`/notes/${noteId}/articles`),
    addArticle: (noteId, data) => api.post(`/notes/${noteId}/articles`, data),
    updateArticle: (articleId, data) => api.put(`/notes/articles/${articleId}`, data),
    deleteArticle: (articleId) => api.delete(`/notes/articles/${articleId}`),
    distribute: (noteId, data) => api.post(`/notes/${noteId}/distribute`, data),
    convertToFCFA: (noteId) => api.post(`/notes/${noteId}/convert-to-fcfa`),
    calculateTaxes: (articleId, data) => api.post(`/notes/articles/${articleId}/calculate-taxes`, data),
    clearLiquidations: (articleId) => api.delete(`/notes/articles/${articleId}/liquidations`),
    // PDF Generation
    generatePDF: (noteId) => api.get(`/notes/${noteId}/generate-pdf`, { responseType: 'blob' }),
    validate: (noteId) => api.post(`/notes/${noteId}/validate`),
    getPdfStatus: (noteId) => api.get(`/notes/${noteId}/pdf-status`)
};

export const produitsAPI = {
    getAll: (params) => api.get('/produits', { params }),
    search: (query) => api.get(`/produits/search?q=${query}`),
    getByNTS: (nts) => api.get(`/produits/${nts}`)
};

export const regimesAPI = {
    getAll: () => api.get('/regimes')
};

export const devisesAPI = {
    getAll: () => api.get('/devises')
};

export const paysAPI = {
    getAll: () => api.get('/pays')
};

export const tiersAPI = {
    getAll: () => api.get('/tiers'),
    getOne: (id) => api.get(`/tiers/${id}`),
    create: (data) => api.post('/tiers', data),
    update: (id, data) => api.put(`/tiers/${id}`, data),
    delete: (id) => api.delete(`/tiers/${id}`)
};

export const activitesAPI = {
    getAll: () => api.get('/activites')
};


export const taxesAPI = {
    getAll: (nts) => api.get(`/taxes${nts ? `?nts=${nts}` : ''}`)
};

export const ordresTransitAPI = {
    getAll: () => api.get('/ordres-transit'),
    getOne: (id) => api.get(`/ordres-transit/${id}`),
    getByDossier: (dossierId) => api.get(`/ordres-transit/dossier/${dossierId}`),
    create: (data) => api.post('/ordres-transit', data),
    update: (id, data) => api.put(`/ordres-transit/${id}`, data),
    delete: (id) => api.delete(`/ordres-transit/${id}`)
};

export const incotermsAPI = {
    getAll: () => api.get('/incoterms'),
    create: (data) => api.post('/incoterms', data)
};

export const regimesOTAPI = {
    getAll: () => api.get('/regimes-ot'),
    create: (data) => api.post('/regimes-ot', data)
};

export const typesDocumentsOTAPI = {
    getAll: () => api.get('/types-documents-ot'),
    create: (data) => api.post('/types-documents-ot', data)
};

export const statisticsAPI = {
    getDashboard: () => api.get('/statistics/dashboard')
};

export const cotationsAPI = {
    getByDossier: (dossierId) => api.get(`/cotations/dossier/${dossierId}`),
    getDashboard: () => api.get('/cotations/dashboard'),
    create: (data) => api.post('/cotations', data)
};

export const lieuxAPI = {
    getAll: (params) => api.get('/lieux', { params }),
    getOne: (id) => api.get(`/lieux/${id}`),
    create: (data) => api.post('/lieux', data),
    update: (id, data) => api.put(`/lieux/${id}`, data),
    delete: (id) => api.delete(`/lieux/${id}`)
};

export const billOfLadingAPI = {
    getByDossier: (dossierId) => api.get(`/bill-of-lading/dossier/${dossierId}`),
    save: (data) => api.post('/bill-of-lading', data)
};

export const comptesMailsAPI = {
    getAll: () => api.get('/comptes-mails'),
    create: (data) => api.post('/comptes-mails', data),
    update: (id, data) => api.put(`/comptes-mails/${id}`, data),
    delete: (id) => api.delete(`/comptes-mails/${id}`),
    test: (data) => api.post('/comptes-mails/test', data)
};

export const dashboardsAPI = {
    getTransportArrivals: () => api.get('/dashboards/transport-arrivals'),
    getDossierTracking: () => api.get('/dashboards/dossier-tracking'),
    getDetailedTracking: () => api.get('/dashboards/detailed-tracking'),
    getTopClientsCA: () => api.get('/dashboards/top-clients-ca'),
    getTopEncours: () => api.get('/dashboards/top-encours'),
    getAgingBalance: () => api.get('/dashboards/aging-balance'),
    getPerformanceTrends: () => api.get('/dashboards/performance-trends'),
    getDossierTrends: () => api.get('/dashboards/dossier-trends')
};

export const declarationsAPI = {
    getByDossier: (dossierId) => api.get(`/declarations/dossier/${dossierId}`),
    getActiveCotation: (dossierId) => api.get(`/declarations/dossier/${dossierId}/active-cotation`),
    getRegimes: () => api.get('/declarations/regimes'),
    create: (data) => api.post('/declarations', data),
    delete: (id) => api.delete(`/declarations/${id}`)
};

export const domainesActiviteAPI = {
    getAll: () => api.get('/domaines-activite'),
    create: (data) => api.post('/domaines-activite', data),
    update: (id, data) => api.put(`/domaines-activite/${id}`, data),
    delete: (id) => api.delete(`/domaines-activite/${id}`)
};

export const etapesDossiersAPI = {
    getAll: () => api.get('/etapes-dossiers'),
    create: (data) => api.post('/etapes-dossiers', data),
    update: (id, data) => api.put(`/etapes-dossiers/${id}`, data),
    delete: (id) => api.delete(`/etapes-dossiers/${id}`)
};

export const livraisonsAPI = {
    getMiseEnLivraison: (dossierId) => api.get(`/miseenlivraison/dossier/${dossierId}`),
    saveMiseEnLivraison: (data) => api.post('/miseenlivraison', data),
    getForemen: () => api.get('/miseenlivraison/foremen'),
    generatePDF: (dossierId) => api.get(`/miseenlivraison/${dossierId}/pdf`, { responseType: 'blob' })
};

export const ordreTransportAPI = {
    getByDossier: (dossierId) => api.get(`/ordre-transport/dossier/${dossierId}`),
    save: (data) => api.post('/ordre-transport', data),
    delete: (id) => api.delete(`/ordre-transport/${id}`),
    generatePDF: (code) => api.get(`/ordre-transport/${code}/pdf`, { responseType: 'blob' }),
    generateBLPDF: (id) => api.get(`/ordre-transport/${id}/bl-pdf`, { responseType: 'blob' })
};

export const reglementsAPI = {
    getModes: () => api.get('/reglements/modes'),
    createMode: (data) => api.post('/reglements/modes', data),
    updateMode: (id, data) => api.put(`/reglements/modes/${id}`, data),
    deleteMode: (id) => api.delete(`/reglements/modes/${id}`),
    getFacturesImpayees: (clientId) => api.get(`/reglements/factures-impayees/${clientId}`),
    processPayment: (data) => api.post('/reglements', data),
    getClientHistory: (clientId) => api.get(`/reglements/history/${clientId}`),
    getMovements: (clientId) => api.get(`/reglements/movements/${clientId}`),
    cancel: (id) => api.delete(`/reglements/${id}`),
    cancelMovement: (id) => api.delete(`/reglements/movement/${id}`)
};

export const rubriquesAPI = {
    getAll: () => api.get('/rubriques'),
    create: (data) => api.post('/rubriques', data),
    update: (id, data) => api.put(`/rubriques/${id}`, data),
    delete: (id) => api.delete(`/rubriques/${id}`)
};

export const typesDocumentsAPI = {
    getAll: () => api.get('/types-documents'),
    create: (data) => api.post('/types-documents', data),
    update: (id, data) => api.put(`/types-documents/${id}`, data),
    delete: (id) => api.delete(`/types-documents/${id}`)
};

export const unitesPoidsAPI = {
    getAll: () => api.get('/unites-poids'),
    create: (data) => api.post('/unites-poids', data),
    update: (id, data) => api.put(`/unites-poids/${id}`, data),
    delete: (id) => api.delete(`/unites-poids/${id}`)
};

export const unitesVolumeAPI = {
    getAll: () => api.get('/unites-volume'),
    create: (data) => api.post('/unites-volume', data),
    update: (id, data) => api.put(`/unites-volume/${id}`, data),
    delete: (id) => api.delete(`/unites-volume/${id}`)
};

export const transportsAPI = {
    getAll: () => api.get('/transports'),
    getOne: (id) => api.get(`/transports/${id}`),
    getByDossier: (dossierId) => api.get(`/transports/dossier/${dossierId}`),
    save: (data) => api.post('/transports', data),   // upsert — backend handles create vs update
    create: (data) => api.post('/transports', data),
    update: (id, data) => api.put(`/transports/${id}`, data),
    delete: (id) => api.delete(`/transports/${id}`)
};

export const moyensTransportAPI = {
    getAll: () => api.get('/moyens-transport'),
    getOne: (id) => api.get(`/moyens-transport/${id}`),
    create: (data) => api.post('/moyens-transport', data),
    update: (id, data) => api.put(`/moyens-transport/${id}`, data),
    delete: (id) => api.delete(`/moyens-transport/${id}`)
};

export const compositionAPI = {
    checkBilloflading: (dossierId) => api.get(`/composition/check-billoflading/${dossierId}`),
    getContainers: (dossierId) => api.get(`/composition/containers/${dossierId}`),
    addContainer: (data) => api.post('/composition/containers', data),
    deleteContainer: (id) => api.delete(`/composition/containers/${id}`),
    getContainerContent: (containerId) => api.get(`/composition/containers/${containerId}/content`),
    addContainerContent: (data) => api.post('/composition/containers/content', data),
    deleteContainerContent: (id) => api.delete(`/composition/containers/content/${id}`),
    getGroupage: (dossierId) => api.get(`/composition/groupage/${dossierId}`),
    addGroupage: (data) => api.post('/composition/groupage', data),
    deleteGroupage: (id) => api.delete(`/composition/groupage/${id}`)
};

export const devisClientAPI = {
    create: (data) => api.post('/devis', data),
    getByDossier: (dossierId) => api.get(`/devis/dossier/${dossierId}`),
    getOne: (id) => api.get(`/devis/${id}`),
    accepter: (id) => api.patch(`/devis/${id}/accepter`),
    delete: (id) => api.delete(`/devis/${id}`),
    generatePDF: (id) => api.get(`/devis/${id}/pdf`, { responseType: 'blob' }),
    convertir: (id) => api.post(`/devis/${id}/convertir`)
};

export const documentsAPI = {
    getByDossier: (dossierId) => api.get(`/documents/dossier/${dossierId}`),
    create: (data) => api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    view: (id) => api.get(`/documents/${id}/view`, { responseType: 'blob' }),
    viewUrl: (id) => `${API_URL}/documents/${id}/view`,
    extract: (dossierId) => api.get(`/documents/dossier/${dossierId}/extract`, { responseType: 'blob' }),
    delete: (id) => api.delete(`/documents/${id}`)
};

export const etatsFinanciersAPI = {
    getFacturesClients: (params) => api.get('/etats-financiers/factures-clients', { params }),
    getReleveClient: (params) => api.get('/etats-financiers/releve-client', { params }),
    getReleveClientPDF: (params) => api.get('/etats-financiers/releve-client/pdf', { params, responseType: 'blob' }),
    getEtatFacturesPDF: (params) => api.get('/etats-financiers/etat-factures/pdf', { params, responseType: 'blob' }),
    getGrandLivre: (params) => api.get('/etats-financiers/grand-livre', { params }),
    getCA: (params) => api.get('/etats-financiers/ca-clients', { params }),
    getJournalSAARI: (params) => api.get('/etats-financiers/journal-saari', { params })
};

export const facturesAPI = {
    create: (data) => api.post('/factures', data),
    getByDossier: (dossierId) => api.get(`/factures/dossier/${dossierId}`),
    getOne: (id) => api.get(`/factures/${id}`),
    getByClient: (clientId) => api.get(`/factures/client/${clientId}`),
    generatePDF: (id) => api.get(`/factures/${id}/pdf`, { responseType: 'blob' }),
    validate: (id) => api.patch(`/factures/${id}/validate`),
    unvalidate: (id) => api.patch(`/factures/${id}/unvalidate`),
    delete: (id) => api.delete(`/factures/${id}`),
    uploadJustificatif: (id, data) => api.post(`/factures/${id}/justificatifs`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getJustificatifs: (id) => api.get(`/factures/${id}/justificatifs`),
    deleteJustificatif: (id) => api.delete(`/factures/justificatifs/${id}`),
    sendEmail: (id, data) => api.post(`/factures/${id}/send-email`, data)
};

export const facturesRecuesAPI = {
    getByDossier: (dossierId) => api.get(`/facturesrecues/dossier/${dossierId}`),
    getDebours: (dossierId) => api.get(`/facturesrecues/debours/${dossierId}`),
    create: (data) => api.post('/facturesrecues', data),
    update: (id, data) => api.put(`/facturesrecues/${id}`, data),
    delete: (id) => api.delete(`/facturesrecues/${id}`)
};

export const tarifsAPI = {
    getAll: (params) => api.get('/tarifs', { params }),
    create: (data) => api.post('/tarifs', data),
    bulkUpdate: (data) => api.put('/tarifs/bulk-update', data),
    delete: (id) => api.delete(`/tarifs/${id}`),
    // Grille tarifaire + consommation (page Facturation)
    getBillingTarifs: (period = 30) => api.get(`/billing/tarifs?period=${period}`),
};

export const tauxAPI = {
    getAll: () => api.get('/taux'),
    create: (data) => api.post('/taux', data),
    delete: (id) => api.delete(`/taux/${id}`)
};

export const suiviTraitementsAPI = {
    getAll: () => api.get('/suivi-traitements'),
};

export const billingAPI = {
    getStatus: () => api.get('/billing/status'),
    requestMode: (data) => api.post('/billing/request-mode', data),
    getMyRequests: () => api.get('/billing/request-mode'),
    getConsumption: (period = 30) => api.get(`/billing/consumption?period=${period}`),
    getPacks: () => api.get('/billing/packs'),
    getHistory: (params = {}) => api.get('/billing/history', { params }),
    updateAlerts: (data) => api.put('/billing/alerts', data),
    getForfaitOptions: () => api.get('/billing/forfait/options'),
    initiatePurchase: (data) => api.post('/billing/purchase/initiate', data),
    confirmPurchase: (data) => api.post('/billing/purchase/confirm', data),
    cancelPurchase: (data) => api.post('/billing/purchase/cancel', data),
    admin: {
        getCompanies: () => api.get('/billing/admin/companies'),
        setMode: (companyId, data) => api.put(`/billing/admin/companies/${companyId}/mode`, data),
        adjustCredits: (companyId, data) => api.post(`/billing/admin/companies/${companyId}/credit`, data),
        getPacks: () => api.get('/billing/admin/packs'),
        createPack: (data) => api.post('/billing/admin/packs', data),
        updatePack: (id, data) => api.put(`/billing/admin/packs/${id}`, data),
        getRequests: (status = 'pending') => api.get(`/billing/admin/requests?status=${status}`),
        handleRequest: (id, data) => api.put(`/billing/admin/requests/${id}`, data),
        toggleProvider: (companyId, is_provider) => api.put(`/billing/admin/companies/${companyId}/provider`, { is_provider }),
        // Grille tarifaire
        getCreditRules: () => api.get('/billing/admin/credit-rules'),
        createCreditRule: (data) => api.post('/billing/admin/credit-rules', data),
        updateCreditRule: (id, data) => api.put(`/billing/admin/credit-rules/${id}`, data),
        deleteCreditRule: (id) => api.delete(`/billing/admin/credit-rules/${id}`),
        // Super admins
        getSuperAdmins: () => api.get('/billing/admin/super-admins'),
        toggleSuperAdmin: (id, grant) => api.put(`/billing/admin/super-admins/${id}`, { grant }),
        // Configuration forfaits
        getForfaitConfig: () => api.get('/billing/admin/forfait-config'),
        createForfaitConfig: (data) => api.post('/billing/admin/forfait-config', data),
        updateForfaitConfig: (type, data) => api.put(`/billing/admin/forfait-config/${type}`, data),
        deleteForfaitConfig: (type) => api.delete(`/billing/admin/forfait-config/${type}`),
    },
};

export default api
