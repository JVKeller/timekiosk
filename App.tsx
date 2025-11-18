
import React, { useState, useEffect, useRef } from 'react';
import type { Employee, Location, TimeRecord, View, Department, AppSettings } from './types';
import { useMockData } from './hooks/useMockData';
import { getWeekStart } from './utils';

import DigitalClock from './components/DigitalClock';
import Scanner from './components/Scanner';
import EmployeeStatus from './components/EmployeeStatus';
import Keypad from './components/Keypad';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import TimecardView from './components/admin/TimecardView';
import TimerControl from './components/TimerControl';
import QrCodeIcon from './components/icons/QrCodeIcon';
import PinIcon from './components/icons/PinIcon';
import AdminIcon from './components/icons/AdminIcon';
import EmployeeImage from './components/EmployeeImage';

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const { 
      employees: initialEmployees, 
      locations: initialLocations, 
      timeRecords: initialTimeRecords,
      departments: initialDepartments,
      settings: initialSettings
  } = useMockData();
  
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>(initialTimeRecords);

  const [currentView, setCurrentView] = useState<View>('HOME');
  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0]?.id || '');
  const [identifiedEmployee, setIdentifiedEmployee] = useState<Employee | null>(null);
  const [pinMatchedEmployees, setPinMatchedEmployees] = useState<Employee[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  
  const [timeoutDuration, setTimeoutDuration] = useState(0);
  const [confirmationMessage, setConfirmationMessage] = useState<{ message: string; type: 'in' | 'out' } | null>(null);
  
  // Initialize with configured week start
  const [timecardWeekStart, setTimecardWeekStart] = useState<Date>(getWeekStart(new Date(), settings.weekStartDay));
  
  const [timecardReturnView, setTimecardReturnView] = useState<View>('HOME');
  
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const timerStartRef = useRef(0);
  const remainingTimeoutMs = useRef(0);

  const statusTimeoutRef = useRef<number | null>(null);
  const adminTimeoutRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Sync week start when settings change
  useEffect(() => {
    setTimecardWeekStart(prev => getWeekStart(prev, settings.weekStartDay));
  }, [settings.weekStartDay]);

  const clearStatusTimeout = () => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  };

  const toggleTimerPause = () => {
    const bar = progressBarRef.current;
    if (!bar) return;

    setIsTimerPaused(prev => {
        const isPausing = !prev;
        if (isPausing) {
            clearTimeout(statusTimeoutRef.current!);
            const elapsed = Date.now() - timerStartRef.current;
            remainingTimeoutMs.current = Math.max(0, remainingTimeoutMs.current - elapsed);

            const computedWidth = getComputedStyle(bar).width;
            bar.style.transition = 'none';
            bar.style.width = computedWidth;
        } else {
            timerStartRef.current = Date.now();
            if (remainingTimeoutMs.current > 0) {
                statusTimeoutRef.current = window.setTimeout(resetToHome, remainingTimeoutMs.current);
                const remainingSeconds = remainingTimeoutMs.current / 1000;
                bar.style.transition = `width ${remainingSeconds}s linear`;
                bar.style.width = '0%';
            } else {
                resetToHome();
            }
        }
        return isPausing;
    });
  };

  // Timeout for employee-facing screens
  useEffect(() => {
    clearStatusTimeout();
    
    const viewsWithTimeout: Partial<Record<View, number>> = {
        STATUS: 10,
        EMPLOYEE_TIMECARD: 20,
        CONFIRMATION: 10
    };
    
    const timeoutSeconds = viewsWithTimeout[currentView];

    if (timeoutSeconds) {
        setIsTimerPaused(false);
        setTimeoutDuration(timeoutSeconds);
        
        const bar = progressBarRef.current;
        if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '100%';
            bar.offsetWidth;
            bar.style.transition = `width ${timeoutSeconds}s linear`;
            bar.style.width = '0%';
        }

        timerStartRef.current = Date.now();
        remainingTimeoutMs.current = timeoutSeconds * 1000;
        statusTimeoutRef.current = window.setTimeout(() => {
            resetToHome();
        }, timeoutSeconds * 1000);
    } else {
        setTimeoutDuration(0);
    }

    return () => {
        clearStatusTimeout();
    };
  }, [currentView, identifiedEmployee]);
  
  // 10-minute inactivity timeout for Admin Dashboard
  useEffect(() => {
    const resetAdminTimeout = () => {
      if (adminTimeoutRef.current) {
        clearTimeout(adminTimeoutRef.current);
      }
      adminTimeoutRef.current = window.setTimeout(() => {
        if (currentView === 'ADMIN_DASHBOARD') {
            resetToHome();
        }
      }, 10 * 60 * 1000); // 10 minutes
    };

    if (currentView === 'ADMIN_DASHBOARD') {
      const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
      
      resetAdminTimeout(); // Set initial timeout

      activityEvents.forEach(event => {
        window.addEventListener(event, resetAdminTimeout, { passive: true });
      });

      return () => {
        if (adminTimeoutRef.current) {
          clearTimeout(adminTimeoutRef.current);
        }
        activityEvents.forEach(event => {
          window.removeEventListener(event, resetAdminTimeout);
        });
      };
    }
  }, [currentView]);


  const findAndSetEmployee = (id: string) => {
    const employee = employees.find((e) => e.id === id);
    if (employee && !employee.archived) {
      setIdentifiedEmployee(employee);
      setCurrentView('STATUS');
      setPinMatchedEmployees([]);
    } else {
      console.error("Unknown or archived employee ID:", id);
      resetToHome();
    }
  };
  
  const handlePinSubmit = (pin: string) => {
    const matches = employees.filter((e) => e.pin === pin && !e.archived);
    setPinError(null);

    if (matches.length > 1) {
        setPinMatchedEmployees(matches);
        setCurrentView('PIN_SELECTION');
    } else if (matches.length === 1) {
      setIdentifiedEmployee(matches[0]);
      setCurrentView('STATUS');
    } else {
      setPinError("Invalid or archived PIN. Please try again.");
    }
  };

  const handleClockIn = (employeeId: string) => {
    clearStatusTimeout();
    const newRecord: TimeRecord = {
      id: `rec-${Date.now()}`,
      employeeId,
      locationId: selectedLocation,
      clockIn: new Date(),
    };
    setTimeRecords([...timeRecords, newRecord]);
    const employee = employees.find(e => e.id === employeeId);
    setConfirmationMessage({ message: `Welcome, ${employee?.name}! You are now clocked in.`, type: 'in'});
    setCurrentView('CONFIRMATION');
  };

  const handleClockOut = (employeeId: string) => {
    clearStatusTimeout();
    const lastRecordIndex = timeRecords.slice().reverse().findIndex(
        (r) => r.employeeId === employeeId && !r.clockOut
    );

    if (lastRecordIndex !== -1) {
        const originalIndex = timeRecords.length - 1 - lastRecordIndex;
        const updatedRecords = [...timeRecords];
        const recordToUpdate = updatedRecords[originalIndex];
        updatedRecords[originalIndex] = { ...recordToUpdate, clockOut: new Date() };
        setTimeRecords(updatedRecords);
    }
    const employee = employees.find(e => e.id === employeeId);
    setConfirmationMessage({ message: `Goodbye, ${employee?.name}! You are now clocked out.`, type: 'out'});
    setCurrentView('CONFIRMATION');
  };

  const handleStartBreak = (employeeId: string) => {
    const lastRecordIndex = timeRecords.slice().reverse().findIndex(
      (r) => r.employeeId === employeeId && !r.clockOut
    );
  
    if (lastRecordIndex !== -1) {
      const originalIndex = timeRecords.length - 1 - lastRecordIndex;
      const updatedRecords = [...timeRecords];
      const recordToUpdate = { ...updatedRecords[originalIndex] };
  
      if (!recordToUpdate.breaks) {
        recordToUpdate.breaks = [];
      }
  
      const hasActiveBreak = recordToUpdate.breaks.some(b => !b.end);
      if (!hasActiveBreak) {
        recordToUpdate.breaks.push({ start: new Date() });
        updatedRecords[originalIndex] = recordToUpdate;
        setTimeRecords(updatedRecords);
      }
    }
  };
  
  const handleEndBreak = (employeeId: string) => {
    const lastRecordIndex = timeRecords.slice().reverse().findIndex(
      (r) => r.employeeId === employeeId && !r.clockOut
    );
  
    if (lastRecordIndex !== -1) {
      const originalIndex = timeRecords.length - 1 - lastRecordIndex;
      const updatedRecords = [...timeRecords];
      const recordToUpdate = { ...updatedRecords[originalIndex] };
      const activeBreakIndex = recordToUpdate.breaks?.findIndex(b => !b.end);
  
      if (recordToUpdate.breaks && activeBreakIndex !== -1 && activeBreakIndex !== undefined) {
        recordToUpdate.breaks[activeBreakIndex].end = new Date();
        updatedRecords[originalIndex] = recordToUpdate;
        setTimeRecords(updatedRecords);
      }
    }
  };
  
  const resetToHome = () => {
    clearStatusTimeout();
    setIdentifiedEmployee(null);
    setPinMatchedEmployees([]);
    setCurrentView('HOME');
    setPinError(null);
    setAdminLoginError(null);
    setConfirmationMessage(null);
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees([...employees, { ...newEmployee, archived: false }]);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
  };
  
  const handleArchiveEmployee = (employeeId: string) => {
    setEmployees(employees.map(e => e.id === employeeId ? { ...e, archived: true } : e));
  };

  const handleUnarchiveEmployee = (employeeId: string) => {
    setEmployees(employees.map(e => e.id === employeeId ? { ...e, archived: false } : e));
  };
  
  const handleDeleteEmployeePermanently = (employeeId: string) => {
    setEmployees(employees.filter(e => e.id !== employeeId));
    setTimeRecords(timeRecords.filter(r => r.employeeId !== employeeId));
  };
  
  const handleUpdateTimeRecord = (updatedRecord: TimeRecord) => {
    setTimeRecords(timeRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  }
  
  const handleDeleteTimeRecord = (recordId: string) => {
    setTimeRecords(timeRecords.filter(r => r.id !== recordId));
  }

  const handleAddTimeRecord = (recordData: Omit<TimeRecord, 'id' | 'locationId'>) => {
    const newRecord: TimeRecord = { ...recordData, id: `rec-${Date.now()}`, locationId: selectedLocation };
    setTimeRecords([...timeRecords, newRecord]);
  };
  
  const viewEmployeeTimecard = (employee: Employee, returnView: View) => {
    clearStatusTimeout();
    setIdentifiedEmployee(employee);
    // Ensure we start on the correct week boundary according to settings
    setTimecardWeekStart(getWeekStart(new Date(), settings.weekStartDay));
    setTimecardReturnView(returnView);
    setCurrentView('EMPLOYEE_TIMECARD');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard 
          employees={employees} timeRecords={timeRecords} locations={locations}
          departments={departments} settings={settings}
          onLogout={resetToHome}
          onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee}
          onArchiveEmployee={handleArchiveEmployee} onUnarchiveEmployee={handleUnarchiveEmployee}
          onDeleteEmployeePermanently={handleDeleteEmployeePermanently}
          onUpdateTimeRecord={handleUpdateTimeRecord}
          onDeleteTimeRecord={handleDeleteTimeRecord}
          onAddTimeRecord={handleAddTimeRecord}
          onUpdateLocations={setLocations}
          onUpdateDepartments={setDepartments}
          onUpdateSettings={setSettings}
        />;
      
      case 'PIN_SELECTION':
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-50">
                <div className="w-full max-w-4xl text-center">
                    <h2 className="font-bold text-white mb-8" style={{ fontSize: 'var(--step-4)' }}>Who is clocking in?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {pinMatchedEmployees.map(emp => (
                            <button key={emp.id} onClick={() => findAndSetEmployee(emp.id)} className="bg-slate-800 p-4 rounded-lg flex flex-col items-center gap-4 hover:bg-teal-600 transition-colors duration-200 transform hover:scale-105">
                                <EmployeeImage employee={emp} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-600" />
                                <span className="font-semibold text-white" style={{ fontSize: 'var(--step-1)' }}>{emp.name}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={resetToHome} className="mt-12 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg" style={{ fontSize: 'var(--step-0)' }}>Cancel</button>
                </div>
            </div>
        )
      
      case 'CONFIRMATION':
        return (
          <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-50">
            <div className="w-full max-w-4xl bg-slate-800 p-12 rounded-2xl shadow-2xl text-white relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-600">
                    <div 
                    ref={progressBarRef}
                    className="h-full bg-teal-400" 
                    style={{ width: `100%` }}
                    />
                </div>
                <h2 className="font-bold mb-10" style={{ fontSize: 'var(--step-3)' }}>{confirmationMessage?.message}</h2>
                <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
                {confirmationMessage?.type === 'out' && (
                    <button
                    onClick={() => viewEmployeeTimecard(identifiedEmployee!, 'HOME')}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-8 rounded-lg transition duration-200 transform hover:scale-105"
                    style={{ fontSize: 'var(--step-1)' }}
                    >
                    View My Timecard
                    </button>
                )}
                <button
                    onClick={resetToHome}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-lg transition duration-200 transform hover:scale-105"
                    style={{ fontSize: 'var(--step-1)' }}
                >
                    Done
                </button>
                </div>
            </div>
          </div>
        );

      case 'EMPLOYEE_TIMECARD':
        if (!identifiedEmployee) {
            resetToHome();
            return null;
        }
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-50">
                <div className="w-full max-w-4xl bg-slate-800 p-4 md:p-6 rounded-2xl shadow-2xl text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-slate-600">
                        <div 
                            ref={progressBarRef}
                            className="h-full bg-teal-400"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="pt-4">
                      <TimecardView employee={identifiedEmployee} timeRecords={timeRecords} weekStart={timecardWeekStart} onWeekChange={setTimecardWeekStart} settings={settings} />
                      <button onClick={() => setCurrentView(timecardReturnView)} className="w-full mt-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg" style={{ fontSize: 'var(--step-0)' }}>Back</button>
                    </div>
                </div>
            </div>
        );

      case 'HOME':
      case 'SCANNING':
      case 'PIN_ENTRY':
      case 'STATUS':
      case 'ADMIN_LOGIN':
      default:
        const showAdminLogin = currentView === 'ADMIN_LOGIN';
        return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 md:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <h1 className="font-bold text-teal-400" style={{ fontSize: 'var(--step-2)' }}>Time Clock Kiosk</h1>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center">
                  <label htmlFor="location-select" className="mr-2 text-slate-300">Location:</label>
                  <select
                    id="location-select" value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-slate-700 text-white p-2 rounded-md"
                  >
                    {locations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                  </select>
                </div>
                <button onClick={() => setCurrentView('ADMIN_LOGIN')} className="text-slate-400 hover:text-teal-400 transition" aria-label="Admin Login">
                  <AdminIcon className="w-7 h-7" />
                </button>
              </div>
            </header>
            
            <main className="flex-grow flex flex-col items-center justify-center gap-8 md:gap-12">
              {settings.logoUrl && currentView === 'HOME' && (
                 <div className="mb-4">
                     <img src={settings.logoUrl} alt="Company Logo" className="h-24 md:h-32 object-contain" />
                 </div>
              )}
              <DigitalClock />
              {currentView === 'HOME' && (
                <div className="text-center">
                  <h1 className="font-bold text-white mb-8" style={{ fontSize: 'var(--step-5)' }}>Ready to Clock In?</h1>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => setCurrentView('SCANNING')} className="group flex items-center justify-center gap-4 bg-teal-600 hover:bg-teal-500 text-white font-bold py-6 px-10 rounded-xl transition duration-300 transform hover:scale-105" style={{ fontSize: 'var(--step-2)' }}>
                      <QrCodeIcon className="w-8 h-8 md:w-10 md:h-10 group-hover:animate-pulse" />Scan QR Code
                    </button>
                    <button onClick={() => setCurrentView('PIN_ENTRY')} className="group flex items-center justify-center gap-4 bg-sky-600 hover:bg-sky-500 text-white font-bold py-6 px-10 rounded-xl transition duration-300 transform hover:scale-105" style={{ fontSize: 'var(--step-2)' }}>
                      <PinIcon className="w-8 h-8 md:w-10 md:h-10" />Enter PIN
                    </button>
                  </div>
                </div>
              )}
              {currentView === 'STATUS' && identifiedEmployee && (
                <EmployeeStatus
                  key={identifiedEmployee.id}
                  employee={identifiedEmployee} timeRecords={timeRecords}
                  onClockIn={handleClockIn} onClockOut={handleClockOut}
                  onStartBreak={handleStartBreak}
                  onEndBreak={handleEndBreak}
                  onDone={resetToHome}
                  onViewTimecard={() => viewEmployeeTimecard(identifiedEmployee, 'STATUS')}
                  progressBarRef={progressBarRef}
                />
              )}
            </main>
      
            {currentView === 'SCANNING' && (<Scanner onScanSuccess={(id) => findAndSetEmployee(id)} onCancel={resetToHome} />)}
            {currentView === 'PIN_ENTRY' && (<Keypad onSubmit={handlePinSubmit} onCancel={resetToHome} error={pinError} />)}
            {showAdminLogin && <AdminLogin onLogin={() => setCurrentView('ADMIN_DASHBOARD')} onCancel={resetToHome} error={adminLoginError} />}
          </div>
        );
    }
  }
  
  return (
    <>
      {timeoutDuration > 0 && <TimerControl isPaused={isTimerPaused} onToggle={toggleTimerPause} />}
      {renderContent()}
    </>
  );
};

export default App;
