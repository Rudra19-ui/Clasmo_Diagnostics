#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "Starting Clasmo Diagnostics on port ${PORT}..."

python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','clasmo_backend.settings'); import django; django.setup(); from django.conf import settings; print('ALLOWED_HOSTS =', settings.ALLOWED_HOSTS); print('DEBUG =', settings.DEBUG)"

bootstrap() {
  echo "Background bootstrap: waiting for PostgreSQL..."
  if ! python wait_for_db.py; then
    echo "WARNING: database wait failed; will keep retrying migrations."
  fi

  attempt=1
  while [ "$attempt" -le 30 ]; do
    if python manage.py migrate --noinput; then
      echo "Migrations complete."
      python manage.py seed_data || true
      python manage.py seed_clinical_data || true
      echo "Background bootstrap finished."
      return 0
    fi
    echo "Migration attempt ${attempt}/30 failed, retrying in 5s..."
    sleep 5
    attempt=$((attempt + 1))
  done

  echo "WARNING: migrations did not complete after 30 attempts."
}

bootstrap &

echo "Launching Gunicorn on 0.0.0.0:${PORT} (health check ready immediately)..."
exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
