import { defineConfig } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const apiPort = process.env.E2E_API_PORT || "8000";
const webPort = process.env.E2E_WEB_PORT || "3000";
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const windowsShellEnv = {
  ComSpec: process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
  COMSPEC: process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
  SystemRoot: process.env.SystemRoot || "C:\\Windows",
  WINDIR: process.env.WINDIR || "C:\\Windows",
  Path: process.env.Path || process.env.PATH || "",
  PATH: process.env.PATH || "",
};

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  workers: 1,
  webServer: [
    {
      command: `uv run uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: path.join(repoRoot, "app/backend"),
      url: `${apiBaseUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ...windowsShellEnv,
        SNAPTRIP_STORAGE: "memory",
        MONGODB_URI: "memory://snaptrip",
        APP_ENV: "test",
        CORS_ORIGINS: `${webBaseUrl},http://localhost:${webPort}`,
        CLASSIFIER_MODE: "mock",
        SESSION_SECRET: "test-session-secret",
        USE_GEMINI: "false",
        USE_GOOGLE_PLACES: "false",
        GEMINI_API_KEY: "",
        GOOGLE_PLACES_API_KEY: "",
      },
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${webPort}`,
      cwd: path.join(repoRoot, "app/frontend"),
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ...windowsShellEnv,
        NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
        NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY: "",
      },
    },
  ],
  use: {
    baseURL: webBaseUrl
  }
});
