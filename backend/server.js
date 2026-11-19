require('dotenv').config();

const dns = require('node:dns');
const http = require('node:http');
const mongoose = require('mongoose');
const app = require('./src/app');
const { createChatSocketServer } = require('./src/realtime/chatSocket');

const dnsServers = (process.env.MONGODB_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'FIREBASE_PROJECT_ID'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

const port = Number(process.env.PORT) || 5000;
const server = http.createServer(app);
const io = createChatSocketServer(server);
app.set('io', io);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const migratedListings = await require('./src/models/Accommodation').migrateLegacyPhotos();
    if (migratedListings > 0) {
      console.log(`Migrated property images for ${migratedListings} listings.`);
    }
    server.listen(port, () => {
      console.log(`BashaBondhu API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Could not prepare the MongoDB database:', error.message);
    process.exitCode = 1;
  });
