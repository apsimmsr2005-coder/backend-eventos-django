from django.urls import path
from . import views

urlpatterns = [
    path('', views.inscripciones_api, name='inscripciones_lista'),
    path('<int:id>/', views.inscripcion_detalle_api, name='inscripciones_detalle'),
]
