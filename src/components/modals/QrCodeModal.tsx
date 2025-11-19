import React, { useEffect, useRef } from 'react';
// @ts-ignore
import QRCode from 'qrcode';
import type { Employee } from '../../types';
import Modal from './Modal';

interface QrCodeModalProps {
    employee: Employee;
    onClose: () => void;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ employee, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, employee.id, { width: 256, margin: 1 }, (error: any) => {
                if (error) console.error(error);
            });
        }
    }, [employee.id]);

    const handlePrint = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the QR code.');
            return;
        }
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR Code for ${employee.name}</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; margin-top: 50px; }
                        img { display: block; margin-left: auto; margin-right: auto; }
                        h1 { font-size: 24px; }
                        p { font-size: 16px; color: #555; }
                    </style>
                </head>
                <body onafterprint="window.close()">
                    <h1>${employee.name}</h1>
                    <p>Employee ID: ${employee.id}</p>
                    <img src="${canvas.toDataURL('image/png')}" />
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Modal onClose={onClose} title={`QR Code for ${employee.name}`}>
            <div className="flex flex-col items-center justify-center p-4">
                <canvas ref={canvasRef} />
                <div className="flex justify-end gap-4 pt-6 w-full">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg">Close</button>
                    <button type="button" onClick={handlePrint} className="py-2 px-6 bg-sky-600 hover:bg-sky-500 rounded-lg">Print</button>
                </div>
            </div>
        </Modal>
    );
};

export default QrCodeModal;