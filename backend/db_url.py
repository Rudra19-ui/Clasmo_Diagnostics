"""Pick a PostgreSQL URL that is reachable from the web service."""
import os


def is_usable_postgres_url(url: str) -> bool:
    url = (url or '').strip()
    return url.startswith('postgres') and 'railway.internal' not in url


def pick_database_url() -> str:
    public = os.environ.get('DATABASE_PUBLIC_URL', '').strip()
    internal = os.environ.get('DATABASE_URL', '').strip()

    if is_usable_postgres_url(public):
        return public
    if is_usable_postgres_url(internal):
        return internal
    return ''
