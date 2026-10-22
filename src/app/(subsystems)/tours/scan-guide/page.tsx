import { PageFrame } from "@/components/ui/page-frame";
import { QrScanner } from "./qr-scanner";

export const dynamic = "force-dynamic";

export default function ScanGuidePage() {
  return (
    <PageFrame>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-daet-ink">Scan Guide QR Code</h1>
          <p className="mt-3 text-daet-ink/60">
            Point your camera at the guide's QR badge to verify their identity
          </p>
        </div>

        <QrScanner />

        <div className="mt-8 rounded-3xl border border-daet-ink/10 bg-daet-sand/20 p-6">
          <h2 className="text-lg font-black text-daet-ink">How it works:</h2>
          <ol className="mt-4 space-y-2 text-sm text-daet-ink/80">
            <li className="flex gap-3">
              <span className="font-black">1.</span>
              <span>Ask your tour guide to show their QR badge</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black">2.</span>
              <span>Point your camera at the QR code</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black">3.</span>
              <span>View their profile and verify they're assigned to your tour</span>
            </li>
          </ol>
        </div>
      </div>
    </PageFrame>
  );
}
