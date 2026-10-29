from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Contratacion(models.Model):
    evento = models.ForeignKey('eventos.Evento', on_delete=models.PROTECT, related_name='contrataciones')
    proveedor = models.ForeignKey('proveedores.Proveedor', on_delete=models.PROTECT,
                                 related_name='contrataciones')
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])

    class Meta:
        ordering = ['pk']
        constraints = [
            models.UniqueConstraint(fields=['evento', 'proveedor'], name='contratacion_unica_evento_proveedor'),
            models.CheckConstraint(condition=Q(monto__gt=0), name='contratacion_monto_positivo'),
        ]

    def __str__(self):
        return f'{self.evento} - {self.proveedor}: {self.monto}'
