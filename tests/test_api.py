from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APITestCase

from eventos.models import Evento
from participantes.models import Participante
from proveedores.models import Proveedor


class APIFixture(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_user('administrador', password='ClavePruebas-A7!')
        cls.organizador = User.objects.create_user('organizador', password='ClavePruebas-A7!')
        cls.consulta = User.objects.create_user('consulta', password='ClavePruebas-A7!')
        for user, rol in [(cls.admin, 'Administrador'), (cls.organizador, 'Organizador'), (cls.consulta, 'Consulta')]:
            grupo, _ = Group.objects.get_or_create(name=rol)
            user.groups.add(grupo)
        cls.evento = Evento.objects.create(nombre='Feria', fecha=timezone.now() + timedelta(days=30),
                                           lugar='Puntarenas', cupo=2, presupuesto='1000.00')
        cls.p1 = Participante.objects.create(nombre='Ana', correo='ana@example.com', cedula='DEMO-1')
        cls.p2 = Participante.objects.create(nombre='Luis', correo='luis@example.com', cedula='DEMO-2')
        cls.p3 = Participante.objects.create(nombre='Sofía', correo='sofia@example.com', cedula='DEMO-3')
        cls.proveedor = Proveedor.objects.create(nombre='Sonido', servicio='Audio', contacto='audio@example.com')
        cls.proveedor2 = Proveedor.objects.create(nombre='Comidas', servicio='Catering', contacto='comida@example.com')

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def inscribir(self, participante=None, **extra):
        return self.client.post('/api/inscripciones/', {
            'evento': self.evento.pk, 'participante': (participante or self.p1).pk, **extra,
        }, format='json')

    def contratar(self, proveedor=None, monto='600.00'):
        return self.client.post('/api/presupuesto/', {
            'evento': self.evento.pk, 'proveedor': (proveedor or self.proveedor).pk, 'monto': monto,
        }, format='json')

    def payload_evento(self, **extra):
        return {'nombre': 'Congreso', 'fecha': (timezone.now() + timedelta(days=45)).isoformat(),
                'lugar': 'Esparza', 'cupo': 10, 'presupuesto': '2000.00', 'estado': 'ABIERTO', **extra}

    def crud(self, recurso, data, cambios, patch_data):
        url = f'/api/{recurso}/'
        creado = self.client.post(url, data, format='json')
        self.assertEqual(creado.status_code, 201, creado.data)
        id = creado.data['id']
        detalle = f'{url}{id}/'
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(detalle).data['id'], id)
        actualizado = self.client.put(detalle, {**data, **cambios}, format='json')
        self.assertEqual(actualizado.status_code, 200, actualizado.data)
        parcial = self.client.patch(detalle, patch_data, format='json')
        self.assertEqual(parcial.status_code, 200, parcial.data)
        for clave, valor in patch_data.items():
            self.assertEqual(parcial.data[clave], valor)
        self.assertEqual(self.client.delete(detalle).status_code, 204)
        self.assertEqual(self.client.get(detalle).status_code, 404)


class CRUDTests(APIFixture):
    def test_crud_eventos(self):
        self.crud('eventos', self.payload_evento(), {'nombre': 'Congreso actualizado'}, {'lugar': 'Barranca'})

    def test_crud_participantes(self):
        self.crud('participantes', {'nombre': 'José', 'correo': 'jose@example.com', 'cedula': 'DEMO-4'},
                  {'nombre': 'José Arias'}, {'correo': 'nuevo@example.com'})

    def test_crud_proveedores(self):
        self.crud('proveedores', {'nombre': 'Luces', 'servicio': 'Iluminación', 'contacto': 'demo@example.com'},
                  {'nombre': 'Luces del Mar'}, {'servicio': 'Escenario'})

    def test_crud_inscripciones(self):
        self.crud('inscripciones', {'evento': self.evento.pk, 'participante': self.p1.pk, 'estado': 'ACTIVA'},
                  {'estado': 'CANCELADA'}, {'estado': 'ACTIVA'})

    def test_crud_presupuesto(self):
        self.crud('presupuesto', {'evento': self.evento.pk, 'proveedor': self.proveedor.pk, 'monto': '100.00'},
                  {'monto': '200.00'}, {'monto': '150.00'})


class ReglasTests(APIFixture):
    def test_no_inscribir_evento_lleno(self):
        self.assertEqual(self.inscribir(self.p1).status_code, 201)
        self.assertEqual(self.inscribir(self.p2).status_code, 201)
        response = self.inscribir(self.p3)
        self.assertEqual(response.status_code, 400)
        self.assertIn('cupo', str(response.data))
        self.assertEqual(self.evento.inscritos_activos, 2)

    def test_no_duplicar_inscripcion(self):
        self.inscribir()
        self.assertEqual(self.inscribir().status_code, 400)

    def test_no_contratar_sobre_presupuesto(self):
        self.assertEqual(self.contratar().status_code, 201)
        response = self.contratar(self.proveedor2, '400.01')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Saldo disponible: 400.00', str(response.data))

    def test_no_reducir_cupo_patch(self):
        self.inscribir(self.p1)
        self.inscribir(self.p2)
        response = self.client.patch(f'/api/eventos/{self.evento.pk}/', {'cupo': 1}, format='json')
        self.assertEqual(response.status_code, 400)
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.cupo, 2)

    def test_no_borrar_evento_con_inscripciones_activas(self):
        self.inscribir()
        response = self.client.delete(f'/api/eventos/{self.evento.pk}/')
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Evento.objects.filter(pk=self.evento.pk).exists())


class SeguridadTests(APIFixture):
    def test_anonimo_401_con_cabecera_token(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/eventos/')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response['WWW-Authenticate'], 'Token')

    def test_consulta_lee_todos_modulos_y_no_escribe(self):
        self.client.force_authenticate(user=self.consulta)
        for recurso in ['eventos', 'participantes', 'inscripciones', 'proveedores', 'presupuesto']:
            with self.subTest(recurso=recurso):
                self.assertEqual(self.client.get(f'/api/{recurso}/').status_code, 200)
                self.assertEqual(self.client.post(f'/api/{recurso}/', {}, format='json').status_code, 403)

    def test_organizador_gestiona_eventos_proveedores_y_presupuesto(self):
        self.client.force_authenticate(user=self.organizador)
        self.assertEqual(self.client.patch(f'/api/eventos/{self.evento.pk}/', {'cupo': 4}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(f'/api/proveedores/{self.proveedor.pk}/', {'servicio': 'Música'},
                                          format='json').status_code, 200)
        self.assertEqual(self.contratar().status_code, 201)


class ConsultasTests(APIFixture):
    def test_paginacion(self):
        for i in range(4, 7):
            Participante.objects.create(nombre=f'Persona {i}', correo=f'p{i}@example.com', cedula=f'PAG-{i}')
        response = self.client.get('/api/participantes/?page=2')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_registros'], 6)
        self.assertEqual(response.data['pagina_actual'], 2)
        self.assertEqual(len(response.data['resultados']), 1)

    def test_filtros_combinados_eventos_busqueda_orden(self):
        Evento.objects.create(**{**self.payload_evento(), 'fecha': timezone.now() + timedelta(days=40)})
        response = self.client.get('/api/eventos/?estado=ABIERTO&lugar=Puntarenas&search=Feria&ordering=-cupo')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_registros'], 1)
        self.assertEqual(response.data['resultados'][0]['id'], self.evento.pk)