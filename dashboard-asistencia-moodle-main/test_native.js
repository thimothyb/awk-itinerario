const axios = require('axios');

async function test() {
    try {
        console.log('Probando endpoint /api/debug/native-report?reportid=18 (ahora hace POST a Moodle)...');
        const response = await axios.get('http://localhost:3000/api/debug/native-report?reportid=18');
        console.log('Status:', response.status);
        console.log('Data:', typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Error data:', error.response.data);
        }
    }
}

test();
