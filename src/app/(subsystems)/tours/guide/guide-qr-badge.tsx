export function GuideQrBadge({
  guideId,
  fullName,
  qrDataUrl,
}: {
  guideId: string;
  fullName: string;
  qrDataUrl: string;
}) {
  return (
    <section className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-daet-ink/10 bg-white p-6 text-center shadow-card sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-daet-leaf">CONNECT-DAET · Local Guide</p>
        <h1 className="mt-2 text-2xl font-black text-daet-ink">{fullName}</h1>
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
          <img src={qrDataUrl} alt={`Approved guide QR code for ${fullName}`} width={420} height={420} className="h-56 w-56 sm:h-64 sm:w-64" />
        </div>
        <p className="mt-4 text-sm font-bold text-emerald-800">Accredited guide</p>
        <p className="mt-1 break-all text-[10px] text-daet-ink/45">Guide reference · {guideId}</p>
        <p className="mt-3 text-xs leading-5 text-daet-ink/55">This QR contains only a guide reference, not ID information.</p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={qrDataUrl}
          download={`connect-daet-guide-badge-${guideId.slice(0, 8)}.png`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-daet-forest px-6 text-sm font-bold text-white transition hover:bg-daet-ink"
        >
          Download QR as PNG
        </a>
      </div>
    </section>
  );
}
