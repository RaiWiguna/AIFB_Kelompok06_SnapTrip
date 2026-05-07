import { UploadCloud } from "lucide-react";
import { getApiBaseUrl } from "@/lib/env";
import { SessionBootstrap } from "@/app/session-bootstrap";

async function getHealthStatus() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, label: "Backend belum siap" };
    }

    const payload = await response.json();
    return {
      ok: true,
      label: `${payload.data.service} aktif (${payload.data.environment})`
    };
  } catch {
    return { ok: false, label: "Backend belum terhubung" };
  }
}

export default async function HomePage() {
  const health = await getHealthStatus();

  return (
    <main className="shell">
      <div className="workspace">
        <section className="panel">
          <p className="eyebrow">SnapTrip MVP</p>
          <h1>Rekomendasi perjalanan dari foto referensi.</h1>
          <p>
            Frontend Next.js ini menjadi fondasi flow upload, rekomendasi,
            detail destinasi, dan itinerary planner. Proses AI dan external API
            tetap lewat backend FastAPI.
          </p>

          <div className={`status ${health.ok ? "statusOk" : ""}`}>
            <span className="statusDot" aria-hidden="true" />
            <span>{health.label}</span>
          </div>
          <SessionBootstrap />
        </section>

        <section className="panel">
          <h2>Upload Foto Referensi</h2>
          <div className="uploadBox">
            <div>
              <UploadCloud size={36} aria-hidden="true" />
              <p>Pilih 1 sampai 5 gambar JPG atau PNG.</p>
            </div>
          </div>
          <div className="actions">
            <button className="button" disabled>
              Analisis Preferensi
            </button>
            <button className="button buttonSecondary" disabled>
              Pilih Manual
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
