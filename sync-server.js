
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const PouchDB = require('pouchdb');
const ExpressPouchDB = require('express-pouchdb');
const cors = require('cors');
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

// Fix: Maximal permissive CORS for local network sync
// We use a function for origin to dynamically allow the requesting origin
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true); 
    },
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept', 'Origin']
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

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
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
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
