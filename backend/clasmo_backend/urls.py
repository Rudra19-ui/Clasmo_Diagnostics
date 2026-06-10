from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path


def spa_fallback(request, *_args, **_kwargs):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.is_file():
        raise Http404('Frontend build not found')
    return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')


urlpatterns = [
    path('health/', lambda request: JsonResponse({'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        path('', spa_fallback, name='spa-root'),
        re_path(
            r'^(?!api/|admin/|media/|static/|health/|assets/).+$',
            spa_fallback,
            name='spa-fallback',
        ),
    ]
