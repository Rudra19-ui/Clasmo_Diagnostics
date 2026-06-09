#!/bin/sh
set -e

python manage.py migrate --noinput

if [ "$RUN_SEED" = "true" ]; then
  python manage.py seed_data
  python manage.py seed_clinical_data || true
fi

exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout 120
