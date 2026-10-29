from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import Contratacion


class ContratacionSerializer(serializers.ModelSerializer):
    evento_nombre = serializers.CharField(source='evento.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)

    class Meta:
        model = Contratacion
        fields = ['id', 'evento', 'proveedor', 'monto', 'evento_nombre', 'proveedor_nombre']
        validators = []

    def validate(self, data):
        instance = self.instance
        evento = data.get('evento', instance.evento if instance else None)
        proveedor = data.get('proveedor', instance.proveedor if instance else None)
        monto = data.get('monto', instance.monto if instance else Decimal('0'))
        if instance and (evento.pk != instance.evento_id or proveedor.pk != instance.proveedor_id):
            raise serializers.ValidationError('Evento y proveedor son inmutables; elimine y cree otra contratación.')
        if evento.estado in ['CANCELADO', 'FINALIZADO']:
            raise serializers.ValidationError({'evento': 'No se puede contratar para un evento cancelado o finalizado.'})
        duplicadas = Contratacion.objects.filter(evento=evento, proveedor=proveedor)
        otras = evento.contrataciones.all()
        if instance:
            duplicadas = duplicadas.exclude(pk=instance.pk)
            otras = otras.exclude(pk=instance.pk)
        if duplicadas.exists():
            raise serializers.ValidationError('El proveedor ya está contratado en este evento.')
        total = otras.aggregate(total=Sum('monto'))['total'] or Decimal('0')
        if total + monto > evento.presupuesto:
            saldo = evento.presupuesto - total
            raise serializers.ValidationError({'monto': f'Presupuesto excedido. Saldo disponible: {saldo:.2f}.'})
        return data
