#!/bin/sh
set -e

PORT="${PORT:-8000}"
echo "Starting Clasmo Diagnostics on port ${PORT}..."

python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','clasmo_backend.settings'); import django; django.setup(); from django.conf import settings; print('ALLOWED_HOSTS =', settings.ALLOWED_HOSTS); print('DEBUG =', settings.DEBUG); print('DB ENGINE =', settings.DATABASES['default']['ENGINE'])"

echo "Waiting for PostgreSQL..."
if ! python wait_for_db.py; then
  echo "ERROR: database is not reachable."
  exit 1
fi

attempt=1
while [ "$attempt" -le 30 ]; do
  if python manage.py migrate --noinput; then
    echo "Migrations complete."
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "ERROR: migrations failed after 30 attempts."
    exit 1
  fi
  echo "Migration attempt ${attempt}/30 failed, retrying in 5s..."
  sleep 5
  attempt=$((attempt + 1))
done

python manage.py ensure_trial_users
python manage.py seed_data || true
python manage.py seed_clinical_data || true

python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); print('Trial admin exists:', User.objects.filter(username='admin_test').exists())"

echo "Launching Gunicorn on 0.0.0.0:${PORT}..."
exec gunicorn clasmo_backend.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
