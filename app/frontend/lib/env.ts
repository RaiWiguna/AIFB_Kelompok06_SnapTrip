export const env = {
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000",
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY || "",
}

