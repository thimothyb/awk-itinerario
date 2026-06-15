/**
 * Recalcula imageUrl para todos los cursos registrados en la BD.
 * Ejecución: node update_images.js
 * Requiere que el token del webservice tenga permiso en core_course_get_contents.
 */
const { MongoClient } = require('mongodb');
const axios = require('axios');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME   = 'moodle_logs_db';
const PORT      = 3000; // para el proxy-img

function buildMoodleFileUrl(rawUrl, token) {
  let fileurl = rawUrl;
  if (fileurl.includes('/pluginfile.php') && !fileurl.includes('/webservice/pluginfile.php')) {
    fileurl = fileurl.replace('/pluginfile.php', '/webservice/pluginfile.php');
  }
  if (!fileurl.includes('token=')) {
    fileurl += (fileurl.includes('?') ? '&' : '?') + `token=${token}`;
  }
  return fileurl;
}

async function getImageForCourse(moodleUrl, moodleToken, courseId) {
  // Obtener datos del curso
  const r = await axios.get(`${moodleUrl}/webservice/rest/server.php`, {
    params: { wstoken: moodleToken, wsfunction: 'core_course_get_courses_by_field',
      moodlewsrestformat: 'json', field: 'id', value: courseId }, timeout: 10000 });
  const course = (r.data.courses || [])[0];
  if (!course) return null;

  // Plan A: overviewfiles
  if (course.overviewfiles && course.overviewfiles.length > 0) {
    console.log('  → Plan A (overviewfiles)');
    return buildMoodleFileUrl(course.overviewfiles[0].fileurl, moodleToken);
  }

  // Plan B: imagen en el resumen HTML
  if (course.summary && course.summary.includes('<img')) {
    const m = course.summary.match(/src="([^"]+)"/);
    if (m) {
      console.log('  → Plan B (summary html)');
      return buildMoodleFileUrl(m[1], moodleToken);
    }
  }

  // Plan C: foto incrustada en el contenido del curso (banner de sección)
  try {
    const cr = await axios.get(`${moodleUrl}/webservice/rest/server.php`, {
      params: { wstoken: moodleToken, wsfunction: 'core_course_get_contents',
        moodlewsrestformat: 'json', courseid: Number(courseId) }, timeout: 10000 });
    const sections = Array.isArray(cr.data) ? cr.data : [];
    for (const sec of sections) {
      const htmls = [sec.summary, ...(sec.modules || []).map(m => m.description)];
      for (const html of htmls) {
        if (html && html.includes('<img')) {
          const m = html.match(/src="([^"]+)"/);
          if (m && /\.(png|jpe?g|gif|webp|svg)/i.test(m[1])) {
            console.log('  → Plan C (contenido del curso)');
            return buildMoodleFileUrl(m[1], moodleToken);
          }
        }
      }
    }
  } catch(e) {
    const reason = e.response?.data?.errorcode || e.message;
    console.log(`  → Plan C falló (${reason})`);
  }

  // Plan D: courseimage (patrón generado por Moodle)
  if (course.courseimage) {
    console.log('  → Plan D (courseimage generado)');
    return buildMoodleFileUrl(course.courseimage, moodleToken);
  }

  return null;
}

(async () => {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const col = client.db(DB_NAME).collection('registeredCourses');
    const courses = await col.find({}).toArray();
    console.log(`Actualizando imágenes de ${courses.length} cursos...\n`);

    for (const c of courses) {
      console.log(`[${c.shortname}] (id:${c.courseId})`);
      try {
        let rawUrl = await getImageForCourse(c.moodleUrl, c.moodleToken, c.courseId);
        let finalUrl = rawUrl
          ? `http://localhost:${PORT}/api/proxy-img?url=${encodeURIComponent(rawUrl)}`
          : null;
        await col.updateOne({ _id: c._id }, { $set: { imageUrl: finalUrl } });
        console.log(`  ✅ imageUrl: ${finalUrl ? finalUrl.substring(0, 80) + '...' : 'NULL'}\n`);
      } catch(e) {
        console.log(`  ❌ Error: ${e.message}\n`);
      }
    }
    console.log('Listo.');
  } finally {
    await client.close();
  }
})();
