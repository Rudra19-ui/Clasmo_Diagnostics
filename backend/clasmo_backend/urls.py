from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse
from django.urls import include, path, re_path


def spa_fallback(request):
    index = settings.FRONTEND_DIST / 'index.html'
    return FileResponse(open(index, 'rb'))


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        re_path(
            r'^(?!api/|admin/|media/|static/).*$',
            spa_fallback,
        ),
    ]
