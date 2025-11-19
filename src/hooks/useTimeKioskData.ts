
import { useState, useEffect, useRef } from 'react';
import { getDatabase, TimeKioskDatabase } from '../db';
import type { Employee, TimeRecord, Location, Department, AppSettings } from '../types';
import { useMockData } from './useMockData'; // Fallback/Initial seed data

export const useTimeKioskData = () => {
    const [db, setDb] = useState<TimeKioskDatabase | null>(null);
    
    // State mirrors of DB data for React rendering
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [settings, setSettings] = useState<AppSettings>({ weekStartDay: 0, logoUrl: '' });
    const [loading, setLoading] = useState(true);

    const seedData = useMockData();

    // 1. Initialize DB
    useEffect(() => {
        const init = async () => {
            const _db = await getDatabase();
            setDb(_db);

            // --- Seeding Data (One time dev helper) ---
            // Check if data exists, if not, seed from mock data
            const empCount = await _db.employees.count().exec();
            if (empCount === 0) {
                console.log("Seeding Database...");
                await _db.employees.bulkInsert(seedData.employees);
                
                // Convert Dates to ISO strings for RxDB
                const records = seedData.timeRecords.map(r => ({
                    ...r,
                    clockIn: r.clockIn.toISOString(),
                    clockOut: r.clockOut ? r.clockOut.toISOString() : undefined,
                    breaks: r.breaks?.map(b => ({
                        start: b.start.toISOString(),
                        end: b.end ? b.end.toISOString() : undefined
                    }))
                }));
                await _db.timerecords.bulkInsert(records);
                await _db.locations.bulkInsert(seedData.locations);
                await _db.departments.bulkInsert(seedData.departments);
                await _db.settings.upsert({ id: 'GLOBAL_SETTINGS', ...seedData.settings });
            }
        };
        init();
    }, []);

    // 2. Subscriptions (Live Queries)
    useEffect(() => {
        if (!db) return;

        const subEmployees = db.employees.find().$.subscribe(docs => {
            setEmployees(docs.map(d => d.toJSON()) as Employee[]);
        });

        const subRecords = db.timerecords.find().$.subscribe(docs => {
            // Convert ISO strings back to Date objects for the App
            const parsedRecords = docs.map(d => {
                const json = d.toJSON();
                return {
                    ...json,
                    clockIn: new Date(json.clockIn),
                    clockOut: json.clockOut ? new Date(json.clockOut) : undefined,
                    breaks: json.breaks?.map((b: any) => ({
                        start: new Date(b.start),
                        end: b.end ? new Date(b.end) : undefined
                    }))
                };
            });
            setTimeRecords(parsedRecords as TimeRecord[]);
        });

        const subLocations = db.locations.find().$.subscribe(docs => {
            setLocations(docs.map(d => d.toJSON()) as Location[]);
        });

        const subDepartments = db.departments.find().$.subscribe(docs => {
            setDepartments(docs.map(d => d.toJSON()) as Department[]);
        });

        const subSettings = db.settings.findOne('GLOBAL_SETTINGS').$.subscribe(doc => {
            if (doc) {
                const s = doc.toJSON();
                setSettings({ logoUrl: s.logoUrl, weekStartDay: s.weekStartDay });
            }
        });

        setLoading(false);

        return () => {
            subEmployees.unsubscribe();
            subRecords.unsubscribe();
            subLocations.unsubscribe();
            subDepartments.unsubscribe();
            subSettings.unsubscribe();
        };
    }, [db]);

    // --- Actions ---

    const addEmployee = async (emp: Employee) => {
        await db?.employees.insert(emp);
    };

    const updateEmployee = async (emp: Employee) => {
        // RxDB requires fetching the document then updating, or using upsert
        const doc = await db?.employees.findOne(emp.id).exec();
        if (doc) {
            await doc.patch(emp);
        }
    };

    const archiveEmployee = async (id: string) => {
        const doc = await db?.employees.findOne(id).exec();
        await doc?.patch({ archived: true });
    };

    const unarchiveEmployee = async (id: string) => {
        const doc = await db?.employees.findOne(id).exec();
        await doc?.patch({ archived: false });
    };
    
    const deleteEmployeePermanently = async (id: string) => {
        const doc = await db?.employees.findOne(id).exec();
        await doc?.remove();
        // Cascade delete records
        const records = await db?.timerecords.find({ selector: { employeeId: id } }).exec();
        if (records) await Promise.all(records.map(r => r.remove()));
    };

    const addTimeRecord = async (record: Omit<TimeRecord, 'id'|'locationId'> & {locationId: string}) => {
        const newRecord = {
            ...record,
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clockIn: record.clockIn.toISOString(),
            clockOut: record.clockOut ? record.clockOut.toISOString() : undefined,
            breaks: []
        };
        await db?.timerecords.insert(newRecord);
    };

    const updateTimeRecord = async (record: TimeRecord) => {
        const doc = await db?.timerecords.findOne(record.id).exec();
        if (doc) {
            await doc.patch({
                ...record,
                clockIn: record.clockIn.toISOString(),
                clockOut: record.clockOut ? record.clockOut.toISOString() : undefined,
                breaks: record.breaks?.map(b => ({
                    start: b.start.toISOString(),
                    end: b.end ? b.end.toISOString() : undefined
                }))
            });
        }
    };
    
    const deleteTimeRecord = async (id: string) => {
        const doc = await db?.timerecords.findOne(id).exec();
        await doc?.remove();
    };

    const updateLocations = async (newLocations: Location[]) => {
        // Full sync approach for simple lists: remove all, add all (or smart diff)
        // For simplicity in this migration:
        // In a real app, individual add/remove/update is better
        // Here we just upsert individually
        if (!db) return;
        // Find deleted
        const currentIds = locations.map(l => l.id);
        const newIds = newLocations.map(l => l.id);
        const toDelete = currentIds.filter(id => !newIds.includes(id));
        
        for (const id of toDelete) {
            const doc = await db.locations.findOne(id).exec();
            await doc?.remove();
        }
        
        for (const loc of newLocations) {
            await db.locations.upsert(loc);
        }
    };

    const updateDepartments = async (newDepartments: Department[]) => {
        if (!db) return;
        const currentIds = departments.map(l => l.id);
        const newIds = newDepartments.map(l => l.id);
        const toDelete = currentIds.filter(id => !newIds.includes(id));
        
        for (const id of toDelete) {
            const doc = await db.departments.findOne(id).exec();
            await doc?.remove();
        }
        
        for (const dep of newDepartments) {
            await db.departments.upsert(dep);
        }
    };

    const updateSettings = async (newSettings: AppSettings) => {
        await db?.settings.upsert({ id: 'GLOBAL_SETTINGS', ...newSettings });
    };

    const sync = (url: string) => {
        if(db && (db as any).sync) {
            (db as any).sync(url);
        }
    }

    return {
        employees,
        timeRecords,
        locations,
        departments,
        settings,
        loading,
        actions: {
            addEmployee,
            updateEmployee,
            archiveEmployee,
            unarchiveEmployee,
            deleteEmployeePermanently,
            addTimeRecord,
            updateTimeRecord,
            deleteTimeRecord,
            updateLocations,
            updateDepartments,
            updateSettings,
            sync
        }
    };
};
