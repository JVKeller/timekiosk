import { RxJsonSchema } from 'rxdb';

// Storage-level encryption is enabled in index.ts (wrappedKeyEncryptionCryptoJsStorage).
// Field-level 'encrypted: true' flags are removed to prevent plugin dependency errors.

export const employeeSchema: any = {
    title: 'employee',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        pin: { type: 'string' },
        imageUrl: { type: 'string' },
        archived: { type: 'boolean' },
        autoDeductLunch: { type: 'boolean' },
        locationId: { type: 'string' },
        departmentId: { type: 'string' },
        isTemp: { type: 'boolean' },
        tempAgency: { type: 'string' }
    },
    required: ['id', 'name', 'pin']
};

export const timeRecordSchema: any = {
    title: 'time_record',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        employeeId: { type: 'string', maxLength: 100 },
        locationId: { type: 'string' },
        clockIn: { type: 'string', format: 'date-time' }, 
        clockOut: { type: 'string', format: 'date-time' },
        breaks: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    required: ['id', 'employeeId', 'clockIn'],
    indexes: ['employeeId']
};

export const locationSchema: any = {
    title: 'location',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        abbreviation: { type: 'string' }
    },
    required: ['id', 'name']
};

export const departmentSchema: any = {
    title: 'department',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' }
    },
    required: ['id', 'name']
};

export const settingsSchema: any = {
    title: 'settings',
    version: 0,
    primaryKey: 'id', 
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        logoUrl: { type: 'string' },
        weekStartDay: { type: 'number' },
        remoteDbUrl: { type: 'string' }
    },
    required: ['id']
};