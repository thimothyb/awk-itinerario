const { MongoClient } = require('mongodb');

async function run() {
    const MONGO_URL = 'mongodb://localhost:27017';
    const DB_NAME = 'moodle_logs_db';
    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('registeredCourses');

        const courses = await col.find({}).toArray();
        for (const c of courses) {
            if (c.imageUrl && c.imageUrl.includes('proxy-img')) {
                // Extraer la URL original del parámetro 'url'
                const urlObj = new URL(c.imageUrl);
                let moodleImgUrl = urlObj.searchParams.get('url');

                if (moodleImgUrl && moodleImgUrl.includes('/webservice/webservice/')) {
                    moodleImgUrl = moodleImgUrl.replace(/\/webservice\/webservice\//g, '/webservice/');
                    const newProxyUrl = `http://localhost:3000/api/proxy-img?url=${encodeURIComponent(moodleImgUrl)}`;

                    await col.updateOne({ _id: c._id }, { $set: { imageUrl: newProxyUrl } });
                    console.log(`✅ Corregida imagen para: ${c.shortname}`);
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();
