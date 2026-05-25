const axios = require('axios');

async function test() {
    try {
        console.log('Probando endpoint /api/dailystats/6...');
        const response = await axios.get('http://localhost:3000/api/dailystats/6');
        console.log('Status:', response.status);
        console.log('Data Type:', typeof response.data);

        if (Array.isArray(response.data)) {
            console.log('Data length:', response.data.length);
            if (response.data.length > 0) {
                console.log('Primer usuario:', JSON.stringify(response.data[0], null, 2));
            } else {
                console.log('Array vacío devuelto.');
            }
        } else {
            console.log('Data:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

test();
