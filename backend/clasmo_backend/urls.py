from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, JsonResponse
from django.urls import include, path, re_path


def spa_fallback(request):
    index = settings.FRONTEND_DIST / 'index.html'
    return FileResponse(open(index, 'rb'))


urlpatterns = [
    path('health/', lambda request: JsonResponse({'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        re_path(
            r'^(?!api/|admin/|media/|static/|health/).*$',
            spa_fallback,
        ),
    ]
