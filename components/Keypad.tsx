
import React, { useState } from 'react';

interface KeypadProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error: string | null;
}

const Keypad: React.FC<KeypadProps> = ({ onSubmit, onCancel, error }) => {
  const [pin, setPin] = useState('');

  const handleKeyPress = (key: string) => {
    if (pin.length < 4) {
      setPin(pin + key);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = () => {
    onSubmit(pin);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex flex-col items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl p-6 text-white">
        <h2 className="text-2xl font-bold text-center mb-4">Enter Your PIN</h2>
        <div className="w-full h-16 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
          <p className="text-4xl tracking-[1em] text-center font-mono">
            {'*'.repeat(pin.length).padEnd(4, ' ')}
          </p>
        </div>
        {error && <p className="text-red-400 text-center mb-2">{error}</p>}
        <div className="grid grid-cols-3 gap-4">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="py-4 text-3xl font-bold bg-slate-700 rounded-lg hover:bg-teal-500 transition-colors duration-200"
            >
              {key}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="py-4 text-xl font-bold bg-slate-600 rounded-lg hover:bg-yellow-500 transition-colors duration-200"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-4 text-3xl font-bold bg-slate-700 rounded-lg hover:bg-teal-500 transition-colors duration-200"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-4 text-xl font-bold bg-slate-600 rounded-lg hover:bg-red-500 transition-colors duration-200"
          >
            Del
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={onCancel}
            className="py-4 text-xl bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="py-4 text-xl bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Keypad;
