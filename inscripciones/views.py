from django.core.paginator import Paginator
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from eventos.models import Evento
from .models import Inscripcion
from .serializers import InscripcionSerializer


def paginar_inscripciones(inscripciones, page_number):
    paginator = Paginator(inscripciones, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': InscripcionSerializer(page.object_list, many=True).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def inscripciones_api(request):
    administrador = (request.user.is_staff or request.user.is_superuser
                     or request.user.groups.filter(name='Administrador').exists())
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not (administrador):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method == 'GET':
        inscripciones = Inscripcion.objects.select_related('evento', 'participante').order_by('pk')
        estado = request.query_params.get('estado')
        if estado:
            estado = estado.upper()
            if estado not in dict(Inscripcion.ESTADOS):
                return Response({'detail': 'Estado desconocido.'}, status=400)
            inscripciones = inscripciones.filter(estado=estado)
        evento = request.query_params.get('evento')
        if evento:
            if not evento.isdecimal():
                return Response({'detail': 'evento debe ser un ID numérico.'}, status=400)
            inscripciones = inscripciones.filter(evento_id=evento).distinct()
        participante = request.query_params.get('participante')
        if participante:
            if not participante.isdecimal():
                return Response({'detail': 'participante debe ser un ID numérico.'}, status=400)
            inscripciones = inscripciones.filter(participante_id=participante).distinct()
        return paginar_inscripciones(inscripciones, request.query_params.get('page', 1))
    
    # La transacción garantiza que se guarde todo o nada. Se bloquea la fila del
    # evento (select_for_update) para que dos inscripciones simultáneas no
    # superen el cupo, y por eso se valida de nuevo ya con el evento bloqueado.
    with transaction.atomic():
        serializer = InscripcionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento = serializer.validated_data['evento']
        get_object_or_404(Evento.objects.select_for_update(), pk=evento.pk)
        # Validar de nuevo con el evento bloqueado protege el cupo y el presupuesto.
        serializer = InscripcionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def inscripcion_detalle_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not administrador:
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method == 'GET':
        inscripcion = get_object_or_404(Inscripcion.objects.select_related('evento', 'participante'), pk=id)
        return Response(InscripcionSerializer(inscripcion).data)
    
    if request.method in ['PUT', 'PATCH']:
        with transaction.atomic():
            inscripcion = get_object_or_404(Inscripcion, pk=id)
            preliminar = InscripcionSerializer(inscripcion, data=request.data, partial=request.method == 'PATCH')
            preliminar.is_valid(raise_exception=True)
            evento = preliminar.validated_data.get('evento')
            evento_id = evento.pk if evento else inscripcion.evento_id
            get_object_or_404(Evento.objects.select_for_update(), pk=evento_id)
            inscripcion = get_object_or_404(Inscripcion.objects.select_for_update(), pk=id)
            serializer = InscripcionSerializer(inscripcion, data=request.data, partial=request.method == 'PATCH')
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=200)
    
    with transaction.atomic():
        inscripcion = get_object_or_404(Inscripcion, pk=id)
        get_object_or_404(Evento.objects.select_for_update(), pk=inscripcion.evento_id)
        inscripcion = get_object_or_404(Inscripcion.objects.select_for_update(), pk=id)
        inscripcion.delete()
        return Response(status=204)
