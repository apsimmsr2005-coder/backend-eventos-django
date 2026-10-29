from django.urls import path
from . import views

urlpatterns = [
    path('', views.eventos_api, name='eventos_lista'),
    path('<int:id>/', views.evento_detalle_api, name='eventos_detalle'),
    path('<int:id>/inscripciones/', views.inscripciones_evento_api, name='eventos_inscripciones'),
    path('<int:id>/presupuesto/', views.presupuesto_evento_api, name='eventos_presupuesto'),
]

