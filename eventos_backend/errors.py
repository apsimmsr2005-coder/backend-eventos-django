from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import exception_handler

def api_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response({'detail': 'No se puede borrar: existen registros relacionados.'}, status=409)
    if isinstance(exc, IntegrityError):
        return Response({'detail': 'El registro incumple una restricción de integridad.'}, status=409)
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict) and ('detail' not in response.data):
        response.data = {'detail': 'Revise los datos enviados.', 'errores': response.data}
    return response

def bad_request(request, exception=None):
    return JsonResponse({'detail': 'Solicitud incorrecta.'}, status=400)

def not_found(request, exception=None):
    return JsonResponse({'detail': 'Recurso no encontrado.'}, status=404)

def server_error(request):
    return JsonResponse({'detail': 'Ocurrió un error interno.'}, status=500)
