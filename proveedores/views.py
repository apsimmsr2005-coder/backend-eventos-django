from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Proveedor
from .serializers import ProveedorSerializer


def paginar_proveedores(proveedores, page_number):
    paginator = Paginator(proveedores, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': ProveedorSerializer(page.object_list, many=True).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def proveedores_api(request):
    administrador = (request.user.is_staff or request.user.is_superuser
                     or request.user.groups.filter(name='Administrador').exists())
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method == 'GET':
        proveedores = Proveedor.objects.order_by('nombre', 'pk')
        servicio = request.query_params.get('servicio')
        if servicio:
            proveedores = proveedores.filter(servicio__icontains=servicio)
        evento = request.query_params.get('evento')
        if evento:
            if not evento.isdecimal():
                return Response({'detail': 'evento debe ser un ID numérico.'}, status=400)
            proveedores = proveedores.filter(contrataciones__evento_id=evento).distinct()
        texto = request.query_params.get('search')
        if texto:
            proveedores = proveedores.filter(
                Q(nombre__icontains=texto) | Q(servicio__icontains=texto)
                | Q(contacto__icontains=texto)
            )

        return paginar_proveedores(proveedores, request.query_params.get('page', 1))

    serializer = ProveedorSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def proveedor_detalle_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    proveedor = get_object_or_404(Proveedor, pk=id)
    if request.method == 'GET':
        return Response(ProveedorSerializer(proveedor).data)
    if request.method in ['PUT', 'PATCH']:
        serializer = ProveedorSerializer(proveedor, data=request.data, partial=request.method == 'PATCH')
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=200)
    proveedor.delete()
    return Response(status=204)
