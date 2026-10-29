from django.db import models


class Participante(models.Model):
    nombre = models.CharField(max_length=120)
    correo = models.EmailField()
    cedula = models.CharField(max_length=30, unique=True)

    class Meta:
        ordering = ['nombre', 'pk']

    def __str__(self):
        return self.nombre
