const { MongoClient } = require('mongodb');
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'moodle_logs_db';

async function run() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);

    // Actualizar curso B (ID 3) para que no esté vencido
    const res = await db.collection('registeredCourses').updateOne(
        { courseId: 3 },
        { $set: { endDate: new Date('2026-12-31') } }
    );

    console.log(`Actualizados ${res.modifiedCount} cursos. El curso B (ID 3) ahora tiene fecha de fin en diciembre de 2026.`);
    await client.close();
}

run();
