import React, { useEffect, useState, useRef } from 'react';
// @ts-ignore
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

const qrCodeRegionId = 'qr-code-reader';

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onCancel }) => {
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const qrCodeSuccessCallback = (decodedText: string) => {
      onScanSuccess(decodedText);
    };
    
    const qrCodeErrorCallback = (errorMessage: string) => {
      // parse error, ignore.
    };

    const startScanner = async () => {
      if (html5QrCodeRef.current) {
          return;
      }
      
      const newScanner = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = newScanner;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const cameraId = devices[devices.length - 1].id;
          
          await newScanner.start(
            cameraId,
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } else {
          setError("No cameras found on this device.");
        }
      } catch (err: any) {
        console.error("Error initializing scanner.", err);
        if (err.name === 'NotAllowedError') {
          setError("Camera access was denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError") {
            setError("No camera found. Please ensure a camera is connected and enabled.");
        } else {
          setError(`Failed to start scanner: ${err.message || 'Unknown error'}`);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch((err: any) => {
          console.error("Failed to stop the scanner on cleanup.", err);
        });
        html5QrCodeRef.current = null;
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 z-50">
      <div className="w-full max-w-md mx-auto">
        <div id={qrCodeRegionId} className="w-full border-4 border-slate-700 rounded-lg overflow-hidden relative bg-black aspect-square">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-red-400">
              {error}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[250px] h-[250px] border-4 border-teal-400 rounded-lg animate-pulse"></div>
            </div>
          )}
        </div>
        {!error && <p className="text-white text-center mt-4 text-lg">Position your QR code inside the frame.</p>}
        <button
          onClick={onCancel}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-lg text-xl transition duration-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Scanner;