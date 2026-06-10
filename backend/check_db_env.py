"""Validate Railway database environment before startup."""
import os
import sys

from db_url import is_usable_postgres_url, pick_database_url


def main():
    public_url = os.environ.get('DATABASE_PUBLIC_URL', '').strip()
    database_url = os.environ.get('DATABASE_URL', '').strip()
    is_railway = any(
        os.environ.get(key)
        for key in (
            'RAILWAY_PROJECT_ID',
            'RAILWAY_ENVIRONMENT_NAME',
            'RAILWAY_ENVIRONMENT',
            'RAILWAY_PUBLIC_DOMAIN',
        )
    )

    if not database_url and not public_url:
        if is_railway:
            print(
                'FATAL: No DATABASE_URL or DATABASE_PUBLIC_URL on the web service.',
                flush=True,
            )
            return 1
        return 0

    if public_url and 'railway.internal' in public_url:
        print(
            '\nFATAL: DATABASE_PUBLIC_URL still uses postgres.railway.internal.\n'
            'Do NOT use ${{Postgres.DATABASE_URL}} for DATABASE_PUBLIC_URL.\n\n'
            'Fix on the WEB service (Clasmo_Diagnostics) Variables:\n'
            '  1. Postgres → Connect → copy the PUBLIC URL\n'
            '     (host must end with .proxy.rlwy.net, e.g. acela.proxy.rlwy.net)\n'
            '  2. Set DATABASE_PUBLIC_URL to that full pasted URL\n'
            '  3. Set DATABASE_URL to the same pasted URL\n'
            '  4. Redeploy\n',
            flush=True,
        )
        return 1

    if not is_usable_postgres_url(pick_database_url()):
        print(
            '\nFATAL: No usable PostgreSQL URL found.\n'
            'Set DATABASE_PUBLIC_URL on the web service to the pasted public URL '
            'from Postgres → Connect.\n',
            flush=True,
        )
        return 1

    chosen = pick_database_url()
    print(f'Using PostgreSQL URL with host from configured public connection.', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
