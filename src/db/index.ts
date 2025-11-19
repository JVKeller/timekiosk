import { 
    createRxDatabase, 
    RxDatabase, 
    RxCollection,
    addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
// Use storage wrapper for encryption instead of the plugin
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { replicateCouchDB, RxCouchDBReplicationState } from 'rxdb/plugins/replication-couchdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import CryptoJS from 'crypto-js';
import * as schemas from './schemas';

// --- Plugins ---
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBUpdatePlugin);

// --- Types ---
export type TimeKioskCollections = {
    employees: RxCollection;
    timerecords: RxCollection;
    locations: RxCollection;
    departments: RxCollection;
    settings: RxCollection;
}

export type TimeKioskDatabase = RxDatabase<TimeKioskCollections>;

const activeReplications: RxCouchDBReplicationState<any>[] = [];

const isNode = typeof window === 'undefined';
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

const getStorage = () => {
    let baseStorage;
    if (isNode) {
        console.log('Initializing DB in Node environment (Memory)');
        baseStorage = getRxStorageMemory();
    } else {
        baseStorage = getRxStorageDexie();
    }

    // 1. Encrypt: Wrap the base storage to encrypt data writing to disk
    const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
        storage: baseStorage
    });

    // 2. Validate: Wrap the encrypted storage to validate data before encryption
    return wrappedValidateAjvStorage({
        storage: encryptedStorage
    });
};

const createDatabase = async (): Promise<TimeKioskDatabase> => {
    const dbName = 'timekioskdb_v8'; // Versioned name for fresh start

    const db = await createRxDatabase<TimeKioskCollections>({
        name: dbName,
        storage: getStorage(),
        password: 'my-secret-encryption-password',
        multiInstance: !isCapacitor,
        ignoreDuplicate: true,
        // Use CryptoJS for hashing in non-secure contexts (HTTP)
        hashFunction: (input: string) => {
            return Promise.resolve(CryptoJS.SHA256(input).toString());
        }
    });

    // Check if collections exist before adding (safe for re-runs)
    if (!db.collections.employees) {
        await db.addCollections({
            employees: { schema: schemas.employeeSchema },
            timerecords: { schema: schemas.timeRecordSchema },
            locations: { schema: schemas.locationSchema },
            departments: { schema: schemas.departmentSchema },
            settings: { schema: schemas.settingsSchema }
        });
    }

    (db as any).sync = async (remoteUrl: string) => {
        if (!remoteUrl) return;

        console.log(`Initializing Sync with: ${remoteUrl}`);

        // 1. Cancel existing replications
        await Promise.all(activeReplications.map(rep => rep.cancel()));
        activeReplications.length = 0;

        const collectionNames: (keyof TimeKioskCollections)[] = [
            'employees', 'timerecords', 'locations', 'departments', 'settings'
        ];
        
        const baseUrl = remoteUrl.replace(/\/+$/, '');

        collectionNames.forEach(colName => {
            const collection = db.collections[colName];
            if (collection) {
                const url = `${baseUrl}/${colName}`;

                const replicationState = replicateCouchDB({
                    replicationIdentifier: `sync-${colName}`,
                    collection: collection,
                    url: url,
                    live: true,
                    pull: {
                        batchSize: 60,
                        heartbeat: 60000
                    },
                    push: {
                        batchSize: 60
                    }
                });
                
                replicationState.error$.subscribe(err => {
                    console.error(`Replication error (${colName}):`, err);
                });

                activeReplications.push(replicationState);
            }
        });
    };

    return db;
};

// HMR-safe singleton pattern
const _window = typeof window !== 'undefined' ? (window as any) : {};
const DB_PROMISE_KEY = 'timekiosk_db_promise_v8';

export const getDatabase = () => {
    if (!_window[DB_PROMISE_KEY]) {
        _window[DB_PROMISE_KEY] = createDatabase();
    }
    return _window[DB_PROMISE_KEY] as Promise<TimeKioskDatabase>;
};