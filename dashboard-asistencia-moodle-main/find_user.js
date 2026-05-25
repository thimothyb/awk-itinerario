const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function findUser() {
    try {
        const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_user_get_users',
                moodlewsrestformat: 'json',
                criteria: [
                    { key: 'username', value: 'fran' }
                ]
            }
        });
        console.log("User Info:");
        console.log(JSON.stringify(response.data.users, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

findUser();
