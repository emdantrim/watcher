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
COPY watcher-checker/ ./watcher-checker/

# Run the checker service
CMD ["uv", "run", "python", "-m", "watcher-checker.main"]
