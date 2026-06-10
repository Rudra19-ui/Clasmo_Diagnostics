from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path

SPA_EXCLUDED_PREFIXES = r'api/|admin/|media/|static/|health/|assets/|favicon\.svg'


def health_live(_request):
    """Railway liveness probe — must not depend on the database."""
    return JsonResponse({'status': 'ok'})


def health_check(_request):
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return JsonResponse({'status': 'ok', 'database': 'connected'})
    except (OperationalError, ProgrammingError) as exc:
        return JsonResponse({'status': 'error', 'database': str(exc)}, status=503)


def spa_fallback(request, *_args, **_kwargs):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.is_file():
        raise Http404('Frontend build not found')
    return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')


urlpatterns = [
    path('health/live/', health_live),
    path('health/', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        path('', spa_fallback, name='spa-root'),
        re_path(
            rf'^(?!{SPA_EXCLUDED_PREFIXES})(?P<spa_path>.+)/?$',
            spa_fallback,
            name='spa-fallback',
        ),
    ]
