const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'moodle_logs_db';
const COURSE_ID = '24';
const DEFAULT_SHORTNAME = 'CURSO-24';
const SEED_SOURCE = 'manual_pdf_seed_v3';

const MANUAL_PERIOD_START = '2026-04-27';
const MANUAL_PERIOD_END = '2026-05-22';
const MANUAL_CAPTURE_WEEK_START = '2026-05-11';
const MANUAL_CAPTURE_WEEK_END = '2026-05-15';
const DESERTER_CUTOFF_DATE = '2026-05-08';
const HOLIDAY_DATES = ['2026-05-04', '2026-05-13'];

const students = [
  { usuario: 'laura.garcia', nombre: 'Laura García', dni: '46789213T', groupName: 'Grupo A', profile: 'excelente' },
  { usuario: 'carlos.martin', nombre: 'Carlos Martín', dni: '50211867R', groupName: 'Grupo A', profile: 'excelente' },
  { usuario: 'marta.ruiz', nombre: 'Marta Ruiz', dni: '71902485M', groupName: 'Grupo A', profile: 'regular' },
  { usuario: 'david.lopez', nombre: 'David López', dni: '38415792K', groupName: 'Grupo A', profile: 'regular' },
  { usuario: 'ana.torres', nombre: 'Ana Torres', dni: '61120984P', groupName: 'Grupo B', profile: 'excelente' },
  { usuario: 'jorge.santos', nombre: 'Jorge Santos', dni: '43017655L', groupName: 'Grupo B', profile: 'regular' },
  { usuario: 'elena.navarro', nombre: 'Elena Navarro', dni: '55423310N', groupName: 'Grupo B', profile: 'regular' },
  { usuario: 'pablo.castro', nombre: 'Pablo Castro', dni: '29364018H', groupName: 'Grupo B', profile: 'desertor' },
  { usuario: 'lucia.mendez', nombre: 'Lucía Méndez', dni: '67813459Z', groupName: 'Grupo C', profile: 'excelente' },
  { usuario: 'sergio.vera', nombre: 'Sergio Vera', dni: '74091582J', groupName: 'Grupo C', profile: 'regular' },
  { usuario: 'noelia.romero', nombre: 'Noelia Romero', dni: '32177864C', groupName: 'Grupo C', profile: 'desertor' },
  { usuario: 'adrian.perez', nombre: 'Adrián Pérez', dni: '58930041S', groupName: 'Grupo C', profile: 'regular' }
];

const profileConfig = {
  excelente: {
    absenceRate: 0.03,
    lateRate: 0.12,
    minMinutes: 166,
    maxMinutes: 185
  },
  regular: {
    absenceRate: 0.12,
    lateRate: 0.30,
    minMinutes: 132,
    maxMinutes: 170
  },
  desertor: {
    absenceRate: 0.0,
    lateRate: 0.7,
    minMinutes: 70,
    maxMinutes: 105
  }
};

