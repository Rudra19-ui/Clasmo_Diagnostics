from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, HttpResponse, JsonResponse
from django.urls import include, path, re_path


def spa_fallback(request):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.exists():
        return HttpResponse(
            'Frontend build missing. Redeploy the application.',
            status=503,
            content_type='text/plain',
        )
    response = FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response


urlpatterns = [
    path('health/', lambda request: JsonResponse({'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        path('', spa_fallback, name='spa-index'),
        re_path(
            r'^(?!api/|admin/|media/|static/|health/|assets/).+$',
            spa_fallback,
            name='spa-fallback',
        ),
    ]
