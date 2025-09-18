"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  QrCodeService,
  ScanResult,
  ScanError,
} from "../../lib/services/QrCodeService";

interface QrScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: ScanError) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
}

const QrScanner: React.FC<QrScannerProps> = ({
  onScan,
  onError,
  onClose,
  isOpen,
  title = "Scan QR Code or Barcode",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrServiceRef = useRef<QrCodeService | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);

  // Initialize QR service
  useEffect(() => {
    qrServiceRef.current = new QrCodeService();
    setCameraSupported(QrCodeService.isCameraSupported());

    return () => {
      if (qrServiceRef.current) {
        qrServiceRef.current.stopScanning();
      }
    };
  }, []);

  // Handle scan result
  const handleScanResult = useCallback(
    (result: ScanResult) => {
      setIsScanning(false);
      onScan(result);
      onClose();
    },
    [onScan, onClose]
  );

  // Handle scan error
  const handleScanError = useCallback(
    (scanError: ScanError) => {
      setError(scanError.message);
      if (onError) {
        onError(scanError);
      }
    },
    [onError]
  );

  // Start camera scanning
  const startCameraScanning = useCallback(async () => {
    if (!videoRef.current || !qrServiceRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      await qrServiceRef.current.startScanning(
        videoRef.current,
        handleScanResult,
        handleScanError
      );
    } catch (err) {
      setIsScanning(false);
      setError(err instanceof Error ? err.message : "Failed to start camera");
    }
  }, [handleScanResult, handleScanError]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (qrServiceRef.current) {
      qrServiceRef.current.stopScanning();
    }
    setIsScanning(false);
    setError(null);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !qrServiceRef.current) return;

      try {
        setError(null);
        const result = await qrServiceRef.current.scanImageFile(file);
        handleScanResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to scan image");
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleScanResult]
  );

  // Start scanning when modal opens
  useEffect(() => {
    if (isOpen && cameraSupported) {
      startCameraScanning();
    }

    return () => {
      if (isOpen) {
        stopScanning();
      }
    };
  }, [isOpen, cameraSupported, startCameraScanning, stopScanning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Camera View */}
        {cameraSupported ? (
          <div className="mb-4">
            <div
              className="relative bg-black rounded-lg overflow-hidden"
              style={{ aspectRatio: "4/3" }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white border-dashed rounded-lg w-48 h-48 flex items-center justify-center">
                  {isScanning ? (
                    <div className="text-white text-center">
                      <div className="animate-pulse mb-2">
                        <svg
                          className="w-8 h-8 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01M12 12v4.01"
                          />
                        </svg>
                      </div>
                      <p className="text-sm">Scanning...</p>
                    </div>
                  ) : (
                    <div className="text-white text-center">
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01M12 12v4.01"
                        />
                      </svg>
                      <p className="text-sm">Position code in frame</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center mt-4 space-x-4">
              {!isScanning ? (
                <button
                  onClick={startCameraScanning}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Start Scanning
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Stop Scanning
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="text-sm">
              Camera access is not supported in this browser. You can still
              upload an image file to scan.
            </p>
          </div>
        )}

        {/* File Upload Option */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Or upload an image file:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tips:</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>• Hold the camera steady and ensure good lighting</li>
            <li>• Position the QR code or barcode clearly in the frame</li>
            <li>• For best results, scan from 6-12 inches away</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
