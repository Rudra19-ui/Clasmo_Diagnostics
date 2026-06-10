"""Wait until PostgreSQL is reachable before running migrations."""
import os
import socket
import sys
import time
from urllib.parse import urlparse

MAX_ATTEMPTS = 60
SLEEP_SECONDS = 5


def get_database_url():
    return os.environ.get('DATABASE_URL') or os.environ.get('DATABASE_PUBLIC_URL') or ''


def wait_for_host(host, port):
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            with socket.create_connection((host, port), timeout=5):
                return True
        except (OSError, socket.gaierror) as exc:
            print(f'Database not ready ({attempt}/{MAX_ATTEMPTS}): {exc}', flush=True)
            time.sleep(SLEEP_SECONDS)
    return False


def main():
    database_url = get_database_url()
    if not database_url.startswith('postgres'):
        print('No PostgreSQL URL configured; skipping database wait.', flush=True)
        return 0

    parsed = urlparse(database_url)
    host = parsed.hostname
    port = parsed.port or 5432

    if not host:
        print('ERROR: DATABASE_URL is missing a hostname.', flush=True)
        return 1

    print(f'Waiting for PostgreSQL at {host}:{port}...', flush=True)
    if wait_for_host(host, port):
        print('PostgreSQL is reachable.', flush=True)
        return 0

    print(
        '\nERROR: Could not connect to PostgreSQL.\n'
        'Railway setup checklist:\n'
        '  1. Add a PostgreSQL database to the same project/environment.\n'
        '  2. On the web service Variables, set:\n'
        '     DATABASE_URL=${{Postgres.DATABASE_URL}}\n'
        '     (use your Postgres service name if it is not "Postgres")\n'
        '  3. If internal DNS still fails, also try:\n'
        '     DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}\n',
        flush=True,
    )
    return 1


if __name__ == '__main__':
    sys.exit(main())
