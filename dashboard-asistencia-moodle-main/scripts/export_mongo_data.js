#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

dotenv.config();

const DEFAULT_COLLECTIONS = [
  'asistencia',
  'registeredCourses',
  'attendanceSettings',
  'users',
];

const parseArgs = (argv) => {
  const args = {
    outDir: '',
    collections: DEFAULT_COLLECTIONS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-dir' && argv[i + 1]) {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--collections' && argv[i + 1]) {
      args.collections = argv[i + 1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
  }

  return args;
};

const buildDefaultOutDir = () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(process.cwd(), 'mongo-exports', `export-${ts}`);
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeCollectionDump = async (db, collectionName, outDir, availableSet) => {
  if (!availableSet.has(collectionName)) {
    const emptyFile = path.join(outDir, `${collectionName}.ejson`);
    fs.writeFileSync(emptyFile, '[]\n', 'utf8');
    return {
      name: collectionName,
      count: 0,
      file: `${collectionName}.ejson`,
      note: 'Collection was not present in DB at export time.',
    };
  }

  const docs = await db.collection(collectionName).find({}).toArray();
  const fileName = `${collectionName}.ejson`;
  const outFile = path.join(outDir, fileName);
  const content = EJSON.stringify(docs, null, 2, { relaxed: false });
  fs.writeFileSync(outFile, `${content}\n`, 'utf8');

  return {
    name: collectionName,
    count: docs.length,
    file: fileName,
  };
};

const main = async () => {
  const { outDir, collections } = parseArgs(process.argv.slice(2));
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'moodle_logs_db';
  const finalOutDir = outDir ? path.resolve(outDir) : buildDefaultOutDir();

  ensureDir(finalOutDir);

  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const availableCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    const availableSet = new Set(availableCollections.map((item) => item.name));

    const exported = [];
    for (const collectionName of collections) {
      const summary = await writeCollectionDump(db, collectionName, finalOutDir, availableSet);
      exported.push(summary);
      console.log(`Exported ${collectionName}: ${summary.count} docs`);
    }

    const metadata = {
      exportedAt: new Date().toISOString(),
      dbName,
      collections: exported,
    };

    fs.writeFileSync(
      path.join(finalOutDir, 'metadata.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf8',
    );

    console.log(`Export completed in: ${finalOutDir}`);
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error(`Export failed: ${error.message}`);
  process.exit(1);
});
