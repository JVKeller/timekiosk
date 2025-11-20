
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const PouchDB = require('pouchdb');
const ExpressPouchDB = require('express-pouchdb');
const fs = require('fs');
const os = require('os');

// Ensure the data directory exists
if (!fs.existsSync('./db-data')) {
    fs.mkdirSync('./db-data');
}

// Initialize PouchDB with a local file adapter
const InNodePouchDB = PouchDB.defaults({
    prefix: './db-data/'
});

const app = express();

// MANUAL CORS MIDDLEWARE
// This is required because PouchDB Sync uses specific headers and credentials.
// When credentials=true, Origin cannot be '*'.
app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.host;
    
    // Allow the specific origin that is requesting
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin, Range');
    
    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Mount the PouchDB API (CouchDB compatible)
app.use('/db', ExpressPouchDB(InNodePouchDB, {
    mode: 'fullCouchDB',
    overrideMode: {
        include: ['routes/fauxton'] // Optional: Includes a UI at /db/_utils
    }
}));

const PORT = 5984;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
    // Get local IP address for convenience
    const nets = os.networkInterfaces();
    let ip = 'localhost';

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ip = net.address;
            }
        }
    }

    console.log(`
    🚀 Sync Server Running!
    -----------------------------------------
    Local:   http://localhost:${PORT}/db
    Network: http://${ip}:${PORT}/db
    -----------------------------------------
    1. On your tablets, go to Admin Panel -> Settings -> Data Synchronization.
    2. Enter the Network URL above (e.g. http://${ip}:${PORT}/db)
    `);
});
