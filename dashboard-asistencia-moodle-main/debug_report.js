
const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function checkReport() {
    try {
        const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report',
                moodlewsrestformat: 'json',
                reportid: 18,
                perpage: 5
            }
        });
        console.log("Raw Report Data (First 2 rows):");
        const rows = response.data.data?.rows || response.data.rows || [];
        console.log(JSON.stringify(rows.slice(0, 2), null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

checkReport();
