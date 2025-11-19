
import React, { useMemo } from 'react';
import type { Employee, TimeRecord, Location, AppSettings } from '../../types';
import { calculateDuration, getWeekStart, formatShortDuration } from '../../utils';
import PlusIcon from '../icons/PlusIcon';
import EditIcon from '../icons/EditIcon';
import ArchiveIcon from '../icons/ArchiveIcon';
import ChevronLeftIcon from '../icons/ChevronLeftIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import TrashIcon from '../icons/TrashIcon';
import QrCodeIcon from '../icons/QrCodeIcon';

interface TimecardViewProps {
  employee: Employee;
  timeRecords: TimeRecord[];
  locations?: Location[];
  weekStart: Date;
  onWeekChange: (newDate: Date) => void;
  isAdminView?: boolean;
  onEditRecord?: (record: TimeRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  onAddRecord?: () => void;
  onEditEmployee?: () => void;
  onArchiveEmployee?: () => void;
  onShowQrCode?: () => void;
  settings?: AppSettings;
}

const TimecardView: React.FC<TimecardViewProps> = ({ 
    employee, timeRecords, locations = [], weekStart, onWeekChange, isAdminView = false, 
    onEditRecord, onDeleteRecord, onAddRecord, onEditEmployee, onArchiveEmployee,
    onShowQrCode, settings
}) => {

    // 1. Memoize the filtered records so the reference stays stable across renders
    const employeeRecordsThisWeek = useMemo(() => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return timeRecords.filter(r => {
            const clockInDate = new Date(r.clockIn);
            return r.employeeId === employee.id && clockInDate >= weekStart && clockInDate < weekEnd;
        }).sort((a,b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
    }, [timeRecords, employee.id, weekStart]);
    
    const recordsByDay = useMemo(() => {
        return employeeRecordsThisWeek.reduce((acc, record) => {
            const dayKey = new Date(record.clockIn).toDateString();
            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(record);
            return acc;
        }, {} as Record<string, TimeRecord[]>);
    }, [employeeRecordsThisWeek]);

    // 2. FIX: Convert manualLunchDeductions to a pure derived value using useMemo.
    // This removes the need for useState/useEffect and prevents the infinite update loop.
    const manualLunchDeductions = useMemo(() => {
        const deductions: Record<string, boolean> = {};
        Object.keys(recordsByDay).forEach(dayKey => {
            const dailyDuration = recordsByDay[dayKey].reduce((sum, rec) => sum + calculateDuration(rec).totalMs, 0);
            // Auto deduct if enabled AND duration > 8 hours
            deductions[dayKey] = !!employee.autoDeductLunch && dailyDuration > 8 * 60 * 60 * 1000;
        });
        return deductions;
    }, [recordsByDay, employee.autoDeductLunch]);
    
    const calculateDailyTotalMs = (dailyRecords: TimeRecord[], dayKey: string) => {
        const totalMs = dailyRecords.reduce((sum, rec) => sum + calculateDuration(rec).totalMs, 0);
        let adjustedMs = totalMs;
        if (manualLunchDeductions[dayKey]) {
            adjustedMs -= 30 * 60 * 1000;
        }
        return adjustedMs < 0 ? 0 : adjustedMs;
    };

    const totalMsThisWeek = useMemo(() => {
        return Object.keys(recordsByDay).reduce((total, dayKey) => {
            return total + calculateDailyTotalMs(recordsByDay[dayKey], dayKey);
        }, 0);
    }, [recordsByDay, manualLunchDeductions]);

    const sortedDays = Object.keys(recordsByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const currentWeekStart = getWeekStart(new Date(), settings?.weekStartDay ?? 0);
    const isCurrentWeek = currentWeekStart.getTime() === weekStart.getTime();

    const changeWeek = (direction: 'prev' | 'next') => {
        const newWeekStart = new Date(weekStart);
        newWeekStart.setDate(newWeekStart.getDate() + (direction === 'prev' ? -7 : 7));
        onWeekChange(newWeekStart);
    };
    
    const getLocationAbbr = (locationId: string) => {
        return locations.find(l => l.id === locationId)?.abbreviation || '-';
    };

    // Calculate Breakdown
    const weeklyThresholdMs = 40 * 60 * 60 * 1000;
    const regularMs = Math.min(totalMsThisWeek, weeklyThresholdMs);
    const overtimeMs = Math.max(0, totalMsThisWeek - weeklyThresholdMs);

    return (
        <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-bold" style={{ fontSize: 'var(--step-3)' }}>{employee.name}'s Timecard</h2>
                    <p className="text-slate-400" style={{ fontSize: 'var(--step-0)' }}>Week of {weekStart.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isAdminView && onAddRecord && (
                        <button onClick={onAddRecord} title="Add Punch" className="bg-teal-600 hover:bg-teal-500 text-white font-bold p-2 rounded-lg transition"><PlusIcon className="w-6 h-6"/></button>
                    )}
                    {isAdminView && onShowQrCode && (
                        <button onClick={onShowQrCode} title="Show QR Code" className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-lg transition"><QrCodeIcon className="w-6 h-6"/></button>
                    )}
                    {isAdminView && onEditEmployee && (
                        <button onClick={onEditEmployee} title="Edit Employee" className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-2 rounded-lg transition"><EditIcon className="w-6 h-6"/></button>
                    )}
                    {isAdminView && onArchiveEmployee && (
                        <button onClick={onArchiveEmployee} title="Archive Employee" className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold p-2 rounded-lg transition"><ArchiveIcon className="w-6 h-6"/></button>
                    )}
                    <button onClick={() => changeWeek('prev')} title="Previous Week" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><ChevronLeftIcon/></button>
                    <button onClick={() => changeWeek('next')} title="Next Week" disabled={isCurrentWeek} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRightIcon/></button>
                </div>
            </div>
            <div className="bg-slate-800 rounded-lg max-h-[60vh] overflow-y-auto mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                            <tr>
                                <th className="p-3">Loc</th>
                                <th className="p-3">Clock In</th>
                                <th className="p-3">Clock Out</th>
                                <th className="p-3">Duration</th>
                                {isAdminView && <th className="p-3">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedDays.length > 0 ? sortedDays.map(dayKey => (
                                <React.Fragment key={dayKey}>
                                    {isAdminView && (
                                        <tr className="bg-slate-700/80">
                                            <td colSpan={isAdminView ? 5 : 4} className="p-2 font-bold text-teal-300">
                                                <div className="flex justify-between items-center">
                                                    <span>{new Date(dayKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                    <span className="font-normal text-slate-300">
                                                        Daily Total: {formatShortDuration(calculateDailyTotalMs(recordsByDay[dayKey], dayKey))}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {recordsByDay[dayKey].map((rec, index) => (
                                        <tr key={rec.id} className="hover:bg-slate-700/50">
                                            <td className="p-3 font-mono text-sky-300">{getLocationAbbr(rec.locationId)}</td>
                                            <td className="p-3 whitespace-nowrap">{new Date(rec.clockIn).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-3 whitespace-nowrap">{rec.clockOut ? new Date(rec.clockOut).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
                                            <td className="p-3 font-mono whitespace-nowrap">{calculateDuration(rec).display}</td>
                                            {isAdminView && onEditRecord && (
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                       <button onClick={() => onEditRecord(rec)} className="text-sky-400 hover:text-sky-300"><EditIcon className="w-5 h-5"/></button>
                                                       {onDeleteRecord && <button onClick={() => onDeleteRecord(rec.id)} className="text-red-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            )) : (
                                <tr><td colSpan={isAdminView ? 5 : 4} className="p-4 text-center text-slate-400">No punches this week.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg flex flex-col sm:flex-row justify-end gap-6 sm:gap-12 border-t border-slate-700">
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Regular</span>
                    <span className="text-white font-bold text-xl">{formatShortDuration(regularMs)}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Overtime</span>
                    <span className={`${overtimeMs > 0 ? 'text-yellow-400' : 'text-slate-500'} font-bold text-xl`}>{formatShortDuration(overtimeMs)}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</span>
                    <span className="text-teal-400 font-bold text-2xl">{formatShortDuration(totalMsThisWeek)}</span>
                </div>
            </div>
        </div>
    );
};

export default TimecardView;
