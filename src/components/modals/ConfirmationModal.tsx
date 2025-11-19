import React from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => (
    <Modal onClose={onCancel} title={title}>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-4">
            <button onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg">Cancel</button>
            <button onClick={onConfirm} className="py-2 px-6 bg-red-600 hover:bg-red-500 rounded-lg">Confirm</button>
        </div>
    </Modal>
);

export default ConfirmationModal;