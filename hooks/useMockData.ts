
import type { Employee, Location, TimeRecord, Department, AppSettings } from '../types';

const mockLocations: Location[] = [
  { id: 'LOC01', name: 'Main Office', abbreviation: 'HQ' },
  { id: 'LOC02', name: 'Warehouse B', abbreviation: 'WHB' },
  { id: 'LOC03', name: 'Downtown Branch', abbreviation: 'DTN' },
];

const mockDepartments: Department[] = [
  { id: 'DEP01', name: 'Administration' },
  { id: 'DEP02', name: 'Sales' },
  { id: 'DEP03', name: 'Logistics' },
  { id: 'DEP04', name: 'IT' },
];

const mockEmployees: Employee[] = [
  { id: 'HQ-001', name: 'Alice Johnson', pin: '1234', imageUrl: 'https://picsum.photos/seed/alice/200', archived: false, autoDeductLunch: true, locationId: 'LOC01', departmentId: 'DEP01', isTemp: false },
  { id: 'WHB-002', name: 'Bob Williams', pin: '5678', imageUrl: 'https://picsum.photos/seed/bob/200', archived: false, autoDeductLunch: false, locationId: 'LOC02', departmentId: 'DEP03', isTemp: false },
  { id: 'STF-003', name: 'Charlie Brown', pin: '9876', imageUrl: 'https://picsum.photos/seed/charlie/200', archived: false, autoDeductLunch: false, locationId: 'LOC01', departmentId: 'DEP02', isTemp: true, tempAgency: 'StaffingPro' },
  { id: 'DTN-004', name: 'Diana Miller', pin: '4321', imageUrl: 'https://picsum.photos/seed/diana/200', archived: false, autoDeductLunch: false, locationId: 'LOC03', departmentId: 'DEP04', isTemp: false },
];

const mockSettings: AppSettings = {
    logoUrl: '',
    weekStartDay: 0 // 0 = Sunday
};

const generateMockTimeRecords = (): TimeRecord[] => {
    const records: TimeRecord[] = [];
    const today = new Date();
    const activeEmployees = mockEmployees.filter(e => !e.archived);
    if (activeEmployees.length < 4) return [];

    const morningShiftEmployees = [activeEmployees[0].id, activeEmployees[1].id];
    const eveningShiftEmployees = [activeEmployees[2].id, activeEmployees[3].id];

    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const createRecord = (employeeId: string, clockInHour: number, clockInMinute: number, clockOutHour: number, clockOutMinute: number) => {
            const clockIn = new Date(date);
            const clockInRandomMinutes = Math.floor(Math.random() * 21) - 10;
            clockIn.setHours(clockInHour, clockInMinute + clockInRandomMinutes, 0, 0);

            const clockOut = new Date(date);
            const clockOutRandomMinutes = Math.floor(Math.random() * 21) - 10;
            clockOut.setHours(clockOutHour, clockOutMinute + clockOutRandomMinutes, 0, 0);
            
            const now = new Date();
            if (now < clockIn) return; // Don't generate future records
            const shouldBeClockedOut = now > clockOut;
            
            // Find employee's location to simulate correct location punch
            const emp = mockEmployees.find(e => e.id === employeeId);
            const locationId = emp?.locationId || mockLocations[0].id;

            records.push({
                id: `rec-${employeeId}-${date.getTime()}-${Math.random()}`,
                employeeId,
                locationId: locationId,
                clockIn,
                clockOut: shouldBeClockedOut ? clockOut : undefined,
            });
        };

        morningShiftEmployees.forEach(id => createRecord(id, 7, 0, 15, 30));
        eveningShiftEmployees.forEach(id => createRecord(id, 15, 0, 23, 0));
    }
    return records;
};

const mockTimeRecords = generateMockTimeRecords();


export const useMockData = () => {
  return { 
      employees: mockEmployees, 
      locations: mockLocations, 
      departments: mockDepartments,
      settings: mockSettings,
      timeRecords: mockTimeRecords 
  };
};
