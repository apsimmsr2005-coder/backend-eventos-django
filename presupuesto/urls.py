from django.urls import path
from . import views

urlpatterns = [
    path('', views.contrataciones_api, name='presupuesto_lista'),
    path('<int:id>/', views.contratacion_detalle_api, name='presupuesto_detalle'),
]
