const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testOrdreTransport() {
    try {
        console.log('--- Testing Ordre de Transport API ---');

        // 1. Login to get token
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            login: 'admin', // assuming 'admin' is the login
            password: 'admin'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Fetch dossiers to get one id
        const dossiersRes = await axios.get(`${API_URL}/dossiers`, config);
        if (dossiersRes.data.length === 0) {
            console.log('No dossiers found to test with.');
            return;
        }
        const dossierId = dossiersRes.data[0].IDDossiers;
        console.log(`Using Dossier ID: ${dossierId}`);

        // 3. Save a transport order
        const saveRes = await axios.post(`${API_URL}/ordre-transport`, {
            IDDossiers: dossierId,
            CodeOrdreTransport: `TEST-OTR-${Date.now()}`,
            TransporteuretAdresse: 'Test Carrier',
            AdresseDeLivraison: 'Test Address',
            contents: [
                { NumeroTC: 'TEST-TC-001', TypeTC: '40', ObjetTC: 'Conteneur', Quantite: 1, PoidsNet: 2000, Unite: 'Kg' }
            ]
        }, config);
        console.log('Save result:', saveRes.data.message);

        // 4. Fetch orders for this dossier
        const ordersRes = await axios.get(`${API_URL}/ordre-transport/dossier/${dossierId}`, config);
        console.log(`Found ${ordersRes.data.length} orders for this dossier.`);

        // 5. Test PDF endpoint (just metadata check)
        const orderCode = ordersRes.data[0].CodeOrdreTransport;
        console.log(`Testing PDF generation for order: ${orderCode}`);
        const pdfRes = await axios.get(`${API_URL}/ordre-transport/${orderCode}/pdf`, { ...config, responseType: 'arraybuffer' });
        console.log('PDF generation status:', pdfRes.status);
        console.log('PDF content type:', pdfRes.headers['content-type']);

        console.log('--- Test Completed Successfully ---');
    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
    }
}

testOrdreTransport();
