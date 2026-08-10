#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "Starting Clasmo Diagnostics on port ${PORT}..."

python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','clasmo_backend.settings'); import django; django.setup(); from django.conf import settings; print('ALLOWED_HOSTS =', settings.ALLOWED_HOSTS); print('DEBUG =', settings.DEBUG); print('DB ENGINE =', settings.DATABASES['default']['ENGINE']); print('DB HOST =', settings.DATABASES['default'].get('HOST')); print('DATABASE_URL set =', bool(os.environ.get('DATABASE_URL'))); print('DATABASE_PUBLIC_URL set =', bool(os.environ.get('DATABASE_PUBLIC_URL')))"

python check_db_env.py || exit 1

bootstrap() {
  echo "Background bootstrap: waiting for PostgreSQL..."
  if ! python wait_for_db.py; then
    echo "WARNING: database wait failed; will keep retrying migrations."
  fi

  attempt=1
  while [ "$attempt" -le 30 ]; do
    if python manage.py migrate --noinput; then
      echo "Migrations complete."
      python manage.py ensure_trial_users || true
      python manage.py seed_data || true
      python manage.py seed_clinical_data || true
      python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); print('Admin login exists:', User.objects.filter(username='admin', is_active=True).exists())" || true
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

echo "Launching Gunicorn on 0.0.0.0:${PORT} (liveness at /health/live/)..."
exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
