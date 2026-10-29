from django.db import models
from django.db.models import Q


class Inscripcion(models.Model):
    ESTADOS = [('ACTIVA', 'Activa'), ('CANCELADA', 'Cancelada')]
    evento = models.ForeignKey('eventos.Evento', on_delete=models.PROTECT, related_name='inscripciones')
    participante = models.ForeignKey('participantes.Participante', on_delete=models.PROTECT,
                                     related_name='inscripciones')
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='ACTIVA')

    class Meta:
        ordering = ['fecha', 'pk']
        constraints = [
            models.UniqueConstraint(fields=['evento', 'participante'], name='inscripcion_unica_evento_participante'),
            models.CheckConstraint(condition=Q(estado__in=['ACTIVA', 'CANCELADA']), name='inscripcion_estado_valido'),
        ]

    def __str__(self):
        return f'{self.participante} - {self.evento}'
