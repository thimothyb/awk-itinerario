const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function scanReports() {
    console.log("Deep scanning reports 1 to 50...");
    for (let id = 1; id <= 50; id++) {
        try {
            const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
                params: {
                    wstoken: MOODLE_TOKEN,
                    wsfunction: 'core_reportbuilder_retrieve_report',
                    moodlewsrestformat: 'json',
                    reportid: id,
                    perpage: 1
                }
            });
            const data = response.data;
            if (data && !data.exception && data.data && data.data.rows && data.data.rows.length > 0) {
                console.log(`Report [${id}] (Source: UNKNOWN) Data:`, JSON.stringify(data.data.rows[0].columns));
            }
        } catch (e) {
            // Silence
        }
    }
}

scanReports();
