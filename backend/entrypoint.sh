#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "Starting Clasmo Diagnostics on port ${PORT}..."

echo "Waiting for database..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if python manage.py migrate --noinput; then
    echo "Migrations complete."
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "Migration failed after 10 attempts."
    exit 1
  fi
  echo "Migration attempt ${i} failed, retrying in 5s..."
  sleep 5
done

if [ "$RUN_SEED" = "true" ]; then
  python manage.py seed_data || true
  python manage.py seed_clinical_data || true
fi

echo "Launching Gunicorn on 0.0.0.0:${PORT}..."
exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
