
const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function checkLogs() {
    try {
        const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report', // Usamos la misma función pero verifiquemos si hay algo en cualquier reporte
                moodlewsrestformat: 'json',
                reportid: 18
            }
        });

        console.log("Resultado del reporte 18:");
        console.log(JSON.stringify(response.data, null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkLogs();
