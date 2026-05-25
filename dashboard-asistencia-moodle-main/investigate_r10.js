const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function investigateReport10() {
    try {
        const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report',
                moodlewsrestformat: 'json',
                reportid: 10,
                perpage: 10
            }
        });
        const rows = response.data.data.rows;
        console.log("Investigating Report 10 Columns...");
        if (rows.length > 0) {
            rows.forEach((row, rowIndex) => {
                console.log(`Row ${rowIndex}:`);
                row.columns.forEach((col, i) => {
                    console.log(`  Col ${i}:`, col);
                });
            });
        }
    } catch (e) {
        console.error(e.message);
    }
}

investigateReport10();
