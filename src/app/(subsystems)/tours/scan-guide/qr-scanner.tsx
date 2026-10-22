"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function QrScanner() {
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCamera(false);
      setError("Camera access denied. Please enable camera permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Manual input fallback
  const [manualInput, setManualInput] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      // Extract guide ID from URL or use directly
      const guideId = manualInput.includes("/verify-guide/")
        ? manualInput.split("/verify-guide/")[1].split("?")[0]
        : manualInput.trim();
      
      router.push(`/tours/verify-guide/${guideId}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Simple QR detection using canvas (basic implementation)
  const captureAndCheck = async () => {
    if (!videoRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // In a real implementation, you'd use a QR code library like jsQR here
    // For now, we'll provide manual input as the primary method
  };

  return (
    <div className="space-y-6">
      {/* Camera View */}
      {hasCamera && (
        <div className="overflow-hidden rounded-3xl border border-daet-ink/10 bg-black shadow-sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
            style={{ maxHeight: "400px" }}
          />
          {!isScanning && (
            <div className="flex items-center justify-center bg-daet-ink/90 p-12">
              <button
                onClick={startCamera}
                className="rounded-full bg-daet-forest px-8 py-4 font-bold text-white transition hover:bg-emerald-600"
              >
                📷 Start Camera
              </button>
            </div>
          )}
        </div>
      )}

      {isScanning && (
        <div className="text-center">
          <button
            onClick={stopCamera}
            className="rounded-full border border-daet-ink/20 px-6 py-3 font-bold text-daet-ink transition hover:bg-daet-sand"
          >
            Stop Camera
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm font-bold text-rose-900">{error}</p>
        </div>
      )}

      {/* Manual Input Alternative */}
      <div className="rounded-3xl border border-daet-ink/10 bg-white p-6">
        <h3 className="mb-4 text-lg font-black text-daet-ink">
          Or enter Guide ID manually:
        </h3>
        <form onSubmit={handleManualSubmit} className="flex gap-3">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Guide ID or scan URL"
            className="flex-1 rounded-full border border-daet-ink/20 px-4 py-3 text-sm focus:border-daet-forest focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-daet-forest px-6 py-3 font-bold text-white transition hover:bg-daet-ink"
          >
            Verify →
          </button>
        </form>
        <p className="mt-3 text-xs text-daet-ink/60">
          Ask your guide for their ID if you can't scan the QR code
        </p>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-daet-ink/60">
        <p>💡 Tip: Make sure the QR code is well-lit and in focus</p>
      </div>
    </div>
  );
}
