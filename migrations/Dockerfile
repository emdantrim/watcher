FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY shared/ ./shared/
COPY migrations/ ./migrations/
COPY alembic.ini .

# Run migrations
CMD ["uv", "run", "alembic", "upgrade", "head"]