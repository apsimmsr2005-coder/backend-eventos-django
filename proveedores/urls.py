from django.urls import path
from . import views

urlpatterns = [
    path('', views.proveedores_api, name='proveedores_lista'),
    path('<int:id>/', views.proveedor_detalle_api, name='proveedores_detalle'),
]
