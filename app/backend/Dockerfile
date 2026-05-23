FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:${PATH}"

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /uvx /bin/

COPY app/backend/pyproject.toml app/backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/backend/app ./app
RUN python -m compileall app

RUN useradd --create-home --shell /usr/sbin/nologin snaptrip
USER snaptrip

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
