# SnapTrip

SnapTrip adalah MVP rekomendasi perjalanan berbasis AI. Sprint 0 menyiapkan fondasi project, dependency, backend FastAPI minimal, frontend Next.js minimal, PostgreSQL config, dan health check.

## Struktur

```text
backend/   FastAPI app
frontend/  Next.js app
data/      Seed data dan artifact lokal non-database
models/    Artifact model ML
tests/     Pytest suite
docs/      Source of truth product dan contract
```

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Siapkan PostgreSQL lokal dengan database dan user sesuai `.env.example`, atau ubah `DATABASE_URL` di `.env`.

Opsi cepat dengan Docker:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

## Run Backend

```bash
uvicorn backend.app.main:app --reload
```

Health check:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/api/health
```

Session API:

```text
POST http://127.0.0.1:8000/api/sessions
GET  http://127.0.0.1:8000/api/sessions/{session_id}
```

Endpoint session akan membuat tabel database dan seed destinasi awal saat dipanggil.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:3000
```

Frontend membaca backend dari:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Tests

```bash
pytest
```
