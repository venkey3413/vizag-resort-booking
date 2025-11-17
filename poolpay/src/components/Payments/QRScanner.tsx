import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (upiId: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const stopScan = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  };

  const handleManualInput = (upiId: string) => {
    if (upiId.includes('@')) {
      onScan(upiId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scan UPI QR Code</h3>
          <button onClick={onClose} className="text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!scanning ? (
          <div className="space-y-4">
            <button
              onClick={startScan}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
            <div className="text-center text-gray-500">or</div>
            <input
              type="text"
              placeholder="Enter UPI ID manually"
              className="w-full px-4 py-2 border rounded-lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualInput(e.currentTarget.value);
                }
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded-lg"
            />
            <button
              onClick={stopScan}
              className="w-full bg-red-600 text-white py-2 rounded-lg"
            >
              Stop Scanning
            </button>
          </div>
        )}
      </div>
    </div>
  );
}