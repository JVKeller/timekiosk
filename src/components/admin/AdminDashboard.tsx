import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Employee, Location, TimeRecord, Department, AppSettings } from '../../types';
import { getWeekStart, calculateDuration, formatDateTimeForInput, parseDateTimeInput, formatShortDuration } from '../../utils';
import TimecardView from './TimecardView';
import SettingsView from './SettingsView';
import ReportsView from './ReportsView';
import Modal from '../modals/Modal';
import ConfirmationModal from '../modals/ConfirmationModal';
import QrCodeModal from '../modals/QrCodeModal';
import UsersIcon from '../icons/UsersIcon';
import PlusIcon from '../icons/PlusIcon';
import ClockIcon from '../icons/ClockIcon';
import ArchiveIcon from '../icons/ArchiveIcon';
import RestoreIcon from '../icons/RestoreIcon';
import TrashIcon from '../icons/TrashIcon';
import LogoutIcon from '../icons/LogoutIcon';
import DownloadIcon from '../icons/DownloadIcon';
import EditIcon from '../icons/EditIcon';
import QrCodeIcon from '../icons/QrCodeIcon';
import SettingsIcon from '../icons/SettingsIcon';
import ReportsIcon from '../icons/ReportsIcon';
import EmployeeImage from '../EmployeeImage';