const JUSTIFIED_REASONS = [
  'Cita médica',
  'Gestión administrativa oficial',
  'Responsabilidad familiar justificada'
];

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`);
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function getBusinessDaysBetween(startDateStr, endDateStr) {
  const out = [];
  const current = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      out.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return out;
}

function buildManualCases() {
  return {
    holidayDates: HOLIDAY_DATES,
    justifiedAbsencesByUser: {
      'marta.ruiz': ['2026-05-12'],
      'jorge.santos': ['2026-05-15'],
      'sergio.vera': ['2026-05-06'],
      'adrian.perez': ['2026-05-14']
    },
    deserterAttendanceByUser: {
      'pablo.castro': ['2026-04-28', '2026-05-05', '2026-05-07'],
      'noelia.romero': ['2026-04-29', '2026-05-06', '2026-05-08']
    }
  };
}

function buildStudentDocument(student, days, courseShortname, manualCases) {
  const config = profileConfig[student.profile] || profileConfig.regular;
  const random = mulberry32(hashString(`${student.usuario}-${SEED_SOURCE}`));
  const holidaySet = new Set(manualCases.holidayDates);
  const justifiedSet = new Set(manualCases.justifiedAbsencesByUser[student.usuario] || []);
  const deserterAttendanceSet = new Set(manualCases.deserterAttendanceByUser[student.usuario] || []);

  const diasDetalle = [];
  const ausenciasJustificadas = [];
  let minutosTotales = 0;

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const dayDate = days[dayIndex];
    const fecha = toDateStr(dayDate);

    if (holidaySet.has(fecha)) continue;

    if (justifiedSet.has(fecha)) {
      ausenciasJustificadas.push({
        fecha,
        motivo: JUSTIFIED_REASONS[dayIndex % JUSTIFIED_REASONS.length]
      });
      continue;
    }

    if (student.profile === 'desertor') {
      if (fecha > DESERTER_CUTOFF_DATE) continue;
      if (!deserterAttendanceSet.has(fecha)) continue;
    }

    if (random() < config.absenceRate) continue;

    const lateMinutes = random() < config.lateRate ? Math.floor(random() * 28) + 4 : Math.floor(random() * 8);
    const entradaTotal = (9 * 60) + lateMinutes;
    const minutos = Math.floor(config.minMinutes + random() * ((config.maxMinutes - config.minMinutes) + 1));
    const salidaTotal = entradaTotal + minutos;

    const entrada = formatTime(entradaTotal);
    const salida = formatTime(salidaTotal);

    diasDetalle.push({
      fecha,
      minutos,
      entrada,
      salida,
      firstTs: new Date(`${fecha}T${entrada}:00`).getTime(),
      lastTs: new Date(`${fecha}T${salida}:00`).getTime()
    });

    minutosTotales += minutos;
  }

  return {
    usuario: student.usuario,
    nombre: student.nombre,
    dni: student.dni,
    groupName: student.groupName,
    perfilAsistencia: student.profile,
    courseId: COURSE_ID,
    courseShortname,
    minutosTotales,
    diasDetalle,
    ausenciasJustificadas,
    isDemo: true,
    source: SEED_SOURCE,
    fechaProceso: new Date()
  };
}

async function upsertAttendanceSettings(settingsCol, firstDate, lastDate) {
  const uniqueGroups = [...new Set(students.map((student) => student.groupName))];
  const now = new Date();

  for (const groupName of uniqueGroups) {
    await settingsCol.updateOne(
      { courseId: COURSE_ID, groupId: groupName },
      {
        $set: {
          courseId: COURSE_ID,
          groupId: groupName,
          groupName,
          startDate: parseDate(firstDate),
          endDate: parseDate(lastDate),
          scheduleTime: '09:00 - 12:30',
          holidays: HOLIDAY_DATES,
          minMinutesPerDay: 170,
          globalAttendancePercent: 80,
          schedule: [],
          isDemo: true,
          source: SEED_SOURCE,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }
}

async function seedCourse24() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const asistenciaCol = db.collection('asistencia');
    const coursesCol = db.collection('registeredCourses');
    const settingsCol = db.collection('attendanceSettings');

    const course = await coursesCol.findOne({ courseId: Number(COURSE_ID) });
    const courseShortname = course?.shortname || DEFAULT_SHORTNAME;

    const businessDays = getBusinessDaysBetween(MANUAL_PERIOD_START, MANUAL_PERIOD_END);
    const manualCases = buildManualCases();
    const docs = students.map((student) => buildStudentDocument(student, businessDays, courseShortname, manualCases));

    await asistenciaCol.deleteMany({
      courseId: COURSE_ID,
      isDemo: true
    });

    const result = await asistenciaCol.insertMany(docs);
    const totalDaysLoaded = docs.reduce((acc, item) => acc + item.diasDetalle.length, 0);
    const totalJustifiedAbsences = docs.reduce((acc, item) => acc + (item.ausenciasJustificadas?.length || 0), 0);
    const deserters = docs
      .filter((item) => item.perfilAsistencia === 'desertor')
      .map((item) => item.nombre)
      .join(', ');

    await upsertAttendanceSettings(settingsCol, MANUAL_PERIOD_START, MANUAL_PERIOD_END);

    console.log(`✅ Seed completado para curso ${COURSE_ID}`);
    console.log(`👥 Alumnos insertados: ${result.insertedCount}`);
    console.log(`📅 Registros diarios insertados: ${totalDaysLoaded}`);
    console.log(`🧾 Ausencias justificadas cargadas: ${totalJustifiedAbsences}`);
    console.log(`🏖️ Feriados configurados: ${HOLIDAY_DATES.join(', ')}`);
    console.log(`🚨 Desertores simulados: ${deserters}`);
    console.log(`🖼️ Semana recomendada para capturas: ${MANUAL_CAPTURE_WEEK_START} a ${MANUAL_CAPTURE_WEEK_END}`);
  } catch (error) {
    console.error('❌ Error en seed_course24_manual:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedCourse24();