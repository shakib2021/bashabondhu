require('dotenv').config();

const dns = require('node:dns');
const mongoose = require('mongoose');
const app = require('./src/app');

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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`BashaBondhu API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exitCode = 1;
  });
