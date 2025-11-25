

import {
    createRxDatabase,
    RxDatabase,
    RxCollection,
    addRxPlugin
} from 'rxdb';
import { replicateCouchDB, RxCouchDBReplicationState } from 'rxdb/plugins/replication-couchdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBDevModePlugin, disableWarnings } from 'rxdb/plugins/dev-mode';
import CryptoJS from 'crypto-js';
import { BehaviorSubject } from 'rxjs';
import * as schemas from './schemas';
import { getPlatformStorage } from './storage';

addRxPlugin(RxDBDevModePlugin);
disableWarnings();

addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type TimeKioskCollections = {
    employees: RxCollection;
    timerecords: RxCollection;
    locations: RxCollection;
    departments: RxCollection;
    settings: RxCollection;
}

export type TimeKioskDatabase = RxDatabase<TimeKioskCollections>;

const activeReplications: RxCouchDBReplicationState<any>[] = [];
export const syncStatus$ = new BehaviorSubject<{ status: 'disconnected' | 'connecting' | 'connected' | 'error', error?: string }>({ status: 'disconnected' });

const createDatabase = async (): Promise<TimeKioskDatabase> => {
    const dbName = 'timekioskdb_v8';

    const db = await createRxDatabase<TimeKioskCollections>({
        name: dbName,
        storage: getPlatformStorage(),
        password: 'my-secret-encryption-password',
        multiInstance: true,
        ignoreDuplicate: true,
        hashFunction: (input: string) => {
            return Promise.resolve(CryptoJS.SHA256(input).toString());
        }
    });

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

        const baseUrl = remoteUrl.replace(/\/+$/, '');

        collectionNames.forEach(colName => {
            const collection = db.collections[colName];
            if (collection) {
                const url = `${baseUrl}/${colName}/`;

                const replicationState = replicateCouchDB({
                    replicationIdentifier: `sync-${colName}`,
                    collection: collection,
                    url: url,
                    live: true,
                    retryTime: 5000,
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
                    if (syncStatus$.value.status !== 'connected') {
                        syncStatus$.next({ status: 'error', error: err.message || 'Connection Failed' });
                    }
                });

                // If we receive data, we are definitely connected
                replicationState.received$.subscribe(() => {
                    if (syncStatus$.value.status !== 'connected') {
                        syncStatus$.next({ status: 'connected' });
                    }
                });

                // If we push data successfully, we are definitely connected
                replicationState.sent$.subscribe(() => {
                    if (syncStatus$.value.status !== 'connected') {
                        syncStatus$.next({ status: 'connected' });
                    }
                });

                activeReplications.push(replicationState);
            }
        });

        // If after 2 seconds we haven't errored, assume connected (optimistic)
        // Real connection confirmation comes from events above
        setTimeout(() => {
            if (syncStatus$.value.status === 'connecting') {
                // Don't force 'connected' blindly, but if we are active without error, it's a good sign
                syncStatus$.next({ status: 'connected' });
            }
        }, 2500);
    };

    (db as any).wipe = async () => {
        await db.remove();
        window.location.reload();
    };

    return db;
};

const _window = typeof window !== 'undefined' ? (window as any) : {};
const DB_PROMISE_KEY = 'timekiosk_db_promise_v8';

export const getDatabase = () => {
    if (!_window[DB_PROMISE_KEY]) {
        _window[DB_PROMISE_KEY] = createDatabase();
    }
    return _window[DB_PROMISE_KEY] as Promise<TimeKioskDatabase>;
};
