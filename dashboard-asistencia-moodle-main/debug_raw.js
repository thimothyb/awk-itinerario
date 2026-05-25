const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function checkRawResponse() {
    try {
        console.log("Fetching report 18 raw...");
        const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report',
                moodlewsrestformat: 'json',
                reportid: 18,
                perpage: 5
            }
        });

        if (response.data.exception) {
            console.log("EXCEPTION DETECTED:");
            console.log("Message:", response.data.message);
            console.log("Error Code:", response.data.errorcode);
        } else {
            console.log("SUCCESS! Row count:", response.data.data?.totalrowcount);
        }
    } catch (e) {
        console.error("Axios Error:", e.message);
    }
}

checkRawResponse();