interface AdminDashboardProps {
    employees: Employee[];
    timeRecords: TimeRecord[];
    locations: Location[];
    departments: Department[];
    settings: AppSettings;
    onLogout: () => void;
    onUpdateEmployee: (employee: Employee) => void;
    onAddEmployee: (employee: Employee) => void;
    onArchiveEmployee: (employeeId: string) => void;
    onUnarchiveEmployee: (employeeId: string) => void;
    onDeleteEmployeePermanently: (employeeId: string) => void;
    onUpdateTimeRecord: (record: TimeRecord) => void;
    onDeleteTimeRecord: (recordId: string) => void;
    onAddTimeRecord: (record: Omit<TimeRecord, 'id'|'locationId'>) => void;
    onUpdateLocations: (locations: Location[]) => void;
    onUpdateDepartments: (departments: Department[]) => void;
    onUpdateSettings: (settings: AppSettings) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    employees, timeRecords, locations, departments, settings, onLogout, 
    onUpdateEmployee, onAddEmployee, onArchiveEmployee, onUnarchiveEmployee, 
    onDeleteEmployeePermanently, onUpdateTimeRecord, onDeleteTimeRecord, onAddTimeRecord,
    onUpdateLocations, onUpdateDepartments, onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState('employees');
  
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e.name])), [employees]);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Split name state for the modal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editEmployeeError, setEditEmployeeError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string|null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string|null>(null);
  const [archivingEmployeeId, setArchivingEmployeeId] = useState<string | null>(null);
  const [unarchivingEmployeeId, setUnarchivingEmployeeId] = useState<string | null>(null);
  const [showingQrCodeFor, setShowingQrCodeFor] = useState<Employee | null>(null);
  
  const activeEmployees = useMemo(() => employees.filter(e => !e.archived).sort((a,b) => a.name.localeCompare(b.name)), [employees]);
  const archivedEmployees = useMemo(() => employees.filter(e => e.archived).sort((a,b) => a.name.localeCompare(b.name)), [employees]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(activeEmployees.length > 0 ? activeEmployees[0].id : null);
  
  // Initialize with dynamic week start
  const [adminWeekStart, setAdminWeekStart] = useState<Date>(getWeekStart(new Date(), settings.weekStartDay));
  
  useEffect(() => {
      setAdminWeekStart(prev => {
          return getWeekStart(prev, settings.weekStartDay); 
      });
  }, [settings.weekStartDay]);

  const originalEditingEmployeeRef = useRef<Employee | null>(null);

  // Hardcoded Temp Agencies for Dropdown
  const tempAgencies = ['StaffingPro', 'WorkForce', 'TempStar', 'QuickHire'];

  useEffect(() => {
      const selectedIsArchived = employees.find(e => e.id === selectedEmployeeId)?.archived;
      if (selectedIsArchived && activeEmployees.length > 0) {
          setSelectedEmployeeId(activeEmployees[0].id);
      } else if (activeEmployees.length === 0 && selectedEmployeeId !== null) {
          setSelectedEmployeeId(null);
      }
  }, [employees, selectedEmployeeId, activeEmployees]);

  // Effect to handle ID Prefixing based on Location or Temp Agency
  useEffect(() => {
    if (isAddingMode && editingEmployee) {
        let prefix = '';

        if (editingEmployee.isTemp && editingEmployee.tempAgency) {
             prefix = editingEmployee.tempAgency.slice(0, 3).toUpperCase() + '-';
        } else if (!editingEmployee.isTemp) {
             const loc = locations.find(l => l.id === editingEmployee.locationId);
             if (loc && loc.abbreviation) {
                 prefix = loc.abbreviation + '-';
             }
        }

        if (prefix) {
            let currentId = editingEmployee.id;
            
            // Attempt to strip existing known prefixes to swap them
            for (const loc of locations) {
                if (currentId.startsWith(loc.abbreviation + '-')) {
                    currentId = currentId.slice(loc.abbreviation.length + 1);
                    break;
                }
            }
            for (const agency of tempAgencies) {
                 const agencyPrefix = agency.slice(0, 3).toUpperCase() + '-';
                 if (currentId.startsWith(agencyPrefix)) {
                     currentId = currentId.slice(agencyPrefix.length);
                     break;
                 }
            }

            if (!currentId.startsWith(prefix)) {
                setEditingEmployee(prev => prev ? ({ ...prev, id: prefix + currentId }) : null);
            }
        }
    }
  }, [editingEmployee?.locationId, editingEmployee?.isTemp, editingEmployee?.tempAgency, isAddingMode, locations]);
  
  const openEditEmployeeModal = (employee: Employee) => {
    originalEditingEmployeeRef.current = employee;
    setEditingEmployee(employee);
    const nameParts = employee.name.split(' ');
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.slice(1).join(' ') || '');
    setIsAddingMode(false);
    setEditEmployeeError(null);
  }

  const openAddEmployeeModal = () => {
    setEditingEmployee({ 
        id: '', 
        name: '', 
        pin: '', 
        imageUrl: '', 
        autoDeductLunch: true,
        locationId: locations[0]?.id || '',
        departmentId: departments[0]?.id || '',
        isTemp: false,
        tempAgency: tempAgencies[0]
    });
    setFirstName('');
    setLastName('');
    setIsAddingMode(true);
    setEditEmployeeError(null);
  }

  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const newId = editingEmployee.id.trim();
    if (!newId) {
        setEditEmployeeError("Employee ID cannot be empty.");
        return;
    }

    const isDuplicate = employees.some(emp => 
        emp.id === newId && (isAddingMode || emp.id !== originalEditingEmployeeRef.current?.id)
    );

    if (isDuplicate) {
        setEditEmployeeError("This Employee ID is already in use.");
        return;
    }
    
    const fullName = `${firstName} ${lastName}`.trim();
    const employeeToSave = { ...editingEmployee, name: fullName };

    if (isAddingMode) {
        onAddEmployee(employeeToSave);
    } else {
        onUpdateEmployee(employeeToSave);
        if (originalEditingEmployeeRef.current && originalEditingEmployeeRef.current.id !== newId) {
            timeRecords.forEach(r => {
                if (r.employeeId === originalEditingEmployeeRef.current!.id) {
                    onUpdateTimeRecord({...r, employeeId: newId});
                }
            });
        }
    }
    setEditingEmployee(null);
  };
  
  const handleSaveTimeRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord) return;
    onUpdateTimeRecord(editingRecord);
    setEditingRecord(null);
  }

  const selectedEmployeeForModal = employees.find(e => e.id === selectedEmployeeId);
  const handleAddNewTimeRecord = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const clockIn = parseDateTimeInput(formData.get('clockIn') as string);
      const clockOut = parseDateTimeInput(formData.get('clockOut') as string);

      if (clockIn && selectedEmployeeForModal) {
          onAddTimeRecord({ employeeId: selectedEmployeeForModal.id, clockIn, clockOut });
      }
      setIsAddingRecord(false);
  }

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWeekToCsv = (recordsForWeek: TimeRecord[], weekKey: string) => {
    const dailyHoursByEmployee: Record<string, Record<string, number>> = {};

    for (const record of recordsForWeek) {
        if (!dailyHoursByEmployee[record.employeeId]) {
            dailyHoursByEmployee[record.employeeId] = {};
        }
        const dayKey = new Date(record.clockIn).toISOString().split('T')[0];
        if (!dailyHoursByEmployee[record.employeeId][dayKey]) {
            dailyHoursByEmployee[record.employeeId][dayKey] = 0;
        }
        dailyHoursByEmployee[record.employeeId][dayKey] += calculateDuration(record).totalMs;
    }

    let csvContent = 'Date,Employee Name,Hours\n';
    const employeeDataMap = new Map(employees.map(e => [e.id, e]));

    const sortedEmployeeIds = Object.keys(dailyHoursByEmployee).sort((a,b) => (employeeDataMap.get(a)?.name || '').localeCompare(employeeDataMap.get(b)?.name || ''));

    for (const employeeId of sortedEmployeeIds) {
        const employee = employeeDataMap.get(employeeId);
        if (!employee) continue;
        
        const sortedDayKeys = Object.keys(dailyHoursByEmployee[employeeId]).sort();

        for (const dayKey of sortedDayKeys) {
            let totalMs = dailyHoursByEmployee[employeeId][dayKey];

            if (employee.autoDeductLunch && totalMs > 8 * 60 * 60 * 1000) {
                totalMs -= 30 * 60 * 1000;
            }
            
            const hours = totalMs / (1000 * 60 * 60);
            if (hours > 0) {
              csvContent += `${dayKey},"${employee.name}",${hours.toFixed(2)}\n`;
            }
        }
    }
    
    downloadCsv(csvContent, `payroll-week-of-${weekKey}.csv`);
  };
  
  const NavItem: React.FC<{ children: React.ReactNode; icon: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ children, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition ${isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-700'}`} style={{ fontSize: 'var(--step-1)'}}>
        {icon} {children}
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-900 text-white">
      {showingQrCodeFor && <QrCodeModal employee={showingQrCodeFor} onClose={() => setShowingQrCodeFor(null)} />}
      {editingEmployee && (
        <Modal onClose={() => setEditingEmployee(null)} title={isAddingMode ? 'Add Employee' : 'Edit Employee'}>
          <form onSubmit={handleSaveEmployee} className="space-y-4">
              {/* Employee ID */}
              <div>
                  <label className="block mb-1 text-slate-300 text-sm font-bold">Employee ID</label>
                  <input 
                    type="text" 
                    value={editingEmployee.id} 
                    onChange={e => setEditingEmployee({...editingEmployee, id: e.target.value})} 
                    className="w-full p-3 bg-slate-700 rounded-lg text-white text-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                    required
                  />
              </div>

              {/* First Name / Last Name */}
              <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block mb-1 text-slate-300 text-sm font-bold">First Name</label>
                    <input 
                        type="text" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)} 
                        className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none" 
                        required
                    />
                </div>
                <div className="flex-1">
                    <label className="block mb-1 text-slate-300 text-sm font-bold">Last Name</label>
                    <input 
                        type="text" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none" 
                        required
                    />
                </div>
              </div>

              {/* Location Row with Temp Service Logic */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex-1 w-full">
                    <label className="block mb-1 text-slate-300 text-sm font-bold">Location</label>
                    <select 
                        value={editingEmployee.locationId || ''} 
                        onChange={e => setEditingEmployee({...editingEmployee, locationId: e.target.value})} 
                        className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.abbreviation})
                            </option>
                        ))}
                    </select>
                  </div>
                  
                  <div className="flex-1 w-full flex gap-3">
                     <div className="flex-shrink-0 flex flex-col items-center justify-end pb-px">
                        <label className="text-xs text-slate-400 font-bold mb-2 cursor-pointer" htmlFor="isTemp">Temp Employee</label>
                        <div className="h-[48px] flex items-center justify-center bg-slate-700 rounded-lg border border-slate-600 px-3">
                             <input 
                                id="isTemp"
                                type="checkbox" 
                                checked={!!editingEmployee.isTemp} 
                                onChange={(e) => setEditingEmployee({...editingEmployee, isTemp: e.target.checked})}
                                className="h-6 w-6 rounded bg-slate-600 text-teal-500 focus:ring-teal-500 cursor-pointer accent-teal-500"
                              />
                        </div>
                    </div>
                    <div className="flex-grow">
                        <label className={`block mb-1 text-sm font-bold ${editingEmployee.isTemp ? 'text-slate-300' : 'text-slate-500'}`}>Temp Agency</label>
                        <select
                            value={editingEmployee.tempAgency || tempAgencies[0]}
                            onChange={e => setEditingEmployee({...editingEmployee, tempAgency: e.target.value})}
                            disabled={!editingEmployee.isTemp}
                            className={`w-full p-3 rounded-lg border border-slate-600 outline-none transition-colors ${
                                editingEmployee.isTemp 
                                ? 'bg-slate-700 text-white focus:ring-2 focus:ring-teal-500' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {tempAgencies.map(agency => (
                                <option key={agency} value={agency}>{agency}</option>
                            ))}
                        </select>
                    </div>
                  </div>
              </div>

              {/* Department */}
              <div>
                  <label className="block mb-1 text-slate-300 text-sm font-bold">Department</label>
                  <select 
                      value={editingEmployee.departmentId || ''} 
                      onChange={e => setEditingEmployee({...editingEmployee, departmentId: e.target.value})} 
                      className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                      {departments.map(dep => (
                          <option key={dep.id} value={dep.id}>{dep.name}</option>
                      ))}
                      <option value="">None</option>
                  </select>
              </div>

              {/* PIN & Image URL */}
              <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block mb-1 text-slate-300 text-sm font-bold">PIN (4 digits)</label>
                    <input 
                        type="text" 
                        pattern="\d{4}" 
                        maxLength={4} 
                        value={editingEmployee.pin} 
                        onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})} 
                        className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none text-center font-mono tracking-widest" 
                        required
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="block mb-1 text-slate-300 text-sm font-bold">Image URL (Optional)</label>
                    <input 
                        type="url" 
                        value={editingEmployee.imageUrl || ''} 
                        onChange={e => setEditingEmployee({...editingEmployee, imageUrl: e.target.value})} 
                        className="w-full p-3 bg-slate-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 outline-none" 
                    />
                  </div>
              </div>

              {/* Auto Deduct */}
              <div className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
                  <input 
                    id="autoDeductLunch" 
                    type="checkbox" 
                    checked={!!editingEmployee.autoDeductLunch} 
                    onChange={e => setEditingEmployee({...editingEmployee, autoDeductLunch: e.target.checked})} 
                    className="h-5 w-5 rounded bg-slate-600 text-teal-500 focus:ring-teal-500" 
                  />
                  <label htmlFor="autoDeductLunch" className="text-slate-300 text-sm font-medium">
                      Auto-deduct 30min lunch for shifts over 8 hours
                  </label>
              </div>

              {editEmployeeError && <p className="text-red-400 text-sm text-center">{editEmployeeError}</p>}
              
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
                  <button type="button" onClick={() => setEditingEmployee(null)} className="py-2 px-6 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition">Cancel</button>
                  <button type="submit" className="py-2 px-8 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition">Save</button>
              </div>
          </form>
        </Modal>
      )}
      {editingRecord && (
        <Modal onClose={() => setEditingRecord(null)} title={`Edit Punch for ${employeeMap.get(editingRecord.employeeId)}`}>
            <form onSubmit={handleSaveTimeRecord} className="space-y-4">
                <div><label className="block mb-1">Clock In</label><input type="datetime-local" value={formatDateTimeForInput(editingRecord.clockIn)} onChange={e => setEditingRecord({...editingRecord, clockIn: parseDateTimeInput(e.target.value)!})} className="w-full p-2 bg-slate-700 rounded" required /></div>
                <div><label className="block mb-1">Clock Out</label><input type="datetime-local" value={formatDateTimeForInput(editingRecord.clockOut)} onChange={e => setEditingRecord({...editingRecord, clockOut: parseDateTimeInput(e.target.value)})} className="w-full p-2 bg-slate-700 rounded" /></div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => setEditingRecord(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg">Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-green-600 hover:bg-green-500 rounded-lg">Save</button>
                </div>
            </form>
        </Modal>
      )}
      {isAddingRecord && selectedEmployeeForModal && (
          <Modal onClose={() => setIsAddingRecord(false)} title={`Add Punch for ${selectedEmployeeForModal.name}`}>
              <form onSubmit={handleAddNewTimeRecord} className="space-y-4">
                  <div><label className="block mb-1">Clock In</label><input type="datetime-local" name="clockIn" className="w-full p-2 bg-slate-700 rounded" required /></div>
                  <div><label className="block mb-1">Clock Out (Optional)</label><input type="datetime-local" name="clockOut" className="w-full p-2 bg-slate-700 rounded" /></div>
                  <div className="flex justify-end gap-4 pt-4">
                      <button type="button" onClick={() => setIsAddingRecord(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg">Cancel</button>
                      <button type="submit" className="py-2 px-6 bg-green-600 hover:bg-green-500 rounded-lg">Save</button>
                  </div>
              </form>
          </Modal>
      )}
      {deletingRecordId && <ConfirmationModal title="Delete Punch" message="Are you sure you want to permanently delete this time punch?" onConfirm={() => { onDeleteTimeRecord(deletingRecordId); setDeletingRecordId(null); }} onCancel={() => setDeletingRecordId(null)} />}
      {deletingEmployeeId && <ConfirmationModal title="Delete Employee" message="Are you sure? This will permanently delete the employee and all their time records. This action cannot be undone." onConfirm={() => { onDeleteEmployeePermanently(deletingEmployeeId); setDeletingEmployeeId(null); }} onCancel={() => setDeletingEmployeeId(null)} />}
      
      {archivingEmployeeId && (
        <ConfirmationModal
            title="Archive Employee"
            message="Are you sure you want to archive this employee? They will be hidden from the main list and unable to clock in, but their records are preserved."
            onConfirm={() => { onArchiveEmployee(archivingEmployeeId); setArchivingEmployeeId(null); }}
            onCancel={() => setArchivingEmployeeId(null)}
        />
      )}
      {unarchivingEmployeeId && (
        <ConfirmationModal
            title="Unarchive Employee"
            message="Are you sure you want to restore this employee? They will be able to clock in again."
            onConfirm={() => { onUnarchiveEmployee(unarchivingEmployeeId); setUnarchivingEmployeeId(null); }}
            onCancel={() => setUnarchivingEmployeeId(null)}
        />
      )}

      <aside className="hidden lg:flex w-64 bg-slate-800 p-4 flex-col">
        <div className="flex justify-between items-center mb-8">
            <h1 className="font-bold text-teal-400" style={{ fontSize: 'var(--step-3)' }}>Admin Panel</h1>
            <button onClick={openAddEmployeeModal} className="bg-teal-600 hover:bg-teal-500 text-white font-bold p-2 rounded-lg transition" title="Add Employee"><PlusIcon/></button>
        </div>
        <nav className="flex flex-col gap-2 flex-grow overflow-y-auto">
            <NavItem icon={<UsersIcon />} isActive={activeTab === 'employees'} onClick={() => setActiveTab('employees')}>Employees</NavItem>
            {activeTab === 'employees' && (
                <div className="pl-4 mt-1 border-l-2 border-slate-700 space-y-1 flex-shrink-0">
                    {activeEmployees.map(emp => (
                        <button key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)}
                            className={`w-full text-left p-2 rounded-md truncate transition ${selectedEmployeeId === emp.id ? 'bg-teal-600 text-white' : 'hover:bg-slate-700'}`} style={{fontSize: 'var(--step-0)'}}>
                            {emp.name}
                        </button>
                    ))}
                </div>
            )}
            <NavItem icon={<ClockIcon />} isActive={activeTab === 'records'} onClick={() => setActiveTab('records')}>Attendance</NavItem>
            <NavItem icon={<ReportsIcon />} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>Reports</NavItem>
            <NavItem icon={<ArchiveIcon />} isActive={activeTab === 'archived'} onClick={() => setActiveTab('archived')}>Archived</NavItem>
        </nav>
        <div className="mt-auto space-y-2">
            <NavItem icon={<SettingsIcon />} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</NavItem>
            <NavItem icon={<LogoutIcon />} isActive={false} onClick={onLogout}>Logout</NavItem>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-8 flex flex-col overflow-y-auto">
        {/* Mobile/Tablet Nav */}
        <div className="lg:hidden bg-slate-800 p-2 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
                <h1 className="font-bold text-teal-400" style={{ fontSize: 'var(--step-2)' }}>Admin</h1>
                <div className="flex gap-2">
                    <button onClick={openAddEmployeeModal} className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg"><PlusIcon className="w-5 h-5"/></button>
                    <button onClick={onLogout} className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg"><LogoutIcon className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
                <button onClick={() => setActiveTab('employees')} className={`p-2 rounded text-sm ${activeTab === 'employees' ? 'bg-teal-600' : 'bg-slate-700'}`}>Employees</button>
                <button onClick={() => setActiveTab('records')} className={`p-2 rounded text-sm ${activeTab === 'records' ? 'bg-teal-600' : 'bg-slate-700'}`}>Attendance</button>
                 <button onClick={() => setActiveTab('reports')} className={`p-2 rounded text-sm ${activeTab === 'reports' ? 'bg-teal-600' : 'bg-slate-700'}`}>Reports</button>
                <button onClick={() => setActiveTab('archived')} className={`p-2 rounded text-sm ${activeTab === 'archived' ? 'bg-teal-600' : 'bg-slate-700'}`}>Archived</button>
                <button onClick={() => setActiveTab('settings')} className={`p-2 rounded text-sm ${activeTab === 'settings' ? 'bg-teal-600' : 'bg-slate-700'}`}>Settings</button>
            </div>
            {activeTab === 'employees' && activeEmployees.length > 0 && (
                <div className="mt-2">
                    <select value={selectedEmployeeId || ''} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full bg-slate-700 p-2 rounded">
                        {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
            )}
        </div>
        
          {activeTab === 'employees' && (() => {
              const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
              if (!selectedEmployee) return <div className="text-center text-slate-400 p-8 flex-grow flex items-center justify-center">Select an employee to view their timecard or add a new employee.</div>;
              
              return (
                <div>
                  <TimecardView 
                      employee={selectedEmployee} timeRecords={timeRecords} weekStart={adminWeekStart} locations={locations}
                      onWeekChange={setAdminWeekStart} isAdminView={true} onEditRecord={setEditingRecord}
                      onDeleteRecord={setDeletingRecordId} onAddRecord={() => setIsAddingRecord(true)}
                      onEditEmployee={() => openEditEmployeeModal(selectedEmployee)}
                      onArchiveEmployee={() => setArchivingEmployeeId(selectedEmployee.id)}
                      onShowQrCode={() => setShowingQrCodeFor(selectedEmployee)}
                      settings={settings}
                  />
                </div>
              );
          })()}
          {activeTab === 'archived' && (
              <div>
                  <h2 className="font-bold mb-4" style={{ fontSize: 'var(--step-3)' }}>Archived Employees</h2>
                  <div className="bg-slate-800 rounded-lg overflow-x-auto">
                      <table className="w-full text-left">
                          <thead><tr className="border-b border-slate-700"><th className="p-3">Name</th><th className="p-3">PIN</th><th className="p-3 text-right">Actions</th></tr></thead>
                          <tbody className="divide-y divide-slate-700">
                              {archivedEmployees.length > 0 ? archivedEmployees.map(emp => (
                                  <tr key={emp.id} className="hover:bg-slate-700/50">
                                      <td className="p-3">{emp.name}</td>
                                      <td className="p-3">{emp.pin}</td>
                                      <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2 flex-wrap">
                                          <button onClick={() => setShowingQrCodeFor(emp)} className="text-slate-400 hover:text-white flex items-center gap-1" title="Show QR Code"><QrCodeIcon className="w-5 h-5"/> <span className="hidden sm:inline">QR</span></button>
                                          <button onClick={() => setUnarchivingEmployeeId(emp.id)} className="text-green-400 hover:text-green-300 flex items-center gap-1" title="Unarchive Employee"><RestoreIcon className="w-5 h-5"/> <span className="hidden sm:inline">Unarchive</span></button>
                                          <button onClick={() => setDeletingEmployeeId(emp.id)} className="text-red-500 hover:text-red-400 flex items-center gap-1" title="Delete Permanently"><TrashIcon className="w-5 h-5"/> <span className="hidden sm:inline">Delete</span></button>
                                        </div>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr><td colSpan={3} className="p-4 text-center text-slate-400">No archived employees.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
          {activeTab === 'records' && (() => {
              // Update grouping to use settings.weekStartDay
              const recordsByWeek = [...timeRecords]
                  .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
                  .reduce((acc, record) => {
                      const weekStartDate = getWeekStart(new Date(record.clockIn), settings.weekStartDay);
                      const weekKey = weekStartDate.toISOString().split('T')[0];
                      if (!acc[weekKey]) acc[weekKey] = [];
                      acc[weekKey].push(record);
                      return acc;
                  }, {} as Record<string, TimeRecord[]>);
              const sortedWeekKeys = Object.keys(recordsByWeek).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

              return (
                <div>
                    <h2 className="font-bold mb-4" style={{ fontSize: 'var(--step-3)' }}>Attendance Records</h2>
                    {sortedWeekKeys.map(weekKey => {
                      const weekRecords = recordsByWeek[weekKey];
                      
                      // Calculate Totals for the week
                      let weekReg = 0;
                      let weekOt = 0;
                      let weekTotal = 0;
                      
                      const empIds = new Set(weekRecords.map(r => r.employeeId));
                      empIds.forEach(empId => {
                          const emp = employees.find(e => e.id === empId);
                          const empRecs = weekRecords.filter(r => r.employeeId === empId);
                          
                          // Calculate daily totals for lunch deduction to be accurate with other views
                          const dayTotals: Record<string, number> = {};
                          empRecs.forEach(r => {
                              const d = new Date(r.clockIn).toDateString();
                              dayTotals[d] = (dayTotals[d] || 0) + calculateDuration(r).totalMs;
                          });
                          
                          let empTotal = 0;
                          Object.values(dayTotals).forEach(ms => {
                              let adjusted = ms;
                              if (emp?.autoDeductLunch && ms > 8 * 3600000) {
                                  adjusted -= 30 * 60000;
                              }
                              empTotal += Math.max(0, adjusted);
                          });
                          
                          const threshold = 40 * 3600000;
                          const reg = Math.min(empTotal, threshold);
                          const ot = Math.max(0, empTotal - threshold);
                          
                          weekReg += reg;
                          weekOt += ot;
                          weekTotal += empTotal;
                      });

                      return (
                      <div key={weekKey} className="mb-8 bg-slate-800 rounded-lg p-1">
                        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-t-lg">
                          <h3 className="font-semibold" style={{ fontSize: 'var(--step-2)' }}>Week of {new Date(weekKey).toLocaleDateString()}</h3>
                          <button onClick={() => exportWeekToCsv(weekRecords, weekKey)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg transition">
                            <DownloadIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Export CSV</span>
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[600px]">
                            <thead><tr className="border-b border-slate-700"><th className="p-3">Loc</th><th className="p-3">Employee</th><th className="p-3">Clock In</th><th className="p-3">Clock Out</th><th className="p-3">Duration</th><th className="p-3">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">
                              {weekRecords.map(rec => (
                                <tr key={rec.id} className="hover:bg-slate-700/50">
                                  <td className="p-3 font-mono text-sky-300">{locations.find(l => l.id === rec.locationId)?.abbreviation || '-'}</td>
                                  <td className="p-3">{employeeMap.get(rec.employeeId) || 'Unknown'}</td>
                                  <td className="p-3">{new Date(rec.clockIn).toLocaleString()}</td>
                                  <td className="p-3">{rec.clockOut ? new Date(rec.clockOut).toLocaleString() : 'Active'}</td>
                                  <td className="p-3 font-mono">{calculateDuration(rec).display}</td>
                                  <td className="p-3 flex items-center gap-3">
                                    <button onClick={() => setEditingRecord(rec)} className="text-sky-400 hover:text-sky-300"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setDeletingRecordId(rec.id)} className="text-red-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-b-lg flex flex-col sm:flex-row justify-end gap-6 sm:gap-12 border-t border-slate-700">
                            <div className="flex flex-col items-end">
                                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Regular</span>
                                <span className="text-white font-bold text-xl">{formatShortDuration(weekReg)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Overtime</span>
                                <span className={`${weekOt > 0 ? 'text-yellow-400' : 'text-slate-500'} font-bold text-xl`}>{formatShortDuration(weekOt)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</span>
                                <span className="text-teal-400 font-bold text-2xl">{formatShortDuration(weekTotal)}</span>
                            </div>
                        </div>
                      </div>
                    )})}
                </div>
              );
          })()}
          {activeTab === 'reports' && (
             <ReportsView employees={employees} timeRecords={timeRecords} departments={departments} settings={settings} />
          )}
          {activeTab === 'settings' && (
              <SettingsView 
                  locations={locations}
                  departments={departments}
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  onUpdateLocations={onUpdateLocations}
                  onUpdateDepartments={onUpdateDepartments}
              />
          )}
      </main>
    </div>
  );
};

export default AdminDashboard;