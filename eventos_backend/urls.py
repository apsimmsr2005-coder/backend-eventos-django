from django.contrib import admin
from django.urls import include, path
from . import views
from eventos.views import resumen_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', views.token_api, name='api_token'),
    path('api/logout/', views.logout_api, name='api_logout'),
    path('api/me/', views.usuario_api, name='api_usuario'),
    path('api/reportes/resumen/', resumen_api, name='api_resumen'),
    path('api/eventos/', include('eventos.urls')),
    path('api/participantes/', include('participantes.urls')),
    path('api/inscripciones/', include('inscripciones.urls')),
    path('api/proveedores/', include('proveedores.urls')),
    path('api/presupuesto/', include('presupuesto.urls')),
]
handler400 = 'eventos_backend.errors.bad_request'
handler404 = 'eventos_backend.errors.not_found'
handler500 = 'eventos_backend.errors.server_error'
