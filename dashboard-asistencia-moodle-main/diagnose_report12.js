const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

async function diagnose() {
    try {
        console.log("=== DIAGNÓSTICO REPORTE 12 ===");
        console.log("MOODLE_URL:", MOODLE_URL);

        const response = await axios.post(`${MOODLE_URL}/webservice/rest/server.php`, null, {
            params: {
                wstoken: MOODLE_TOKEN,
                wsfunction: 'core_reportbuilder_retrieve_report',
                moodlewsrestformat: 'json',
                reportid: 12,
                perpage: 100
            }
        });

        const data = response.data;

        if (data.exception) {
            console.log("ERROR:", data.message);
            return;
        }

        const rows = data.data?.rows || [];
        console.log(`Total filas: ${data.data?.totalrowcount}`);
        console.log(`Filas recibidas: ${rows.length}`);
        console.log("");

        // Mostrar headers si hay
        if (data.data?.headers) {
            console.log("=== HEADERS ===");
            data.data.headers.forEach((h, i) => console.log(`  Header[${i}]: ${JSON.stringify(h)}`));
            console.log("");
        }

        // Mostrar primeras 5 filas con detalle completo
        console.log("=== PRIMERAS 5 FILAS (detalle completo) ===");
        rows.slice(0, 5).forEach((row, rowIdx) => {
            console.log(`\n--- Fila ${rowIdx} ---`);
            if (row.columns) {
                row.columns.forEach((col, colIdx) => {
                    console.log(`  Col[${colIdx}] type=${typeof col}:`);
                    if (typeof col === 'object' && col !== null) {
                        console.log(`    keys: ${Object.keys(col).join(', ')}`);
                        console.log(`    value: ${JSON.stringify(col).substring(0, 200)}`);
                    } else {
                        console.log(`    value: "${col}"`);
                    }
                });
            }
        });

        // Resumen de cursos únicos
        console.log("\n=== CURSOS ÚNICOS ===");
        const courses = new Set();
        rows.forEach(row => {
            const col1 = row.columns?.[1];
            const val = typeof col1 === 'object' ? (col1?.value || col1?.displayvalue || '') : String(col1 || '');
            courses.add(val);
        });
        courses.forEach(c => console.log(`  - "${c}"`));

        // Usuarios con fecha de acceso
        console.log("\n=== USUARIOS CON ACCESO (no 'Nunca') ===");
        rows.forEach(row => {
            const col0 = row.columns?.[0];
            const col1 = row.columns?.[1];
            const col2 = row.columns?.[2];
            const user = typeof col0 === 'object' ? (col0?.value || col0?.displayvalue || '') : String(col0 || '');
            const course = typeof col1 === 'object' ? (col1?.value || col1?.displayvalue || '') : String(col1 || '');
            const date = typeof col2 === 'object' ? (col2?.value || col2?.displayvalue || '') : String(col2 || '');
            if (date && !date.toLowerCase().includes('nunca') && !date.toLowerCase().includes('never')) {
                console.log(`  ${user} | ${course} | ${date}`);
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

diagnose();
