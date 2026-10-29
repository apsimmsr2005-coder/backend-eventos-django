from django.urls import path
from . import views

urlpatterns = [
    path('', views.participantes_api, name='participantes_lista'),
    path('<int:id>/', views.participante_detalle_api, name='participantes_detalle'),
]
