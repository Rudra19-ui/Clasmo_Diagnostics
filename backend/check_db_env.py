"""Validate Railway database environment before startup."""
import os
import sys


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

    if 'railway.internal' in database_url and not public_url:
        print(
            '\nFATAL: DATABASE_URL points to postgres.railway.internal but '
            'DATABASE_PUBLIC_URL is not set.\n'
            'That internal hostname only works when Postgres and the web app '
            'are in the same Railway project.\n\n'
            'Fix on the WEB service (Clasmo_Diagnostics) Variables:\n'
            '  1. Open Postgres → Connect → copy the PUBLIC URL '
            '(host ends with .proxy.rlwy.net)\n'
            '  2. Add variable: DATABASE_PUBLIC_URL = <that public URL>\n'
            '  3. Optionally set DATABASE_URL to the same public URL\n'
            '  4. Redeploy\n',
            flush=True,
        )
        return 1

    if public_url:
        print('Using DATABASE_PUBLIC_URL for PostgreSQL.', flush=True)
    elif database_url:
        print(f'Using DATABASE_URL host from configured URL.', flush=True)

    return 0


if __name__ == '__main__':
    sys.exit(main())
