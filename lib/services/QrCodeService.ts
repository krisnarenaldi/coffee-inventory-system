import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

export interface ScanResult {
  text: string;
  format: string;
}

export interface ScanError {
  message: string;
  code?: string;
}

export class QrCodeService {
  private codeReader: BrowserMultiFormatReader;
  private isScanning: boolean = false;
  private currentStream: MediaStream | null = null;

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
  }

  /**
   * Start scanning for QR codes/barcodes using the device camera
   * @param videoElement - HTML video element to display camera feed
   * @param onResult - Callback function when a code is successfully scanned
   * @param onError - Callback function when an error occurs
   */
  async startScanning(
    videoElement: HTMLVideoElement,
    onResult: (result: ScanResult) => void,
    onError: (error: ScanError) => void
  ): Promise<void> {
    if (this.isScanning) {
      throw new Error("Scanner is already running");
    }

    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser");
      }

      this.isScanning = true;

      // Get available video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Prefer back camera for mobile devices
      const preferredDevice =
        videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear")
        ) || videoDevices[0];

      // Start scanning with the preferred device
      await this.codeReader.decodeFromVideoDevice(
        preferredDevice.deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            onResult({
              text: result.getText(),
              format: result.getBarcodeFormat().toString(),
            });
          }

          if (error && !(error instanceof NotFoundException)) {
            onError({
              message: error.message || "Unknown scanning error",
              code: error.name,
            });
          }
        }
      );

      // Store the current stream for cleanup
      this.currentStream = videoElement.srcObject as MediaStream;
    } catch (error) {
      this.isScanning = false;
      onError({
        message:
          error instanceof Error ? error.message : "Failed to start camera",
        code: "CAMERA_ERROR",
      });
    }
  }

  /**
   * Stop the current scanning session
   */
  stopScanning(): void {
    if (!this.isScanning) {
      return;
    }

    try {
      // Stop the code reader
      this.codeReader.reset();

      // Stop all video tracks
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.currentStream = null;
      }

      this.isScanning = false;
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  }

  /**
   * Scan a single image file for QR codes/barcodes
   * @param file - Image file to scan
   * @returns Promise with scan result
   */
  async scanImageFile(file: File): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const imageUrl = event.target?.result as string;
          const result = await this.codeReader.decodeFromImageUrl(imageUrl);

          resolve({
            text: result.getText(),
            format: result.getBarcodeFormat().toString(),
          });
        } catch (error) {
          reject(
            new Error(
              error instanceof NotFoundException
                ? "No QR code or barcode found in the image"
                : "Failed to scan image"
            )
          );
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image file"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if the browser supports camera access
   */
  static isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get available camera devices
   */
  static async getCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error getting camera devices:", error);
      return [];
    }
  }

  /**
   * Check if currently scanning
   */
  get scanning(): boolean {
    return this.isScanning;
  }

  /**
   * Parse ingredient data from scanned QR code
   * Expected format: JSON string with ingredient information
   */
  static parseIngredientData(scannedText: string): any {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(scannedText);

      // Validate that it contains ingredient-related fields
      if (data.name || data.batchNumber || data.id) {
        return data;
      }

      // If not JSON or doesn't contain expected fields, treat as simple text
      return {
        text: scannedText,
        type: "unknown",
      };
    } catch (error) {
      // If not valid JSON, treat as barcode/simple text
      return {
        text: scannedText,
        type: "barcode",
      };
    }
  }
}

export default QrCodeService;
