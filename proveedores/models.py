from django.db import models


class Proveedor(models.Model):
    nombre = models.CharField(max_length=120)
    servicio = models.CharField(max_length=120)
    contacto = models.CharField(max_length=160)

    class Meta:
        ordering = ['nombre', 'pk']

    def __str__(self):
        return f'{self.nombre} - {self.servicio}'
