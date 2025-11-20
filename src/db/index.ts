
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
import { RxDBDevModePlugin, disableWarnings } from 'rxdb/plugins/dev-mode';
import CryptoJS from 'crypto-js';
import { BehaviorSubject } from 'rxjs';
import * as schemas from './schemas';

// --- Plugins ---
addRxPlugin(RxDBDevModePlugin);
disableWarnings(); 

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
// Global status observable
export const syncStatus$ = new BehaviorSubject<{ status: 'disconnected'|'connecting'|'connected'|'error', error?: string }>({ status: 'disconnected' });

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
        // Disconnect existing
        await Promise.all(activeReplications.map(rep => rep.cancel()));
        activeReplications.length = 0;

        if (!remoteUrl) {
            syncStatus$.next({ status: 'disconnected' });
            return;
        }

        console.log(`Initializing Sync with: ${remoteUrl}`);
        syncStatus$.next({ status: 'connecting' });

        const collectionNames: (keyof TimeKioskCollections)[] = [
            'employees', 'timerecords', 'locations', 'departments', 'settings'
        ];
        
        // Ensure clean base URL without trailing slash for processing
        const baseUrl = remoteUrl.replace(/\/+$/, '');

        let activeCount = 0;

        collectionNames.forEach(colName => {
            const collection = db.collections[colName];
            if (collection) {
                // Fix RC_COUCHDB_1: Ensure URL ends with a slash
                const url = `${baseUrl}/${colName}/`;

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
                    // Only report error if we aren't already connected/connecting elsewhere
                    if (syncStatus$.value.status !== 'connected') {
                         syncStatus$.next({ status: 'error', error: err.message || 'Connection Failed' });
                    }
                });

                // If we receive data, consider it connected
                replicationState.received$.subscribe(() => {
                     if (syncStatus$.value.status !== 'connected') {
                        syncStatus$.next({ status: 'connected' });
                     }
                });

                activeCount++;
                activeReplications.push(replicationState);
            }
        });

        if(activeCount > 0) {
             // Assume connected after a short delay if no errors occur immediately
             setTimeout(() => {
                 if (syncStatus$.value.status === 'connecting') {
                     syncStatus$.next({ status: 'connected' });
                 }
             }, 3000);
        }
    };

    // Expose wipe function
    (db as any).wipe = async () => {
        await db.remove();
        window.location.reload();
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
