import random
import unicodedata
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from clinica.models import Cita, Cliente, Consulta, Mascota

# Los clientes de ejemplo se reconocen por este dominio de correo (así se pueden borrar)
DOMINIO = '@ejemplo.com'

NOMBRES = [
    'María', 'José', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Sofía', 'Diego', 'Lucía', 'Carlos',
    'Andrea', 'Jorge', 'Valeria', 'Miguel', 'Daniela', 'Rafael', 'Paola', 'Fernando',
    'Gabriela', 'Héctor',
]
APELLIDOS = [
    'García', 'López', 'Pérez', 'Hernández', 'Martínez', 'Gómez', 'Díaz', 'Morales',
    'Ramírez', 'Cruz', 'Reyes', 'Castillo', 'Ortiz', 'Mendoza', 'Vásquez', 'Rodríguez',
]
DIRECCIONES = [
    'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Centro', 'Barrio El Calvario',
    'Colonia Los Pinos',
]
NOMBRES_MASCOTA = [
    'Max', 'Luna', 'Rocky', 'Mía', 'Toby', 'Nala', 'Simba', 'Coco', 'Bella', 'Thor', 'Lola',
    'Rex', 'Kira', 'Milo', 'Canela', 'Pelusa', 'Duke', 'Maya', 'Boby', 'Nube',
]
RAZAS = {
    'perro': ['Labrador', 'Criollo', 'Chihuahua', 'Pastor Alemán', 'Poodle', 'Beagle'],
    'gato': ['Siamés', 'Persa', 'Criollo', 'Angora'],
    'ave': ['Periquito', 'Canario', 'Cacatúa'],
    'otro': ['Conejo', 'Hámster', 'Tortuga'],
}
SERVICIOS = ['Consultas', 'Vacunas', 'Desparasitantes', 'Profilaxis dental', 'Esterilizaciones']
DIAGNOSTICOS = [
    'Estado general saludable', 'Otitis leve', 'Dermatitis alérgica', 'Gastroenteritis',
    'Sobrepeso', 'Parásitos intestinales', 'Sarro dental',
]
TRATAMIENTOS = [
    'Control en 15 días', 'Antibiótico por 7 días', 'Cambio de alimento', 'Baño medicado',
    'Desparasitación y reposo', 'Limpieza dental programada',
]
OBSERVACIONES = [
    '', '', 'Se recomienda control en un mes.', 'Se informó el tratamiento al cliente.',
    'Buena respuesta al tratamiento.',
]


def sin_tildes(texto):
    """Quita tildes para armar el correo (María -> maria)."""
    normal = unicodedata.normalize('NFD', texto)
    return ''.join(c for c in normal if unicodedata.category(c) != 'Mn')


class Command(BaseCommand):
    help = 'Crea datos de ejemplo (clientes, mascotas, citas y consultas) para probar el sistema.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad', type=int, default=25,
            help='Cantidad de clientes de ejemplo a crear (por defecto 25).',
        )
        parser.add_argument(
            '--borrar', action='store_true',
            help='Borra los datos de ejemplo creados antes (y sus mascotas, citas y consultas).',
        )

    def handle(self, *args, **opciones):
        if opciones['borrar']:
            total, _ = Cliente.objects.filter(email__endswith=DOMINIO).delete()
            self.stdout.write(self.style.SUCCESS(f'Se borraron {total} registros de ejemplo.'))
            return

        ahora = timezone.localtime()
        cuenta = {'clientes': 0, 'mascotas': 0, 'citas': 0, 'consultas': 0}

        with transaction.atomic():
            for i in range(1, opciones['cantidad'] + 1):
                nombre = random.choice(NOMBRES)
                apellido = random.choice(APELLIDOS)
                cliente = Cliente.objects.create(
                    nombre=nombre,
                    apellido=apellido,
                    telefono=f'5{random.randint(1000000, 9999999)}',
                    email=f'{sin_tildes(nombre)}.{sin_tildes(apellido)}{i}{DOMINIO}'.lower(),
                    direccion=random.choice(DIRECCIONES),
                )
                registrado = ahora - timedelta(days=random.randint(0, 60))
                Cliente.objects.filter(pk=cliente.pk).update(creado=registrado)
                cuenta['clientes'] += 1

                for _ in range(random.randint(1, 2)):
                    especie = random.choices(['perro', 'gato', 'ave', 'otro'], weights=[5, 4, 1, 1])[0]
                    mascota = Mascota.objects.create(
                        cliente=cliente,
                        nombre=random.choice(NOMBRES_MASCOTA),
                        especie=especie,
                        raza=random.choice(RAZAS[especie]),
                        sexo=random.choice(['macho', 'hembra']),
                        fecha_nacimiento=timezone.localdate() - timedelta(days=random.randint(90, 4500)),
                    )
                    Mascota.objects.filter(pk=mascota.pk).update(creado=registrado)
                    cuenta['mascotas'] += 1

                    for _ in range(random.randint(1, 3)):
                        servicio = random.choice(SERVICIOS)
                        fecha = ahora.replace(
                            hour=random.randint(8, 17),
                            minute=random.choice([0, 15, 30, 45]),
                            second=0,
                            microsecond=0,
                        ) + timedelta(days=random.randint(-30, 20))

                        if fecha < ahora:
                            estado = random.choices(['completada', 'cancelada'], weights=[8, 2])[0]
                        else:
                            estado = 'programada'

                        cita = Cita.objects.create(
                            mascota=mascota, fecha_hora=fecha, motivo=servicio, estado=estado,
                        )
                        cuenta['citas'] += 1

                        # Las citas completadas tienen su consulta
                        if estado == 'completada':
                            consulta = Consulta.objects.create(
                                mascota=mascota,
                                cita=cita,
                                motivo=servicio,
                                diagnostico=random.choice(DIAGNOSTICOS),
                                tratamiento=random.choice(TRATAMIENTOS),
                                observaciones=random.choice(OBSERVACIONES),
                            )
                            Consulta.objects.filter(pk=consulta.pk).update(fecha=fecha)
                            cuenta['consultas'] += 1

        self.stdout.write(self.style.SUCCESS(
            'Datos de ejemplo creados: '
            f"{cuenta['clientes']} clientes, {cuenta['mascotas']} mascotas, "
            f"{cuenta['citas']} citas y {cuenta['consultas']} consultas."
        ))