import os
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from eventos.models import Evento
from participantes.models import Participante
from proveedores.models import Proveedor
from inscripciones.models import Inscripcion
from presupuesto.models import Contratacion


class Command(BaseCommand):
    help = 'Carga datos ficticios y roles. Requiere contraseñas locales en DEMO_*_PASSWORD.'

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        perfiles = [('admin_demo', 'Administrador', 'DEMO_ADMIN_PASSWORD'),
                    ('organizador_demo', 'Organizador', 'DEMO_ORGANIZADOR_PASSWORD'),
                    ('consulta_demo', 'Consulta', 'DEMO_CONSULTA_PASSWORD')]
        for username, rol, variable in perfiles:
            password = os.getenv(variable)
            if not password:
                raise CommandError(f'Configure {variable} en .env. No hay contraseñas predeterminadas.')
            try:
                validate_password(password, User(username=username))
            except ValidationError as exc:
                raise CommandError(f'{variable}: {"; ".join(exc.messages)}')
        for username, rol, variable in perfiles:
            grupo, _ = Group.objects.get_or_create(name=rol)
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password(os.environ[variable])
                user.save()
            user.groups.add(grupo)
        # get_or_create conserva las ediciones posteriores y no restablece contraseñas.
        for i, nombre in enumerate(['Feria de emprendimientos', 'Congreso de tecnología', 'Encuentro cultural']):
            Evento.objects.get_or_create(nombre=nombre, defaults={
                'fecha': timezone.now() + timedelta(days=30 + i), 'lugar': 'Sede del Pacífico',
                'cupo': 20, 'presupuesto': Decimal('500000.00'),
            })
        for i, nombre in enumerate(['Ana Solís', 'Luis Mora', 'Sofía Rojas', 'David Vega', 'María León', 'José Arias'], 1):
            Participante.objects.get_or_create(cedula=f'DEMO-{i:03d}', defaults={
                'nombre': nombre, 'correo': f'participante{i}@example.com'})
        for nombre, servicio in [('Sonido Pacífico', 'Sonido'), ('Sabores del Puerto', 'Alimentación'),
                                  ('Luces del Mar', 'Iluminación')]:
            Proveedor.objects.get_or_create(nombre=nombre, defaults={
                'servicio': servicio, 'contacto': 'demo@example.com'})
        evento = Evento.objects.select_for_update().get(nombre='Feria de emprendimientos')
        # En ejecuciones posteriores se conserva el proceso existente.
        if evento.estado == 'ABIERTO' and evento.fecha > timezone.now():
            for p in Participante.objects.filter(cedula__in=['DEMO-001', 'DEMO-002', 'DEMO-003']):
                if evento.inscritos_activos < evento.cupo:
                    Inscripcion.objects.get_or_create(evento=evento, participante=p)
            for nombre in ['Sonido Pacífico', 'Sabores del Puerto']:
                proveedor = Proveedor.objects.get(nombre=nombre)
                if evento.gasto_total + Decimal('100000') <= evento.presupuesto:
                    Contratacion.objects.get_or_create(evento=evento, proveedor=proveedor,
                                                       defaults={'monto': Decimal('100000')})
        self.stdout.write(self.style.SUCCESS('Datos ficticios y tres perfiles preparados. No se imprimen secretos.'))
