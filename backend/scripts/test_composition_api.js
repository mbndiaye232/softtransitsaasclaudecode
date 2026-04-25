const axios = require('axios');

async function testCompositionAPI() {
    const API_URL = 'http://localhost:3001/api/composition';
    const LOGIN_URL = 'http://localhost:3001/api/auth/login';

    try {
        // 1. Login to get token
        console.log('Logging in...');
        const loginRes = await axios.post(LOGIN_URL, {
            email: 'admin@example.com', // Assuming default admin
            password: 'password123'     // Assuming default password
        });
        const token = loginRes.data.token;
        console.log('Got token:', token ? 'YES' : 'NO');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Test Get Containers (using a dummy ID 1 or existing dossier ID)
        console.log('Fetching containers for dossier 1...');
        try {
            const getRes = await axios.get(`${API_URL}/containers/1`, config);
            console.log('Get Containers Status:', getRes.status);
            console.log('Containers:', getRes.data);
        } catch (e) {
            console.error('Get Containers Failed:', e.message);
        }

        // 3. Test Add Container
        console.log('Adding container...');
        try {
            const addRes = await axios.post(`${API_URL}/containers`, {
                idblltalvibooking: 1, // Assuming dossier 1 exists and is linked to BL 1
                NumeroTC: 'TEST-1234',
                TypeTC: '40',
                TareTC: 2000,
                DimensionTC: 30,
                UnitePoids: 'Kg'
            }, config);
            console.log('Add Container Status:', addRes.status);
            console.log('Response:', addRes.data);
        } catch (e) {
            console.error('Add Container Failed:', e.response?.data || e.message);
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

testCompositionAPI();
