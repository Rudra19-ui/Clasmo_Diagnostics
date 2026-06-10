import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-i58p^q1vw-7s4qs^3^e)at(0g3_jv!5e=qk)@4qz#u1)-z5*hh',
)

DEBUG = os.environ.get('DEBUG', 'false' if os.environ.get('RAILWAY_ENVIRONMENT') else 'true').lower() in (
    'true',
    '1',
    'yes',
)

_hosts_raw = os.environ.get('ALLOWED_HOSTS') or 'localhost,127.0.0.1'
ALLOWED_HOSTS = [host.strip() for host in _hosts_raw.split(',') if host.strip()]

if railway_domain := os.environ.get('RAILWAY_PUBLIC_DOMAIN'):
    ALLOWED_HOSTS.append(railway_domain)
if os.environ.get('RAILWAY_ENVIRONMENT'):
    ALLOWED_HOSTS.extend(['.up.railway.app', '.railway.app', '.clasmodiagnostics.com'])

_default_domains = 'clasmodiagnostics.com,www.clasmodiagnostics.com'
_production_domains = os.environ.get('PRODUCTION_DOMAINS') or _default_domains
for domain in _production_domains.split(','):
    domain = domain.strip()
    if domain and domain not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(domain)

_default_csrf = 'https://clasmodiagnostics.com,https://www.clasmodiagnostics.com'
_csrf_raw = os.environ.get('CSRF_TRUSTED_ORIGINS') or _default_csrf
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in _csrf_raw.split(',') if origin.strip()]
if railway_domain := os.environ.get('RAILWAY_PUBLIC_DOMAIN'):
    origin = f'https://{railway_domain}'
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)
for domain in ALLOWED_HOSTS:
    if domain.startswith('.'):
        continue
    for origin in (f'https://{domain}', f'http://{domain}'):
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)

# Custom domain — always allow (avoids www-only DisallowedHost on SPA routes)
for _host in ('clasmodiagnostics.com', 'www.clasmodiagnostics.com', '.clasmodiagnostics.com'):
    if _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)
for _origin in ('https://clasmodiagnostics.com', 'https://www.clasmodiagnostics.com'):
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)

# Railway internal health checks and service networking
if os.environ.get('RAILWAY_ENVIRONMENT'):
    for _host in ('.railway.internal', 'healthcheck.railway.app', 'localhost', '127.0.0.1'):
        if _host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(_host)
    if '*' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('*')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'clasmo_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'clasmo_backend.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        conn_health_checks=True,
    )
}
if DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default'].setdefault('OPTIONS', {})
    if 'sslmode' not in DATABASES['default']['OPTIONS']:
        DATABASES['default']['OPTIONS']['sslmode'] = 'require'

AUTH_USER_MODEL = 'api.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

FRONTEND_DIST = BASE_DIR / 'frontend_dist'
WHITENOISE_ROOT = FRONTEND_DIST
WHITENOISE_INDEX_FILE = True

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
elif os.environ.get('RAILWAY_ENVIRONMENT'):
    CORS_ALLOWED_ORIGINS = [
        'https://clasmodiagnostics.com',
        'https://www.clasmodiagnostics.com',
    ]
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

CORS_ALLOW_CREDENTIALS = True

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
