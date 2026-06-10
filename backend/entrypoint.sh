#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "Starting Clasmo Diagnostics on port ${PORT}..."

echo "Waiting for PostgreSQL..."
python wait_for_db.py

echo "Running migrations..."
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

echo "Starting background seed (non-blocking)..."
(python manage.py seed_data && python manage.py seed_clinical_data || true) &

echo "Launching Gunicorn on 0.0.0.0:${PORT}..."
python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','clasmo_backend.settings'); import django; django.setup(); from django.conf import settings; print('ALLOWED_HOSTS =', settings.ALLOWED_HOSTS); print('DEBUG =', settings.DEBUG)"
exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
