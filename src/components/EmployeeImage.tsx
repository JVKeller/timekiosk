import React from 'react';
import type { Employee } from '../types';
import UserIcon from './icons/UserIcon';

interface EmployeeImageProps {
    employee: Employee;
    className?: string;
}

const EmployeeImage: React.FC<EmployeeImageProps> = ({ employee, className = '' }) => {
    if (employee.imageUrl) {
        return <img src={employee.imageUrl} alt={employee.name} className={`${className} object-cover`} />;
    }
    return (
        <div className={`${className} bg-slate-700 flex items-center justify-center`}>
            <UserIcon className="w-1/2 h-1/2 text-slate-400" />
        </div>
    );
};

export default EmployeeImage;