
const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function listReports() {
    try {
        const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_list_reports',
                moodlewsrestformat: 'json'
            }
        });
        console.log("Reports list:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

listReports();
