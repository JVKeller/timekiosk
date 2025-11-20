
import React, { useState, useEffect } from 'react';
import type { Location, Department, AppSettings } from '../../types';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import EditIcon from '../icons/EditIcon';

interface SettingsViewProps {
    locations: Location[];
    departments: Department[];
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onUpdateLocations: (locations: Location[]) => void;
    onUpdateDepartments: (departments: Department[]) => void;
    onWipeDatabase: () => void;
    syncState?: { connected: boolean; error: string | null };
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    locations, departments, settings, 
    onUpdateSettings, onUpdateLocations, onUpdateDepartments, onWipeDatabase,
    syncState
}) => {
    const [newLocation, setNewLocation] = useState({ name: '', abbreviation: '' });
    const [newDepartment, setNewDepartment] = useState('');
    
    // Local state for sync URL to prevent auto-saving on keystroke
    const [localSyncUrl, setLocalSyncUrl] = useState(settings.remoteDbUrl || '');

    // Sync local state with prop when prop changes (initial load)
    useEffect(() => {
        setLocalSyncUrl(settings.remoteDbUrl || '');
    }, [settings.remoteDbUrl]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateSettings({ ...settings, logoUrl: e.target.value });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdateSettings({ ...settings, logoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleWeekStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateSettings({ ...settings, weekStartDay: parseInt(e.target.value) });
    };

    // Handle Sync URL Change - just update local state
    const handleSyncUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSyncUrl(e.target.value);
    };

    // Apply Sync Settings
    const applySyncSettings = () => {
        onUpdateSettings({ ...settings, remoteDbUrl: localSyncUrl });
    };

    const handleAddLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLocation.name && newLocation.abbreviation) {
            onUpdateLocations([...locations, { ...newLocation, id: `LOC-${Date.now()}` }]);
            setNewLocation({ name: '', abbreviation: '' });
        }
    };

    const handleDeleteLocation = (id: string) => {
        if (window.confirm('Are you sure? This might affect employees assigned to this location.')) {
            onUpdateLocations(locations.filter(l => l.id !== id));
        }
    };

    const handleAddDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDepartment) {
            onUpdateDepartments([...departments, { name: newDepartment, id: `DEP-${Date.now()}` }]);
            setNewDepartment('');
        }
    };

    const handleDeleteDepartment = (id: string) => {
        if (window.confirm('Are you sure?')) {
            onUpdateDepartments(departments.filter(d => d.id !== id));
        }
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="space-y-8 max-w-4xl">
            {/* General Settings */}
            <section className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">General Settings</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block mb-2 font-semibold">Custom Logo</label>
                        <div className="flex flex-col gap-4">
                            {/* URL Input */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Image URL</label>
                                <input 
                                    type="url" 
                                    placeholder="https://example.com/logo.png" 
                                    value={settings.logoUrl || ''} 
                                    onChange={handleLogoChange}
                                    className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Or Upload Image</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg border border-slate-600 transition flex items-center gap-2 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                        </svg>
                                        Choose File
                                        <input 
                                            type="file" 
                                            accept="image/png, image/jpeg, image/gif, image/webp" 
                                            onChange={handleLogoUpload}
                                            className="hidden" 
                                        />
                                    </label>
                                    <span className="text-xs text-slate-500">Accepted formats: PNG, JPG, GIF, WEBP.</span>
                                </div>
                            </div>
                        </div>
                        
                        {settings.logoUrl && (
                             <div className="mt-4 p-4 bg-slate-900 rounded-lg inline-block border border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Preview</p>
                                    <button onClick={() => onUpdateSettings({...settings, logoUrl: ''})} className="text-xs text-red-400 hover:text-red-300 ml-4">Remove</button>
                                </div>
                                <img src={settings.logoUrl} alt="Logo Preview" className="h-16 object-contain bg-slate-800 rounded" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block mb-2 font-semibold">First Day of Work Week</label>
                        <p className="text-xs text-slate-400 mb-2">This setting affects how timecards and weekly reports are grouped.</p>
                        <select 
                            value={settings.weekStartDay} 
                            onChange={handleWeekStartChange}
                            className="w-full md:w-1/2 p-3 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-teal-500 focus:outline-none"
                        >
                            {daysOfWeek.map((day, index) => (
                                <option key={index} value={index}>{day}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

             {/* Database Sync Settings */}
             <section className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                <h2 className="text-2xl font-bold text-teal-400 mb-4 flex items-center justify-between">
                    Data Synchronization
                    <span className={`text-sm px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
                        syncState?.connected ? 'bg-green-900 text-green-400 border border-green-700' :
                        syncState?.error ? 'bg-red-900 text-red-400 border border-red-700' :
                        'bg-slate-700 text-slate-400'
                    }`}>
                        {syncState?.connected ? 'Online' : syncState?.error ? 'Error' : 'Offline'}
                    </span>
                </h2>
                <div className="space-y-6">
                    <div className="bg-slate-900 p-4 rounded border border-slate-700">
                        <p className="text-sm text-slate-300 mb-2">
                            To sync multiple devices, run the included sync server on your main computer:
                        </p>
                        <code className="block bg-black p-2 rounded text-green-400 font-mono text-sm mb-4">
                            node sync-server.js
                        </code>
                        <label className="block mb-2 font-semibold">Remote Server URL</label>
                        <p className="text-xs text-slate-400 mb-2">
                            Format: <code>http://IP_ADDRESS:5984/db</code>
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="http://192.168.1.50:5984/db" 
                                value={localSyncUrl} 
                                onChange={handleSyncUrlChange}
                                className="flex-1 p-3 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-teal-500 focus:outline-none font-mono text-sm"
                            />
                            <button 
                                onClick={applySyncSettings}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 rounded-lg transition"
                            >
                                Apply
                            </button>
                        </div>
                        
                        {syncState?.error && (
                            <p className="mt-2 text-red-400 text-sm font-mono">
                                {syncState.error}
                            </p>
                        )}
                         {syncState?.connected && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-sm text-green-400">Sync Active</span>
                            </div>
                        )}
                    </div>
                    
                    {onWipeDatabase && (
                        <div className="pt-4 border-t border-slate-700">
                            <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Use this if you want to clear the local mock data and pull fresh data from the server.
                            </p>
                            <button 
                                onClick={() => {
                                    if(window.confirm("WARNING: This will delete ALL local data. Are you sure?")) {
                                        onWipeDatabase();
                                    }
                                }}
                                className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <TrashIcon className="w-5 h-5"/> Wipe Local Data & Reset
                            </button>
                        </div>
                    )}
                </div>
            </section>
            
            {/* Locations Settings */}
            <section className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">Locations</h2>
                <div className="mb-6">
                    <form onSubmit={handleAddLocation} className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm text-slate-400 mb-1">Location Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Warehouse A"
                                value={newLocation.name}
                                onChange={e => setNewLocation({...newLocation, name: e.target.value})}
                                className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:border-teal-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm text-slate-400 mb-1">Abbreviation</label>
                            <input 
                                type="text" 
                                placeholder="e.g. WHA"
                                value={newLocation.abbreviation}
                                onChange={e => setNewLocation({...newLocation, abbreviation: e.target.value.toUpperCase()})}
                                className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:border-teal-500 focus:outline-none"
                                required
                            />
                        </div>
                        <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" /> Add
                        </button>
                    </form>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                                <th className="p-3">Name</th>
                                <th className="p-3">Abbreviation</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {locations.map(loc => (
                                <tr key={loc.id} className="hover:bg-slate-700/30">
                                    <td className="p-3">{loc.name}</td>
                                    <td className="p-3 font-mono">{loc.abbreviation}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 hover:text-red-300">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Departments Settings */}
            <section className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">Departments</h2>
                <div className="mb-6">
                    <form onSubmit={handleAddDepartment} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-1">Department Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Sales"
                                value={newDepartment}
                                onChange={e => setNewDepartment(e.target.value)}
                                className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:border-teal-500 focus:outline-none"
                                required
                            />
                        </div>
                        <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" /> Add
                        </button>
                    </form>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                                <th className="p-3">Name</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {departments.map(dep => (
                                <tr key={dep.id} className="hover:bg-slate-700/30">
                                    <td className="p-3">{dep.name}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleDeleteDepartment(dep.id)} className="text-red-400 hover:text-red-300">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default SettingsView;
