
import { RxJsonSchema } from 'rxdb';

export const employeeSchema: RxJsonSchema<any> = {
    title: 'employee',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        pin: { type: 'string' }, // Will be encrypted via DB password
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

export const timeRecordSchema: RxJsonSchema<any> = {
    title: 'time_record',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        employeeId: { type: 'string' },
        locationId: { type: 'string' },
        clockIn: { type: 'string', format: 'date-time' }, // RxDB stores dates as ISO strings
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

export const locationSchema: RxJsonSchema<any> = {
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

export const departmentSchema: RxJsonSchema<any> = {
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

export const settingsSchema: RxJsonSchema<any> = {
    title: 'settings',
    version: 0,
    primaryKey: 'id', // Singleton, usually 'GLOBAL_SETTINGS'
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        logoUrl: { type: 'string' },
        weekStartDay: { type: 'number' }
    },
    required: ['id']
};
