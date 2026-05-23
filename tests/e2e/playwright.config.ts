import { defineConfig } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
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
  webServer: [
    {
      command: "uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: path.join(repoRoot, "app/backend"),
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ...windowsShellEnv,
        SNAPTRIP_STORAGE: "memory",
        MONGODB_URI: "memory://snaptrip",
        APP_ENV: "test",
        CLASSIFIER_MODE: "mock",
        SESSION_SECRET: "test-session-secret",
        USE_GEMINI: "false",
        USE_GOOGLE_PLACES: "false",
        GEMINI_API_KEY: "",
        GOOGLE_PLACES_API_KEY: "",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      cwd: path.join(repoRoot, "app/frontend"),
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ...windowsShellEnv,
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY: "",
      },
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:3000"
  }
});
