import React, { useState } from 'react';

interface AdminLoginProps {
    onLogin: () => void;
    onCancel: () => void;
    error: string | null;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel, error }) => {
  const [password, setPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onLogin();
    } else {
      setCurrentError('Invalid password.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex flex-col items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl p-8 text-white">
        <h2 className="font-bold text-center mb-6 text-teal-400" style={{ fontSize: 'var(--step-3)' }}>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full h-14 bg-slate-900 rounded-lg text-center text-2xl mb-4 p-2 text-white"
            aria-label="Admin Password"
          />
          {(error || currentError) && <p className="text-red-400 text-center mb-4">{error || currentError}</p>}
          <button type="submit" className="w-full py-4 text-xl bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 mb-4">
            Login
          </button>
          <button type="button" onClick={onCancel} className="w-full py-3 text-lg bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors duration-200">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
