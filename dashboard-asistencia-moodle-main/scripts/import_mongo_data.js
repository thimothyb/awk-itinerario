#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

dotenv.config();

const parseArgs = (argv) => {
  const args = {
    fromDir: '',
    collections: [],
    clean: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from-dir' && argv[i + 1]) {
      args.fromDir = argv[i + 1];
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
    if (arg === '--no-clean') {
      args.clean = false;
    }
  }

  return args;
};

const getCollectionFiles = (fromDir, requestedCollections) => {
  const files = fs
    .readdirSync(fromDir)
    .filter((name) => name.endsWith('.ejson'))
    .sort();

  const collectionNames = files.map((name) => name.replace(/\.ejson$/, ''));

  if (!requestedCollections.length) {
    return collectionNames.map((name) => ({
      name,
      filePath: path.join(fromDir, `${name}.ejson`),
    }));
  }

  return requestedCollections.map((name) => ({
    name,
    filePath: path.join(fromDir, `${name}.ejson`),
  }));
};

const readDocuments = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = EJSON.parse(raw, { relaxed: false });
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid dump format (array expected): ${filePath}`);
  }
  return parsed;
};

const main = async () => {
  const { fromDir, collections, clean } = parseArgs(process.argv.slice(2));
  if (!fromDir) {
    throw new Error('Missing --from-dir argument');
  }

  const sourceDir = path.resolve(fromDir);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Directory not found: ${sourceDir}`);
  }

  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'moodle_logs_db';
  const dumps = getCollectionFiles(sourceDir, collections);

  if (!dumps.length) {
    throw new Error(`No .ejson files found in ${sourceDir}`);
  }

  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);

    for (const dump of dumps) {
      const docs = readDocuments(dump.filePath);
      const col = db.collection(dump.name);

      if (clean) {
        await col.deleteMany({});
      }

      if (docs.length > 0) {
        await col.insertMany(docs, { ordered: false });
      }

      console.log(
        `Imported ${dump.name}: ${docs.length} docs${clean ? ' (cleaned first)' : ''}`,
      );
    }

    console.log(`Import completed into DB: ${dbName}`);
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
