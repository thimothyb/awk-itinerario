const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function scanReports() {
    for (let id = 1; id <= 30; id++) {
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
                console.log(`Report ${id} has DATA! Rows:`, data.data.totalrowcount);
            } else if (data && !data.exception) {
                // console.log(`Report ${id} exists but is empty.`);
            }
        } catch (e) {
            // console.log(`Report ${id} error or not found.`);
        }
    }
}

scanReports();
