const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'moodle_logs_db';
const COURSE_ID = '3';
const COURSE_SHORTNAME = 'B';

// MAPPING DE NOMBRES COMPLETOS PARA QUE SE VEAN PERFECTOS EN EL INFORME
const mappingNombres = {
    'admin': 'Administrador del Sistema',
    'oscar': 'Oscar Lozada',
    'leonardo': 'Leonardo Barreto',
    'fran': 'Fran Gutiérrez',
    'barry': 'Barry Brown',
    'maria': 'Maria García',
    'juan': 'Juan Pérez',
    'ana': 'Ana Martinez',
    'luis': 'Luis Rodríguez',
    'carla': 'Carla Soto',
    'pedro': 'Pedro Castillo',
    'elena': 'Elena Vargas',
    'roberto': 'Roberto Diaz',
    'sofia': 'Sofia Lopez',
    'diego': 'Diego Rios',
    'lucia': 'Lucia Mendez',
    'miguel': 'Miguel Torres',
    'isabel': 'Isabel Castro',
    'andres': 'Andres Navarro',
    'julia': 'Julia Ruiz',
    'tomas': 'Tomas Blanco',
    'student1': 'Estudiante de Prueba 01',
    'yenetsi': 'Yenetsi Rivas',
    'rober': 'Robert Johnson'
};

async function seed() {
    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('asistencia');

        const alumnosManuales = Object.keys(mappingNombres);

        await col.deleteMany({ courseId: COURSE_ID });
        console.log(`🗑️ Limpiando datos para corregir nombres completos...`);

        const docs = [];
        const hoyReferencia = new Date("2026-02-25T12:00:00Z");

        const desertores = ['fran', 'rober', 'isabel'];

        // Generar datos para 3 semanas
        for (let i = 0; i < 21; i++) {
            const fecha = new Date(hoyReferencia);
            fecha.setDate(hoyReferencia.getDate() - i);

            if (fecha.getDay() === 0 || fecha.getDay() === 6) continue;
            const fechaStr = fecha.toISOString().split('T')[0];

            for (const username of alumnosManuales) {
                let minutos = Math.floor(Math.random() * (195 - 180 + 1)) + 180;

                if (desertores.includes(username)) {
                    if (Math.random() > 0.6) continue;
                    minutos = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
                }

                const hEntrada = 9;
                const mEntrada = Math.floor(Math.random() * 10);
                const totalMinutosSalida = (hEntrada * 60) + mEntrada + minutos;
                const hSalida = Math.floor(totalMinutosSalida / 60);
                const mSalida = totalMinutosSalida % 60;

                const entradaStr = `${hEntrada.toString().padStart(2, '0')}:${mEntrada.toString().padStart(2, '0')}`;
                const salidaStr = `${hSalida.toString().padStart(2, '0')}:${mSalida.toString().padStart(2, '0')}`;

                let existing = docs.find(d => d.usuario === username);
                const dia = {
                    fecha: fechaStr,
                    minutos: minutos,
                    entrada: entradaStr,
                    salida: salidaStr,
                    firstTs: new Date(`${fechaStr}T${entradaStr}:00`).getTime(),
                    lastTs: new Date(`${fechaStr}T${salidaStr}:00`).getTime()
                };

                if (existing) {
                    existing.diasDetalle.push(dia);
                    existing.minutosTotales += minutos;
                } else {
                    docs.push({
                        usuario: username,
                        nombre: mappingNombres[username] || username, // AHORA USAMOS EL NOMBRE COMPLETO
                        groupName: 'Sin Grupo',
                        courseId: COURSE_ID,
                        courseShortname: COURSE_SHORTNAME,
                        minutosTotales: minutos,
                        diasDetalle: [dia],
                        isDemo: true,
                        fechaProceso: new Date()
                    });
                }
            }
        }

        if (docs.length > 0) {
            await col.insertMany(docs);
            console.log(`🚀 ¡LISTO! Nombres corregidos y datos inyectados.`);
            console.log(`✅ ${alumnosManuales.length} alumnos procesados con NOMBRES COMPLETOS.`);
            console.log(`💡 Refresca el Dashboard y verifica tanto el informe DIARIO como el SEMANAL.`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.close();
    }
}

seed();
