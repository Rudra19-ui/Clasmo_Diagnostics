#!/usr/bin/env python
"""
Copy all application data from local db.sqlite3 into the configured PostgreSQL database.
Usage: python scripts/migrate_sqlite_to_postgres.py
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
SQLITE_PATH = BACKEND_DIR / 'db.sqlite3'


def run(cmd, *, env=None):
    print('>', ' '.join(cmd))
    result = subprocess.run(cmd, cwd=BACKEND_DIR, env=env, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
        sys.exit(result.returncode)


def main():
    if not SQLITE_PATH.is_file():
        print(f'No SQLite database found at {SQLITE_PATH}')
        sys.exit(1)

    venv_python = BACKEND_DIR / 'venv' / 'bin' / 'python'
    python = str(venv_python if venv_python.is_file() else sys.executable)

    base_env = os.environ.copy()
    base_env.setdefault('DJANGO_SETTINGS_MODULE', 'clasmo_backend.settings')

    # Load .env for PostgreSQL target
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / '.env')

    pg_env = base_env.copy()
    pg_env['DATABASE_URL'] = os.environ.get('DATABASE_URL', '')
    pg_env['DATABASE_PUBLIC_URL'] = os.environ.get('DATABASE_PUBLIC_URL', '')

    if 'postgresql' not in pg_env.get('DATABASE_URL', ''):
        print('DATABASE_URL in backend/.env must point to PostgreSQL.')
        sys.exit(1)

    print('Source: db.sqlite3')
    print('Target:', pg_env['DATABASE_URL'].split('@')[-1] if '@' in pg_env['DATABASE_URL'] else 'postgresql')
    print()

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as tmp:
        dump_path = tmp.name

    # Dump from SQLite by blanking Postgres URLs (settings falls back to db.sqlite3).
    # Must be set to empty strings (not popped): settings.py load_dotenv() would
    # otherwise re-add them from backend/.env and dump PostgreSQL instead.
    sqlite_env = base_env.copy()
    sqlite_env['DATABASE_URL'] = ''
    sqlite_env['DATABASE_PUBLIC_URL'] = ''

    print('Exporting data from SQLite...')
    run(
        [
            python, 'manage.py', 'dumpdata',
            '--natural-foreign',
            '--natural-primary',
            '-e', 'sessions.session',
            '-e', 'admin.logentry',
            '--indent', '2',
            f'--output={dump_path}',
        ],
        env=sqlite_env,
    )

    dump_size = Path(dump_path).stat().st_size
    print(f'Exported {dump_size:,} bytes')
    print()

    print('Clearing PostgreSQL data...')
    run([python, 'manage.py', 'flush', '--no-input'], env=pg_env)

    print('Loading data into PostgreSQL...')
    run([python, 'manage.py', 'loaddata', dump_path], env=pg_env)

    Path(dump_path).unlink(missing_ok=True)

    print()
    print('Migration complete. Verifying counts...')
    run(
        [
            python, 'manage.py', 'shell', '-c',
            (
                'from django.contrib.auth import get_user_model; '
                'from api.models import LabActivity, Patient, Doctor, Registration, CollectionCenter; '
                'User = get_user_model(); '
                'print("Users:", User.objects.count()); '
                'print("Patients:", Patient.objects.count()); '
                'print("Doctors:", Doctor.objects.count()); '
                'print("Registrations:", Registration.objects.count()); '
                'print("Collection Centers:", CollectionCenter.objects.count()); '
                'print("Activities:", LabActivity.objects.count())'
            ),
        ],
        env=pg_env,
    )


if __name__ == '__main__':
    main()
