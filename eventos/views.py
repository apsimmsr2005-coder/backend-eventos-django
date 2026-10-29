from datetime import datetime, time, timedelta
from decimal import Decimal
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, DecimalField, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from inscripciones.views import paginar_inscripciones
from presupuesto.models import Contratacion
from .models import Evento
from .serializers import EventoSerializer


def paginar_eventos(eventos, page_number):
    paginator = Paginator(eventos, 5)
    page = paginator.get_page(page_number)
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': EventoSerializer(page.object_list, many=True).data,
    })


def eventos_con_totales():
    # Devuelve los eventos con inscritos activos y gasto total ya calculados
    # en una sola consulta (evita una consulta extra por cada evento).
    # El gasto va en subconsulta para no duplicar montos al contar inscripciones.
    gastos = Contratacion.objects.filter(evento_id=OuterRef('pk')).order_by()
    gastos = gastos.values('evento_id').annotate(total=Sum('monto')).values('total')
    return Evento.objects.annotate(
        _inscritos_activos=Count('inscripciones', filter=Q(inscripciones__estado='ACTIVA'), distinct=True),
        _gasto_total=Coalesce(Subquery(gastos), Value(Decimal('0')),
                             output_field=DecimalField(max_digits=12, decimal_places=2)),
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def eventos_api(request):
    administrador = (request.user.is_staff or request.user.is_superuser
                     or request.user.groups.filter(name='Administrador').exists())
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method == 'GET':
        eventos = eventos_con_totales()
        estado = request.query_params.get('estado')
        lugar = request.query_params.get('lugar')
        texto = request.query_params.get('search')
        if estado:
            estado = estado.upper()
            if estado not in dict(Evento.ESTADOS):
                return Response({'detail': 'Estado desconocido.'}, status=400)
            eventos = eventos.filter(estado=estado)
        if lugar:
            eventos = eventos.filter(lugar__icontains=lugar)
        if texto:
            eventos = eventos.filter(Q(nombre__icontains=texto) | Q(lugar__icontains=texto))
        proveedor = request.query_params.get('proveedor')
        if proveedor:
            if not proveedor.isdecimal():
                return Response({'detail': 'proveedor debe ser un ID numérico.'}, status=400)
            eventos = eventos.filter(proveedores__id=proveedor).distinct()

        try:
            desde = request.query_params.get('fecha_desde')
            hasta = request.query_params.get('fecha_hasta')
            if desde:
                inicio = timezone.make_aware(datetime.combine(parse_date(desde), time.min))
                eventos = eventos.filter(fecha__gte=inicio)
            if hasta:
                fin = timezone.make_aware(datetime.combine(parse_date(hasta) + timedelta(days=1), time.min))
                eventos = eventos.filter(fecha__lt=fin)
        except (ValueError, TypeError, OverflowError):
            return Response({'detail': 'Use fechas válidas YYYY-MM-DD.'}, status=400)

        orden = request.query_params.get('ordering', 'fecha')
        if orden.lstrip('-') not in ['nombre', 'fecha', 'presupuesto', 'cupo']:
            return Response({'detail': 'Ordenamiento no permitido.'}, status=400)
        eventos = eventos.order_by(orden, 'pk')
        return paginar_eventos(eventos, request.query_params.get('page', 1))

    serializer = EventoSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def evento_detalle_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method == 'GET':
        evento = get_object_or_404(eventos_con_totales(), pk=id)
        return Response(EventoSerializer(evento).data)
    with transaction.atomic():
        evento = get_object_or_404(Evento.objects.select_for_update(), pk=id)
        if request.method in ['PUT', 'PATCH']:
            serializer = EventoSerializer(evento, data=request.data, partial=request.method == 'PATCH')
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=200)
        if evento.inscripciones.filter(estado='ACTIVA').exists():
            return Response({'detail': 'No se puede borrar un evento con inscripciones activas.'}, status=409)
        evento.delete()
        return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inscripciones_evento_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    
    if request.method != 'GET' and not (administrador or request.user.groups.filter(name='Organizador').exists()):
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    evento = get_object_or_404(Evento, pk=id)
    inscripciones = evento.inscripciones.select_related('evento', 'participante').order_by('fecha', 'pk')
    return paginar_inscripciones(inscripciones, request.query_params.get('page', 1))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def presupuesto_evento_api(request, id):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    evento = get_object_or_404(eventos_con_totales(), pk=id)
    contratos = evento.contrataciones.select_related('proveedor').order_by('pk')
    return Response({
        'evento': evento.id, 'nombre': evento.nombre,
        'presupuesto': format(evento.presupuesto, '.2f'),
        'gasto_total': format(evento.gasto_total, '.2f'),
        'saldo_disponible': format(evento.presupuesto - evento.gasto_total, '.2f'),
        'presupuesto_agotado': evento.gasto_total >= evento.presupuesto,
        'contrataciones': [{'id': c.id, 'proveedor': c.proveedor_id,
                           'proveedor_nombre': c.proveedor.nombre, 'monto': format(c.monto, '.2f')}
                          for c in contratos],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resumen_api(request):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    from eventos.models import Evento
    from participantes.models import Participante
    from proveedores.models import Proveedor
    eventos = eventos_con_totales()
    mayor = eventos.order_by('-_inscritos_activos', 'pk').first()
    totales = eventos.aggregate(presupuesto_total=Sum('presupuesto'), gasto_total=Sum('_gasto_total'))
    return Response({
        'eventos_por_estado': list(Evento.objects.order_by('estado').values('estado').annotate(total=Count('pk'))),
        'participantes': Participante.objects.count(),
        'proveedores': Proveedor.objects.count(),
        'eventos_con_cupo': list(eventos.filter(estado='ABIERTO', _inscritos_activos__lt=F('cupo'))
                                .values('id', 'nombre', 'cupo', '_inscritos_activos')),
        'evento_mayor_participacion': None if mayor is None else {
            'id': mayor.id, 'nombre': mayor.nombre, 'inscritos': mayor.inscritos_activos},
        'presupuesto_total': format(totales['presupuesto_total'] or 0, '.2f'),
        'gasto_total': format(totales['gasto_total'] or 0, '.2f'),
    })

