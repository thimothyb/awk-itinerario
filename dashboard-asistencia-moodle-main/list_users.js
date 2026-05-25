const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function listUsers() {
    try {
        const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_user_get_users',
                moodlewsrestformat: 'json',
                criteria: [
                    { key: '', value: '' } // All users
                ]
            }
        });
        console.log("Total users:", response.data.users?.length);
        response.data.users?.forEach(u => console.log(`- ${u.username} (${u.fullname})`));
    } catch (e) {
        console.error(e.message);
    }
}

listUsers();
