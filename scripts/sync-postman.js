// scripts/sync-postman.js
const axios = require('axios');
const converter = require('openapi-to-postmanv2');
require('dotenv').config();

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const POSTMAN_WORKSPACE_ID = process.env.POSTMAN_WORKSPACE_ID;
const COLLECTION_NAME = 'Chat API';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const SWAGGER_URL = `${BASE_URL}/docs-json`;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function fetchSwagger() {
  console.log(`📡 Fetching Swagger JSON from ${SWAGGER_URL}...`);
  const response = await axios.get(SWAGGER_URL);
  return response.data;
}

function convertSwaggerToPostman(swaggerJson) {
  return new Promise((resolve, reject) => {
    converter.convert(
      { type: 'json', data: swaggerJson },
      { collectionName: COLLECTION_NAME, folderStrategy: 'Tags' },
      (err, result) => {
        if (err || !result.result) return reject(err || result.reason);
        resolve(result.output[0].data);
      }
    );
  });
}

async function getExistingCollections() {
  try {
    const response = await axios.get(
      `https://api.getpostman.com/collections?workspace=${POSTMAN_WORKSPACE_ID}`,
      { headers: { 'X-Api-Key': POSTMAN_API_KEY } }
    );
    return response.data.collections;
  } catch (err) {
    console.warn('⚠️ Could not fetch existing collections:', err.response?.status, err.response?.statusText);
    return [];
  }
}

async function createOrUpdateCollection(postmanCollection) {
  const existingCollections = await getExistingCollections();
  const existing = existingCollections.find(c => c.name === COLLECTION_NAME);

  if (dryRun) {
    console.log('⚡ Dry run mode enabled. Postman collection will NOT be updated.');
    console.log(existing ? `🔄 Collection "${COLLECTION_NAME}" would be updated.` : `📄 Collection "${COLLECTION_NAME}" would be created.`);
    return;
  }

  if (existing) {
    console.log(existing.uid)
    const url = `https://api.getpostman.com/collections/${existing.uid}`;
    console.log('🔄 Updating existing collection...');

    try {
      await axios.put(
        url,
        { collection: postmanCollection },
        { headers: { 'X-Api-Key': POSTMAN_API_KEY, 'Content-Type': 'application/json' } }
      );
      console.log('✅ Postman collection updated successfully!');
      return;
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn('⚠️ Existing collection not found. Deleting duplicates (if any)...');

        // delete all collections with the same name
        for (const coll of existingCollections.filter(c => c.name === COLLECTION_NAME)) {
          try {
            await axios.delete(
              `https://api.getpostman.com/collections/${coll.id}`,
              { headers: { 'X-Api-Key': POSTMAN_API_KEY } }
            );
            console.log(`🗑️ Deleted old collection with ID ${coll.id}`);
          } catch (delErr) {
            console.warn(`⚠️ Failed to delete collection ${coll.id}:`, delErr.response?.statusText);
          }
        }

        // console.log('📄 Creating new collection...');
        // await axios.post(
        //   `https://api.getpostman.com/collections`,
        //   { collection: postmanCollection },
        //   { headers: { 'X-Api-Key': POSTMAN_API_KEY, 'Content-Type': 'application/json' } }
        // );
        // console.log('✅ New Postman collection created successfully!');
        return;
      }
      console.error('❌ Failed to update collection:', err.response?.status, err.response?.statusText, err.response?.data);
      process.exit(1);
    }
  } else {
    console.log('📄 Creating new collection...');
    await axios.post(
      `https://api.getpostman.com/collections`,
      { collection: postmanCollection },
      { headers: { 'X-Api-Key': POSTMAN_API_KEY, 'Content-Type': 'application/json' } }
    );
    console.log('✅ New Postman collection created successfully!');
  }
}

(async () => {
  try {
    console.log('🚀 Starting Postman collection sync...');
    console.log('🔑 Using API Key:', POSTMAN_API_KEY.slice(0, 8) + '...');
    console.log('🏢 Using Workspace ID:', POSTMAN_WORKSPACE_ID);
    console.log('🌐 Using Base URL:', BASE_URL);

    const swaggerJson = await fetchSwagger();
    console.log('✅ Swagger JSON fetched successfully');

    const postmanCollection = await convertSwaggerToPostman(swaggerJson);
    console.log('✅ Conversion to Postman collection completed');

    await createOrUpdateCollection(postmanCollection);
  } catch (err) {
    console.error('❌ Postman sync failed:', err);
    process.exit(1);
  }
})();
