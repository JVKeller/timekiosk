
export interface Employee {
  id: string;
  name: string;
  pin: string;
  imageUrl?: string;
  archived?: boolean;
  autoDeductLunch?: boolean;
  locationId?: string;
  departmentId?: string;
  isTemp?: boolean;
  tempAgency?: string;
}

export interface TimeRecord {
  id:string;
  employeeId: string;
  locationId: string;
  clockIn: Date;
  clockOut?: Date;
  breaks?: { start: Date; end?: Date }[];
}

export interface Location {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface AppSettings {
  logoUrl?: string;
  weekStartDay: number; // 0 = Sunday, 1 = Monday, etc.
  remoteDbUrl?: string; // URL for CouchDB Sync
}

export enum ClockStatus {
  ClockedIn = 'ClockedIn',
  ClockedOut = 'ClockedOut',
  OnBreak = 'OnBreak',
}

export type View = 'HOME' | 'SCANNING' | 'PIN_ENTRY' | 'STATUS' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'PIN_SELECTION' | 'EMPLOYEE_TIMECARD' | 'CONFIRMATION';
