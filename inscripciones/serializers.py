from django.utils import timezone
from rest_framework import serializers
from .models import Inscripcion


class InscripcionSerializer(serializers.ModelSerializer):
    evento_nombre = serializers.CharField(source='evento.nombre', read_only=True)
    participante_nombre = serializers.CharField(source='participante.nombre', read_only=True)

    class Meta:
        model = Inscripcion
        fields = ['id', 'evento', 'participante', 'fecha', 'estado', 'evento_nombre', 'participante_nombre']
        read_only_fields = ['fecha']
        validators = []  # La validación explícita usa también los valores existentes en PATCH.

    def validate(self, data):
        instance = self.instance
        evento = data.get('evento', instance.evento if instance else None)
        participante = data.get('participante', instance.participante if instance else None)
        estado = data.get('estado', instance.estado if instance else 'ACTIVA')
        
        if instance and (evento.pk != instance.evento_id or participante.pk != instance.participante_id):
            raise serializers.ValidationError('Evento y participante son inmutables; cancele y cree otra inscripción.')
        duplicadas = Inscripcion.objects.filter(evento=evento, participante=participante)
        
        if instance:
            duplicadas = duplicadas.exclude(pk=instance.pk)
        
        if duplicadas.exists():
            raise serializers.ValidationError('El participante ya tiene una inscripción en este evento.')
        # Cancelar una inscripción siempre está permitido; activarla exige revisar todos los invariantes.
        
        if estado == 'ACTIVA':
            if evento.estado != 'ABIERTO':
                raise serializers.ValidationError({'evento': 'El evento no está abierto para inscripciones.'})
            if evento.fecha < timezone.now():
                raise serializers.ValidationError({'evento': 'No se puede inscribir en un evento pasado.'})
            activas = evento.inscripciones.filter(estado='ACTIVA')
            if instance:
                activas = activas.exclude(pk=instance.pk)
            if activas.count() >= evento.cupo:
                raise serializers.ValidationError({'evento': 'El evento alcanzó su cupo máximo.'})
        return data
