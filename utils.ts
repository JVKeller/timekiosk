
import type { TimeRecord } from './types';

// startDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export const getWeekStart = (d: Date, startDay: number = 0) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const currentDay = date.getDay();
    
    let diff = currentDay - startDay;
    if (diff < 0) {
        diff += 7;
    }
    
    date.setDate(date.getDate() - diff);
    return date;
};

export const calculateDuration = (record: TimeRecord) => {
    if (!record.clockOut) return { totalMs: 0, display: '-' };
    const clockInTime = new Date(record.clockIn).getTime();
    const clockOutTime = new Date(record.clockOut).getTime();
    const diff = clockOutTime - clockInTime;
    if (diff < 0) return { totalMs: 0, display: 'Invalid' };
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return {
        totalMs: diff,
        display: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
    };
};

export const formatTotalDuration = (totalMs: number) => {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    return `${hours} hours, ${minutes} minutes`;
};

export const formatShortDuration = (totalMs: number) => {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

export const formatDateTimeForInput = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}
  
export const parseDateTimeInput = (value: string | null | undefined) => {
    if (!value) return undefined;
    return new Date(value);
}
