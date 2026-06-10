"""Wait until PostgreSQL is reachable before running migrations."""
import os
import socket
import sys
import time
from urllib.parse import urlparse

MAX_ATTEMPTS = 30
SLEEP_SECONDS = 3


def get_database_urls():
    urls = []
    for key in ('DATABASE_URL', 'DATABASE_PUBLIC_URL'):
        url = os.environ.get(key, '')
        if url.startswith('postgres') and url not in urls:
            urls.append(url)
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
        'Railway setup checklist:\n'
        '  1. Add a PostgreSQL database to the same project/environment.\n'
        '  2. On the web service Variables, set:\n'
        '     DATABASE_URL=${{Postgres.DATABASE_URL}}\n'
        '     DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}\n'
        '     (use your Postgres service name if it is not "Postgres")\n',
        flush=True,
    )
    return 1


if __name__ == '__main__':
    sys.exit(main())
