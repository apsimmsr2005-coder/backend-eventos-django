from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Participante
from .serializers import ParticipanteSerializer


def paginar_participantes(participantes, page_number):
    paginator = Paginator(participantes, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': ParticipanteSerializer(page.object_list, many=True).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def participantes_api(request):
    administrador = (request.user.is_staff or request.user.is_superuser
                     or request.user.groups.filter(name='Administrador').exists())
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not (administrador):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method == 'GET':
        participantes = Participante.objects.order_by('nombre', 'pk')
        cedula = request.query_params.get('cedula')
        correo = request.query_params.get('correo')
        if cedula:
            participantes = participantes.filter(cedula=cedula)
        if correo:
            participantes = participantes.filter(correo__iexact=correo)
        evento = request.query_params.get('evento')
        if evento:
            if not evento.isdecimal():
                return Response({'detail': 'evento debe ser un ID numérico.'}, status=400)
            participantes = participantes.filter(inscripciones__evento_id=evento).distinct()
        texto = request.query_params.get('search')
        if texto:
            participantes = participantes.filter(
                Q(nombre__icontains=texto) | Q(correo__icontains=texto)
                | Q(cedula__icontains=texto)
            )

        return paginar_participantes(participantes, request.query_params.get('page', 1))

    serializer = ParticipanteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def participante_detalle_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not administrador:
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    participante = get_object_or_404(Participante, pk=id)
    
    if request.method == 'GET':
        return Response(ParticipanteSerializer(participante).data)
    
    if request.method in ['PUT', 'PATCH']:
        serializer = ParticipanteSerializer(participante, data=request.data, partial=request.method == 'PATCH')
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=200)
    participante.delete()
    return Response(status=204)
