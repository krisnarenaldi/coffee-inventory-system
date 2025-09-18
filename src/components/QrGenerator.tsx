"use client";

import React, { useState, useRef } from "react";

interface QrGeneratorProps {
  data: any;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
}

const QrGenerator: React.FC<QrGeneratorProps> = ({
  data,
  onClose,
  isOpen,
  title = "Generate QR Code",
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code using a free API service
  const generateQrCode = async () => {
    setLoading(true);
    try {
      const qrData = JSON.stringify(data);
      const encodedData = encodeURIComponent(qrData);

      // Using QR Server API (free service)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download QR code as image
  const downloadQrCode = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-code-${data.name || data.id || "ingredient"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  // Print QR code
  const printQrCode = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${data.name || "Ingredient"}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                text-align: center;
              }
              .qr-container {
                max-width: 400px;
                margin: 0 auto;
              }
              .qr-code {
                width: 100%;
                height: auto;
                border: 1px solid #ddd;
                margin: 20px 0;
              }
              .info {
                margin: 10px 0;
                font-size: 14px;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${data.name || "Ingredient"}</h2>
              <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
              <div class="info">ID: ${data.id || "N/A"}</div>
              <div class="info">Batch: ${data.batchNumber || "N/A"}</div>
              <div class="info">Type: ${data.type || "N/A"}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  React.useEffect(() => {
    if (isOpen && data) {
      generateQrCode();
    }
  }, [isOpen, data]);

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

        {/* Ingredient Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            {data.name || "Ingredient"}
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <strong>ID:</strong> {data.id || "N/A"}
            </div>
            {data.batchNumber && (
              <div>
                <strong>Batch:</strong> {data.batchNumber}
              </div>
            )}
            {data.type && (
              <div>
                <strong>Type:</strong> {data.type}
              </div>
            )}
            {data.stockQuantity !== undefined && (
              <div>
                <strong>Stock:</strong> {data.stockQuantity}{" "}
                {data.unitOfMeasure || ""}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="text-center mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : qrCodeUrl ? (
            <div className="bg-white p-4 rounded-lg border">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
                onError={() => setQrCodeUrl(null)}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Failed to generate QR code
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {qrCodeUrl && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={downloadQrCode}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download
            </button>
            <button
              onClick={printQrCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Usage:</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>
              • Print and attach this QR code to your ingredient container
            </li>
            <li>• Scan the code to quickly access ingredient information</li>
            <li>• Use for inventory updates and tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QrGenerator;
