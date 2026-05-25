const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

const cleanMoodleResponse = (data) => {
    if (typeof data === 'string' && (data.includes('{') || data.includes('['))) {
        try {
            const firstBrace = data.indexOf('{');
            const firstBracket = data.indexOf('[');
            const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
            if (start !== -1) {
                return JSON.parse(data.substring(start));
            }
        } catch (e) {
            console.error("Error cleaning:", e);
        }
    }
    return data;
};

async function listReports() {
    try {
        console.log("Listing reports...");
        const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_list_reports',
                moodlewsrestformat: 'json'
            }
        });

        const data = cleanMoodleResponse(response.data);
        if (Array.isArray(data)) {
            console.log("Found reports:");
            data.forEach(r => console.log(`- [${r.id}] ${r.name} (${r.source})`));
        } else {
            console.log("Response is not an array:", data);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listReports();
