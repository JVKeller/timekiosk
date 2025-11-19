
import { 
    createRxDatabase, 
    RxDatabase, 
    RxCollection,
    addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { replicateCouchDB, RxCouchDBReplicationState } from 'rxdb/plugins/replication-couchdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import * as schemas from './schemas';

// --- Plugins ---
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

let dbPromise: Promise<TimeKioskDatabase> | null = null;
// Track active replication states to allow cancellation
const activeReplications: RxCouchDBReplicationState<any>[] = [];

// --- Environment Detection ---
const isNode = typeof window === 'undefined';
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

const getStorage = () => {
    let baseStorage;
    if (isNode) {
        console.log('Initializing DB in Node environment (Memory)');
        baseStorage = getRxStorageMemory();
    } else {
        console.log('Initializing DB in Browser/Mobile environment (Dexie/IndexedDB)');
        baseStorage = getRxStorageDexie();
    }

    // WARNING: In production, use a secure key management strategy
    return wrappedKeyEncryptionCryptoJsStorage({
        storage: baseStorage
    });
};

const createDatabase = async (): Promise<TimeKioskDatabase> => {
    const db = await createRxDatabase<TimeKioskCollections>({
        name: 'timekioskdb',
        storage: getStorage(),
        password: 'my-secret-encryption-password',
        multiInstance: !isCapacitor,
        ignoreDuplicate: true
    });

    await db.addCollections({
        employees: { schema: schemas.employeeSchema },
        timerecords: { schema: schemas.timeRecordSchema },
        locations: { schema: schemas.locationSchema },
        departments: { schema: schemas.departmentSchema },
        settings: { schema: schemas.settingsSchema }
    });

    // --- Sync Setup ---
    (db as any).sync = async (remoteUrl: string) => {
        if (!remoteUrl) return;

        // 1. Cancel existing replications to prevent leaks/duplicates
        await Promise.all(activeReplications.map(rep => rep.cancel()));
        activeReplications.length = 0;

        const collectionNames: (keyof TimeKioskCollections)[] = [
            'employees', 'timerecords', 'locations', 'departments', 'settings'
        ];
        
        // 2. Remove trailing slash from URL if present
        const sanitizedUrl = remoteUrl.replace(/\/+$/, '');

        collectionNames.forEach(colName => {
            const collection = db.collections[colName];
            if (collection) {
                const replicationState = replicateCouchDB({
                    replicationIdentifier: `sync-${colName}`,
                    collection: collection,
                    url: `${sanitizedUrl}/${colName}`,
                    live: true,
                    pull: {}, // Pull all documents
                    push: {}  // Push all local changes
                });
                
                // Log errors for debugging
                replicationState.error$.subscribe(err => {
                    console.error(`Replication error (${colName}):`, err);
                });

                activeReplications.push(replicationState);
            }
        });
        console.log(`Sync started with ${sanitizedUrl}`);
    };

    return db;
};

export const getDatabase = () => {
    if (!dbPromise) {
        dbPromise = createDatabase();
    }
    return dbPromise;
};
