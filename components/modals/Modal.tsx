import React from 'react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" aria-modal="true">
    <div className="bg-slate-800 p-6 rounded-lg shadow-2xl relative w-full max-w-lg text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-teal-400" style={{ fontSize: 'var(--step-2)' }}>{title}</h2>
        <button onClick={onClose} className="text-3xl text-slate-400 hover:text-white leading-none">&times;</button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
