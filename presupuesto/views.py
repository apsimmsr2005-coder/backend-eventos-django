from django.core.paginator import Paginator
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from eventos.models import Evento
from .models import Contratacion
from .serializers import ContratacionSerializer


def paginar_contrataciones(contrataciones, page_number):
    paginator = Paginator(contrataciones, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': ContratacionSerializer(page.object_list, many=True).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def contrataciones_api(request):
    administrador = (request.user.is_staff or request.user.is_superuser
                     or request.user.groups.filter(name='Administrador').exists())
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method == 'GET':
        contrataciones = Contratacion.objects.select_related('evento', 'proveedor').order_by('pk')
        evento = request.query_params.get('evento')
        if evento:
            if not evento.isdecimal():
                return Response({'detail': 'evento debe ser un ID numérico.'}, status=400)
            contrataciones = contrataciones.filter(evento_id=evento).distinct()
        proveedor = request.query_params.get('proveedor')
        if proveedor:
            if not proveedor.isdecimal():
                return Response({'detail': 'proveedor debe ser un ID numérico.'}, status=400)
            contrataciones = contrataciones.filter(proveedor_id=proveedor).distinct()
        return paginar_contrataciones(contrataciones, request.query_params.get('page', 1))

    with transaction.atomic():
        serializer = ContratacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento = serializer.validated_data['evento']
        get_object_or_404(Evento.objects.select_for_update(), pk=evento.pk)
        # Validar de nuevo con el evento bloqueado protege el cupo y el presupuesto.
        serializer = ContratacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def contratacion_detalle_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method == 'GET':
        contrato = get_object_or_404(Contratacion.objects.select_related('evento', 'proveedor'), pk=id)
        return Response(ContratacionSerializer(contrato).data)
    if request.method in ['PUT', 'PATCH']:
        with transaction.atomic():
            contrato = get_object_or_404(Contratacion, pk=id)
            preliminar = ContratacionSerializer(contrato, data=request.data, partial=request.method == 'PATCH')
            preliminar.is_valid(raise_exception=True)
            evento = preliminar.validated_data.get('evento')
            evento_id = evento.pk if evento else contrato.evento_id
            get_object_or_404(Evento.objects.select_for_update(), pk=evento_id)
            contrato = get_object_or_404(Contratacion.objects.select_for_update(), pk=id)
            serializer = ContratacionSerializer(contrato, data=request.data, partial=request.method == 'PATCH')
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=200)
    
    with transaction.atomic():
        contrato = get_object_or_404(Contratacion, pk=id)
        get_object_or_404(Evento.objects.select_for_update(), pk=contrato.evento_id)
        contrato = get_object_or_404(Contratacion.objects.select_for_update(), pk=id)
        contrato.delete()
        return Response(status=204)
