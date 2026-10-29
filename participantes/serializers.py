from rest_framework import serializers
from .models import Participante


class ParticipanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participante
        fields = ['id', 'nombre', 'correo', 'cedula']

    def validate_correo(self, value):
        return value.lower()
