from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q, Sum


class Evento(models.Model):
    ESTADOS = [('ABIERTO', 'Abierto'), ('EN_CURSO', 'En curso'),
               ('FINALIZADO', 'Finalizado'), ('CANCELADO', 'Cancelado')]
    nombre = models.CharField(max_length=120)
    fecha = models.DateTimeField()
    lugar = models.CharField(max_length=200)
    cupo = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    estado = models.CharField(max_length=15, choices=ESTADOS, default='ABIERTO')
    presupuesto = models.DecimalField(max_digits=12, decimal_places=2,
                                      validators=[MinValueValidator(0)])
    proveedores = models.ManyToManyField('proveedores.Proveedor',
                                        through='presupuesto.Contratacion', related_name='eventos')

    class Meta:
        # ordering: los eventos se listan por fecha y, si empatan, por id.
        # constraints: reglas que la base de datos hace cumplir aunque alguien se salte la API 
        # y estado dentro de los valores permitidos.
        ordering = ['fecha', 'pk']
        constraints = [
            models.CheckConstraint(condition=Q(cupo__gt=0), name='evento_cupo_positivo'),
            models.CheckConstraint(condition=Q(presupuesto__gte=0), name='evento_presupuesto_no_negativo'),
            models.CheckConstraint(condition=Q(estado__in=['ABIERTO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO']),
                                   name='evento_estado_valido'),
        ]

    @property
    def inscritos_activos(self):
        if hasattr(self, '_inscritos_activos'):
            return self._inscritos_activos
        return self.inscripciones.filter(estado='ACTIVA').count()

    @property
    def gasto_total(self):
        if hasattr(self, '_gasto_total'):
            return self._gasto_total
        return self.contrataciones.aggregate(total=Sum('monto'))['total'] or 0

    def __str__(self):
        return self.nombre
