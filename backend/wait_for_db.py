"""Wait until PostgreSQL is reachable before running migrations."""
import os
import socket
import sys
import time
from urllib.parse import urlparse

MAX_ATTEMPTS = 30
SLEEP_SECONDS = 3


def get_database_urls():
    """Try public URL first; skip unreachable railway.internal when public exists."""
    public = os.environ.get('DATABASE_PUBLIC_URL', '').strip()
    internal = os.environ.get('DATABASE_URL', '').strip()
    urls = []

    if public.startswith('postgres'):
        urls.append(public)

    if internal.startswith('postgres') and internal not in urls:
        if 'railway.internal' in internal and public:
            print(
                'Skipping postgres.railway.internal because DATABASE_PUBLIC_URL is set.',
                flush=True,
            )
        else:
            urls.append(internal)

    return urls


def wait_for_host(host, port, max_attempts=MAX_ATTEMPTS, sleep_seconds=SLEEP_SECONDS):
    for attempt in range(1, max_attempts + 1):
        try:
            socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            with socket.create_connection((host, port), timeout=5):
                return True
        except (OSError, socket.gaierror) as exc:
            print(f'Database host not ready ({attempt}/{max_attempts}): {exc}', flush=True)
            time.sleep(sleep_seconds)
    return False


def wait_for_django_connection(max_attempts=MAX_ATTEMPTS, sleep_seconds=SLEEP_SECONDS):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clasmo_backend.settings')
    import django

    django.setup()
    from django.db import connection

    for attempt in range(1, max_attempts + 1):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            print('Django database connection verified.', flush=True)
            return True
        except Exception as exc:
            print(f'Django database not ready ({attempt}/{max_attempts}): {exc}', flush=True)
            connection.close()
            time.sleep(sleep_seconds)
    return False


def main():
    database_urls = get_database_urls()
    if not database_urls:
        print('No PostgreSQL URL configured; skipping database wait.', flush=True)
        return 0

    for database_url in database_urls:
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        if not host:
            continue
        print(f'Waiting for PostgreSQL at {host}:{port}...', flush=True)
        if wait_for_host(host, port):
            print('PostgreSQL host is reachable.', flush=True)
            if wait_for_django_connection():
                return 0

    print(
        '\nERROR: Could not connect to PostgreSQL.\n'
        'If logs mention postgres.railway.internal, set DATABASE_PUBLIC_URL on the '
        'WEB service to the Postgres Connect → Public URL (xxxx.proxy.rlwy.net).\n',
        flush=True,
    )
    return 1


if __name__ == '__main__':
    sys.exit(main())
