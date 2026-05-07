"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/env";
import { sessionCreateResponseSchema } from "@/lib/schemas";

const SESSION_STORAGE_KEY = "snaptrip_session_id";

type SessionState =
  | { status: "loading"; label: string }
  | { status: "ready"; label: string }
  | { status: "error"; label: string };

export function SessionBootstrap() {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    label: "Menyiapkan session perjalanan"
  });

  useEffect(() => {
    const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existingSessionId) {
      setState({
        status: "ready",
        label: `Session aktif: ${existingSessionId}`
      });
      return;
    }

    async function createSession() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          setState({
            status: "error",
            label: "Session belum bisa dibuat"
          });
          return;
        }

        const payload = sessionCreateResponseSchema.parse(await response.json());
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          payload.data.session_id
        );
        setState({
          status: "ready",
          label: `Session aktif: ${payload.data.session_id}`
        });
      } catch {
        setState({
          status: "error",
          label: "Session belum terhubung ke backend"
        });
      }
    }

    void createSession();
  }, []);

  return (
    <div className={`status ${state.status === "ready" ? "statusOk" : ""}`}>
      <span className="statusDot" aria-hidden="true" />
      <span>{state.label}</span>
    </div>
  );
}
