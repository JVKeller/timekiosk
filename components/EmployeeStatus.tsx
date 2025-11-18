import React, { useState, useEffect } from 'react';
import type { Employee, TimeRecord } from '../types';
import { ClockStatus } from '../types';
import EmployeeImage from './EmployeeImage';

interface EmployeeStatusProps {
  employee: Employee;
  timeRecords: TimeRecord[];
  onClockIn: (employeeId: string) => void;
  onClockOut: (employeeId: string) => void;
  onStartBreak: (employeeId: string) => void;
  onEndBreak: (employeeId: string) => void;
  onDone: () => void;
  onViewTimecard: () => void;
  progressBarRef: React.RefObject<HTMLDivElement>;
}

const EmployeeStatus: React.FC<EmployeeStatusProps> = ({
  employee,
  timeRecords,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onDone,
  onViewTimecard,
  progressBarRef,
}) => {
  const [workedDuration, setWorkedDuration] = useState<string>('');

  const lastRecord = timeRecords
    .filter((r) => r.employeeId === employee.id)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())[0];

  const isOnBreak = lastRecord && !lastRecord.clockOut && lastRecord.breaks?.some(b => !b.end);

  const currentStatus =
    lastRecord && !lastRecord.clockOut 
      ? (isOnBreak ? ClockStatus.OnBreak : ClockStatus.ClockedIn) 
      : ClockStatus.ClockedOut;

  useEffect(() => {
    let interval: number | undefined;

    const formatDuration = (ms: number) => {
        if (ms < 0) ms = 0;
        const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
        const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    if (currentStatus === ClockStatus.ClockedIn && lastRecord) {
        const calculateWorkedMs = (record: TimeRecord) => {
            const clockInTime = new Date(record.clockIn).getTime();
            const now = new Date().getTime();
            const totalBreakMs = (record.breaks || []).reduce((acc, br) => {
                if (!br.end) return acc;
                return acc + (new Date(br.end).getTime() - new Date(br.start).getTime());
            }, 0);
            return now - clockInTime - totalBreakMs;
        };

        const updateDuration = () => {
            setWorkedDuration(formatDuration(calculateWorkedMs(lastRecord)));
        };
        updateDuration();
        interval = window.setInterval(updateDuration, 1000);

    } else if (currentStatus === ClockStatus.OnBreak && lastRecord) {
        const calculateWorkedMsUntilBreak = (record: TimeRecord) => {
            const clockInTime = new Date(record.clockIn).getTime();
            const lastBreak = record.breaks![record.breaks!.length - 1];
            const breakStartTime = new Date(lastBreak.start).getTime();
            const priorBreaksMs = (record.breaks || []).slice(0, -1).reduce((acc, br) => {
                if (!br.end) return acc;
                return acc + (new Date(br.end).getTime() - new Date(br.start).getTime());
            }, 0);
            return breakStartTime - clockInTime - priorBreaksMs;
        };
        setWorkedDuration(formatDuration(calculateWorkedMsUntilBreak(lastRecord)));
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [currentStatus, lastRecord]);

  const handleClockAction = () => {
    if (currentStatus === ClockStatus.ClockedOut) {
      onClockIn(employee.id);
    } else {
      onClockOut(employee.id);
    }
  };

  const handleBreakAction = () => {
    if (currentStatus === ClockStatus.ClockedIn) {
        onStartBreak(employee.id);
    } else if (currentStatus === ClockStatus.OnBreak) {
        onEndBreak(employee.id);
    }
  };

  return (
    <div className="relative bg-slate-800 p-8 rounded-2xl shadow-2xl text-white max-w-4xl w-full flex flex-col md:flex-row md:items-start lg:items-center gap-8 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-600">
        <div 
          ref={progressBarRef}
          className="h-full bg-teal-400"
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Left Column: Profile */}
      <div className="flex flex-col items-center text-center w-full md:w-2/5 shrink-0 pt-2">
        <EmployeeImage employee={employee} className="w-32 h-24 md:w-40 md:h-20 lg:w-48 lg:h-40 rounded-full border-4 border-teal-400 mb-4" />
        <h2 className="text-3xl lg:text-4xl font-bold mb-1">{employee.name}</h2>
        <p className="text-lg lg:text-xl text-slate-400 mb-2">Employee ID: {employee.id}</p>
        <button
                onClick={onViewTimecard}
                className="w-full py-3 text-xl font-semibold bg-sky-600 hover:bg-sky-700 rounded-lg transition duration-300"
            >
                View My Timecard
            </button>
        <button
          onClick={onDone}
          className="mt-4 text-slate-400 hover:text-white transition duration-200"
         >
          Not you? Cancel
        </button>
      </div>

      {/* Right Column: Status & Actions */}
      <div className="w-full md:w-3/5 flex flex-col items-center justify-center gap-8 pt-2">
        <div className="text-center flex flex-col items-center justify-center gap-4">
            {currentStatus === ClockStatus.ClockedIn && (
                <>
                    <p className="text-2xl text-slate-300">You are currently clocked in.</p>
                    <p className="text-3xl text-slate-300 mt-2">Worked Duration:</p>
                    <p className="text-7xl lg:text-6xl font-mono font-bold text-teal-300 mb-4">{workedDuration}</p>
                </>
            )}
            {currentStatus === ClockStatus.OnBreak && (
                <>
                    <p className="text-lg font-semibold text-yellow-300">You are currently on break.</p>
                    <p className="text-2xl text-slate-300 mt-4">Worked Duration (Paused):</p>
                    <p className="text-5xl lg:text-6xl font-mono font-bold text-slate-400 ">{workedDuration}</p>
                </>
            )}
            {currentStatus === ClockStatus.ClockedOut && (
                 <p className="text-2xl lg:text-3xl text-slate-300">You are currently clocked out.</p>
            )}
        </div>
        
        <div className="w-full max-w-sm flex flex-col gap-4">
            {currentStatus === ClockStatus.ClockedOut && (
                <button onClick={handleClockAction} className="w-full py-8 text-2xl font-bold rounded-lg transition duration-300 bg-green-600 hover:bg-green-700">
                    Clock In
                </button>
            )}
            {currentStatus === ClockStatus.ClockedIn && (
                <div className="flex w-full gap-4">
                    <button onClick={handleClockAction} className="flex-1 py-8 text-2xl font-bold rounded-lg transition duration-300 bg-red-600 hover:bg-red-700">
                        Clock Out
                    </button>
                    <button onClick={handleBreakAction} className="flex-1 py-8 text-2xl font-semibold bg-yellow-600 hover:bg-yellow-700 rounded-lg transition duration-300">
                        Start Break
                    </button>
                </div>
            )}
            {currentStatus === ClockStatus.OnBreak && (
                <button onClick={handleBreakAction} className="w-full py-8 text-2xl font-bold rounded-lg transition duration-300 bg-yellow-500 hover:bg-yellow-600">
                    End Break
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeStatus;