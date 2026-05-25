const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function checkReport10() {
    try {
        const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report',
                moodlewsrestformat: 'json',
                reportid: 10,
                perpage: 5
            }
        });
        const rows = response.data.data.rows;
        if (rows.length > 0) {
            console.log("Columnas de la primera fila:");
            rows[0].columns.forEach((col, i) => {
                console.log(`Index ${i}:`, col);
            });
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkReport10();
