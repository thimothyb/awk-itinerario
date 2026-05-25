const { MongoClient } = require('mongodb');

async function run() {
    const MONGO_URL = 'mongodb://localhost:27017';
    const DB_NAME = 'moodle_logs_db';
    const PORT = 3000;

    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('registeredCourses');

        const courses = await col.find({}).toArray();
        console.log(`Buscando imágenes en ${courses.length} cursos...`);

        for (const course of courses) {
            if (course.imageUrl && !course.imageUrl.includes('proxy-img')) {
                // Si la imagen ya es externa o de Moodle, la envolvemos en nuestro proxy
                const originalUrl = course.imageUrl;
                const proxyUrl = `http://localhost:${PORT}/api/proxy-img?url=${encodeURIComponent(originalUrl)}`;

                await col.updateOne(
                    { _id: course._id },
                    { $set: { imageUrl: proxyUrl } }
                );
                console.log(`✅ Actualizada imagen para: ${course.shortname}`);
            }
        }

        console.log('Finalizado.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

run();
