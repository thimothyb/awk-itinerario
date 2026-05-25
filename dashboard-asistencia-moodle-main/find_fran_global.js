const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function findFran() {
    try {
        const coursesResp = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_course_get_courses',
                moodlewsrestformat: 'json'
            }
        });
        const courses = coursesResp.data;

        for (const course of courses) {
            const usersResp = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
                params: {
                    wstoken: MOODLE_TOKEN,
                    wsfunction: 'core_enrol_get_enrolled_users',
                    moodlewsrestformat: 'json',
                    courseid: course.id
                }
            });
            const users = usersResp.data;
            const fran = users.find(u => u.username === 'fran' || u.fullname.toLowerCase().includes('fran'));
            if (fran) {
                console.log(`FOUND Fran in course ${course.id} (${course.shortname}) - ${course.fullname}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

findFran();
