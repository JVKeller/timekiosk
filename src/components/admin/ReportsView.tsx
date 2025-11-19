import React, { useState, useEffect, useMemo } from 'react';
import type { Employee, TimeRecord, Department, AppSettings } from '../../types';
import { getWeekStart, calculateDuration } from '../../utils';
import ChevronLeftIcon from '../icons/ChevronLeftIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import DownloadIcon from '../icons/DownloadIcon';

interface ReportsViewProps {
    employees: Employee[];
    timeRecords: TimeRecord[];
    departments: Department[];
    settings: AppSettings;
}

type ReportType = 'timecards' | 'attendance';

const ReportsView: React.FC<ReportsViewProps> = ({ employees, timeRecords, departments, settings }) => {
    // --- State ---
    const [startDate, setStartDate] = useState<Date>(getWeekStart(new Date(), settings.weekStartDay));
    const [endDate, setEndDate] = useState<Date>(() => {
        const d = getWeekStart(new Date(), settings.weekStartDay);
        d.setDate(d.getDate() + 6);
        return d;
    });
    const [useCustomDate, setUseCustomDate] = useState(false);
    
    const [reportType, setReportType] = useState<ReportType>('timecards');
    
    const [selectedDepIds, setSelectedDepIds] = useState<string[]>([]);
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

    // Update default dates when settings change
    useEffect(() => {
        if (!useCustomDate) {
            const newStart = getWeekStart(new Date(), settings.weekStartDay);
            setStartDate(newStart);
            const newEnd = new Date(newStart);
            newEnd.setDate(newEnd.getDate() + 6);
            setEndDate(newEnd);
        }
    }, [settings.weekStartDay]);

    // --- Derived Data ---
    const activeEmployees = useMemo(() => employees.filter(e => !e.archived), [employees]);

    const availableEmployees = useMemo(() => {
        if (selectedDepIds.length === 0) return activeEmployees;
        return activeEmployees.filter(e => e.departmentId && selectedDepIds.includes(e.departmentId));
    }, [activeEmployees, selectedDepIds]);

    useEffect(() => {
        const availableIds = new Set(availableEmployees.map(e => e.id));
        setSelectedEmpIds(prev => prev.filter(id => availableIds.has(id)));
    }, [selectedDepIds, availableEmployees]);

    // --- Handlers ---
    const handlePrevWeek = () => {
        const newStart = new Date(startDate);
        newStart.setDate(newStart.getDate() - 7);
        setStartDate(newStart);
        
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        setEndDate(newEnd);
        setUseCustomDate(false);
    };

    const handleNextWeek = () => {
        const newStart = new Date(startDate);
        newStart.setDate(newStart.getDate() + 7);
        setStartDate(newStart);

        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        setEndDate(newEnd);
        setUseCustomDate(false);
    };

    const handleCurrentWeek = () => {
        const newStart = getWeekStart(new Date(), settings.weekStartDay);
        setStartDate(newStart);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);
        setEndDate(newEnd);
        setUseCustomDate(false);
    };

    // Selection Controls
    const toggleDepartment = (id: string) => {
        setSelectedDepIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
    };

    const toggleAllDepartments = () => {
        if (selectedDepIds.length === departments.length) {
            setSelectedDepIds([]);
        } else {
            setSelectedDepIds(departments.map(d => d.id));
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmpIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
    };

    const toggleAllEmployees = () => {
        if (selectedEmpIds.length === availableEmployees.length) {
            setSelectedEmpIds([]);
        } else {
            setSelectedEmpIds(availableEmployees.map(e => e.id));
        }
    };

    // --- Calculation Logic ---
    const getProcessedRecords = (filteredRecords: TimeRecord[], targetEmployeeIds: string[]) => {
        // Group records by Employee -> Week -> Records
        // We need strict week boundaries to calculate OT correctly
        
        const processedData: Record<string, { 
            totalRegMs: number, 
            totalOtMs: number, 
            daysWorked: Set<string>,
            records: { 
                original: TimeRecord, 
                regMs: number, 
                otMs: number 
            }[] 
        }> = {};
        
        // Sort records by time
        const sortedRecords = [...filteredRecords].sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
        
        // Temporary tracking for weekly accumulation
        // Key: employeeId_weekStartDateString
        const weeklyAccumulators: Record<string, number> = {};

        sortedRecords.forEach(record => {
            if (!targetEmployeeIds.includes(record.employeeId)) return;

            // Initialize employee summary container
            if (!processedData[record.employeeId]) {
                processedData[record.employeeId] = { totalRegMs: 0, totalOtMs: 0, daysWorked: new Set(), records: [] };
            }

            // Identify which week this record belongs to
            const recordWeekStart = getWeekStart(new Date(record.clockIn), settings.weekStartDay);
            const weekKey = `${record.employeeId}_${recordWeekStart.toISOString()}`;
            
            if (weeklyAccumulators[weekKey] === undefined) {
                weeklyAccumulators[weekKey] = 0;
            }

            // Calculate raw duration
            let durationMs = calculateDuration(record).totalMs;
            const employee = employees.find(e => e.id === record.employeeId);
            
            // Apply daily lunch deduction rule if applicable (just for the net duration logic)
            if (employee?.autoDeductLunch && durationMs > 8 * 60 * 60 * 1000) {
                durationMs -= 30 * 60 * 1000;
            }

            const currentWeeklyTotal = weeklyAccumulators[weekKey];
            const newWeeklyTotal = currentWeeklyTotal + durationMs;
            const weeklyThreshold = 40 * 60 * 60 * 1000;

            let regMs = 0;
            let otMs = 0;

            if (currentWeeklyTotal >= weeklyThreshold) {
                // Already in OT
                otMs = durationMs;
            } else if (newWeeklyTotal > weeklyThreshold) {
                // Crossed threshold this record
                regMs = weeklyThreshold - currentWeeklyTotal;
                otMs = newWeeklyTotal - weeklyThreshold;
            } else {
                // Entirely regular
                regMs = durationMs;
            }
            
            // Update accumulators
            weeklyAccumulators[weekKey] = newWeeklyTotal;
            processedData[record.employeeId].totalRegMs += regMs;
            processedData[record.employeeId].totalOtMs += otMs;
            processedData[record.employeeId].daysWorked.add(new Date(record.clockIn).toDateString());
            processedData[record.employeeId].records.push({ original: record, regMs, otMs });
        });

        return processedData;
    };

    // Export Logic
    const handleExport = () => {
        const targetEmployeeIds = selectedEmpIds.length > 0 ? selectedEmpIds : availableEmployees.map(e => e.id);
        
        const searchEnd = new Date(endDate);
        searchEnd.setHours(23, 59, 59, 999);
        const searchStart = new Date(startDate);
        searchStart.setHours(0,0,0,0);

        const filteredRecords = timeRecords.filter(r => {
            const rDate = new Date(r.clockIn);
            return targetEmployeeIds.includes(r.employeeId) && rDate >= searchStart && rDate <= searchEnd;
        });

        const processedData = getProcessedRecords(filteredRecords, targetEmployeeIds);
        
        let csvContent = '';
        const filename = `report_${reportType}_${startDate.toISOString().split('T')[0]}.csv`;

        if (reportType === 'attendance') {
            // Attendance Report: Employee ID, Name, Department, Regular Hours, OT Hours, Total Hours, Days Worked
            csvContent = 'Employee ID,Name,Department,Regular Hours,OT Hours,Total Hours,Days Worked\n';
            
            targetEmployeeIds.forEach(empId => {
                const emp = employees.find(e => e.id === empId);
                if (!emp) return;
                
                const data = processedData[empId];
                if (!data) return; 

                const regHours = (data.totalRegMs / (1000 * 60 * 60)).toFixed(2);
                const otHours = (data.totalOtMs / (1000 * 60 * 60)).toFixed(2);
                const totalHours = ((data.totalRegMs + data.totalOtMs) / (1000 * 60 * 60)).toFixed(2);
                const daysCount = data.daysWorked.size;
                const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';

                csvContent += `"${emp.id}","${emp.name}","${deptName}",${regHours},${otHours},${totalHours},${daysCount}\n`;
            });

        } else {
            // Timecard Report: Date, Employee ID, Name, Department, Clock In, Clock Out, Regular Time, OT
            csvContent = 'Date,Employee ID,Name,Department,Clock In,Clock Out,Regular Time,OT\n';
            
            // We need to flatten the records back out, sorted by date then employee
            let allRows: any[] = [];
            Object.keys(processedData).forEach(empId => {
                const emp = employees.find(e => e.id === empId);
                if (!emp) return;
                const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';
                
                processedData[empId].records.forEach(r => {
                    allRows.push({
                         date: r.original.clockIn,
                         empId: emp.id,
                         empName: emp.name,
                         deptName: deptName,
                         clockIn: r.original.clockIn,
                         clockOut: r.original.clockOut,
                         regHours: (r.regMs / (1000 * 60 * 60)).toFixed(2),
                         otHours: (r.otMs / (1000 * 60 * 60)).toFixed(2)
                    });
                });
            });

            allRows.sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

            allRows.forEach(row => {
                const dateStr = new Date(row.clockIn).toLocaleDateString();
                const inStr = new Date(row.clockIn).toLocaleTimeString();
                const outStr = row.clockOut ? new Date(row.clockOut).toLocaleTimeString() : 'Active';
                csvContent += `"${dateStr}","${row.empId}","${row.empName}","${row.deptName}","${inStr}","${outStr}",${row.regHours},${row.otHours}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) URL.revokeObjectURL(link.href);
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <h2 className="font-bold text-teal-400" style={{ fontSize: 'var(--step-3)' }}>Attendance Reports</h2>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 overflow-hidden">
                {/* Left Column: Configuration */}
                <div className="space-y-6 overflow-y-auto pr-2">
                    
                    {/* 1. Pay Period */}
                    <div className="bg-slate-800 p-5 rounded-lg shadow-lg">
                        <h3 className="font-bold text-white mb-4 border-b border-slate-700 pb-2">Pay Period</h3>
                        
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">
                                <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-600 rounded text-white"><ChevronLeftIcon/></button>
                                <div className="text-center">
                                    <span className="block font-bold text-lg">{startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">{useCustomDate ? 'Custom Range' : 'Standard Week'}</span>
                                </div>
                                <button onClick={handleNextWeek} className="p-2 hover:bg-slate-600 rounded text-white"><ChevronRightIcon/></button>
                            </div>

                            <div className="flex gap-2 justify-center">
                                <button onClick={handleCurrentWeek} className="text-sm text-teal-400 hover:underline">Reset to Current Week</button>
                            </div>
                            
                            <div className="mt-2">
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer mb-2">
                                    <input type="checkbox" checked={useCustomDate} onChange={e => setUseCustomDate(e.target.checked)} className="rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500" />
                                    Use Custom Date Range
                                </label>
                                {useCustomDate && (
                                    <div className="flex gap-4">
                                        <input type="date" value={startDate.toISOString().split('T')[0]} onChange={e => setStartDate(new Date(e.target.value))} className="flex-1 bg-slate-700 text-white p-2 rounded border border-slate-600" />
                                        <input type="date" value={endDate.toISOString().split('T')[0]} onChange={e => setEndDate(new Date(e.target.value))} className="flex-1 bg-slate-700 text-white p-2 rounded border border-slate-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Report Type */}
                    <div className="bg-slate-800 p-5 rounded-lg shadow-lg">
                        <h3 className="font-bold text-white mb-4 border-b border-slate-700 pb-2">Report Type</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { id: 'timecards', label: 'Detailed Timecards', desc: 'Punch times, Regular, and OT breakdown.' },
                                { id: 'attendance', label: 'Attendance Summary', desc: 'Total Reg and OT hours per employee.' },
                            ].map((type) => (
                                <div 
                                    key={type.id}
                                    onClick={() => setReportType(type.id as ReportType)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${reportType === type.id ? 'border-teal-500 bg-teal-500/10' : 'border-slate-600 hover:border-slate-500'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${reportType === type.id ? 'border-teal-500' : 'border-slate-400'}`}>
                                            {reportType === type.id && <div className="w-2 h-2 rounded-full bg-teal-500"></div>}
                                        </div>
                                        <span className={`font-bold ${reportType === type.id ? 'text-teal-400' : 'text-white'}`}>{type.label}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 pl-6">{type.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Filtering */}
                <div className="space-y-6 overflow-y-auto pr-2">
                    
                    {/* 3. Select Department */}
                    <div className="bg-slate-800 p-5 rounded-lg shadow-lg flex flex-col max-h-[300px]">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2 shrink-0">
                            <h3 className="font-bold text-white">Filter by Department</h3>
                            <button onClick={toggleAllDepartments} className="text-xs text-sky-400 hover:text-sky-300">
                                {selectedDepIds.length === departments.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 pr-2">
                            {departments.length === 0 && <p className="text-slate-500 text-sm italic">No departments defined.</p>}
                            {departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedDepIds.includes(dept.id)} 
                                        onChange={() => toggleDepartment(dept.id)}
                                        className="rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500 h-5 w-5 accent-teal-500"
                                    />
                                    <span className={selectedDepIds.includes(dept.id) ? 'text-white' : 'text-slate-300'}>{dept.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 4. Select Employees */}
                    <div className="bg-slate-800 p-5 rounded-lg shadow-lg flex flex-col h-[400px]">
                         <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2 shrink-0">
                            <h3 className="font-bold text-white">Filter by Employee</h3>
                             <div className="flex gap-4 items-center">
                                <span className="text-xs text-slate-500">{selectedEmpIds.length} selected</span>
                                <button onClick={toggleAllEmployees} className="text-xs text-sky-400 hover:text-sky-300">
                                    {selectedEmpIds.length === availableEmployees.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 pr-2 space-y-1">
                            {availableEmployees.length === 0 && <p className="text-slate-500 text-sm italic">No employees found matching criteria.</p>}
                            {availableEmployees.map(emp => (
                                <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded cursor-pointer group select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedEmpIds.includes(emp.id)} 
                                        onChange={() => toggleEmployee(emp.id)}
                                        className="rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500 h-5 w-5 accent-teal-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${selectedEmpIds.includes(emp.id) ? 'text-white' : 'text-slate-300'}`}>{emp.name}</span>
                                        <span className="text-xs text-slate-500 group-hover:text-slate-400">{emp.id}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-auto border-t border-slate-700 pt-6 flex justify-end gap-4 shrink-0">
                <button onClick={handleExport} className="px-8 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition flex items-center gap-2">
                    <DownloadIcon className="w-5 h-5" />
                    Export Report
                </button>
            </div>
        </div>
    );
};

export default ReportsView;