from django.utils import timezone
from rest_framework import serializers
from .models import Evento


class EventoSerializer(serializers.ModelSerializer):
    inscritos_activos = serializers.IntegerField(read_only=True)
    gasto_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    saldo_disponible = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = ['id', 'nombre', 'fecha', 'lugar', 'cupo', 'estado', 'presupuesto',
                  'inscritos_activos', 'gasto_total', 'saldo_disponible']

    def get_saldo_disponible(self, obj):
        return format(obj.presupuesto - obj.gasto_total, '.2f')

    def validate_fecha(self, value):
        if (not self.instance or value != self.instance.fecha) and value < timezone.now():
            raise serializers.ValidationError('La fecha del evento no puede estar en el pasado.')
        return value

    def validate(self, data):
        if self.instance:
            cupo = data.get('cupo', self.instance.cupo)
            presupuesto = data.get('presupuesto', self.instance.presupuesto)
            if cupo < self.instance.inscritos_activos:
                raise serializers.ValidationError({'cupo': 'No puede ser menor que las inscripciones activas.'})
            if presupuesto < self.instance.gasto_total:
                raise serializers.ValidationError({'presupuesto': 'No puede ser menor que el gasto contratado.'})
        return data
