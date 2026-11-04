from django.db import models


class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['apellido', 'nombre']

    def __str__(self):
        return f'{self.nombre} {self.apellido}'


class Mascota(models.Model):
    ESPECIES = [
        ('perro', 'Perro'),
        ('gato', 'Gato'),
        ('ave', 'Ave'),
        ('otro', 'Otro'),
    ]
    SEXOS = [
        ('macho', 'Macho'),
        ('hembra', 'Hembra'),
    ]

    cliente = models.ForeignKey(
        Cliente, on_delete=models.CASCADE, related_name='mascotas'
    )
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=20, choices=ESPECIES)
    raza = models.CharField(max_length=100, blank=True)
    sexo = models.CharField(max_length=10, choices=SEXOS)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} ({self.cliente})'


class Cita(models.Model):
    ESTADOS = [
        ('programada', 'Programada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]

    mascota = models.ForeignKey(
        Mascota, on_delete=models.CASCADE, related_name='citas'
    )
    fecha_hora = models.DateTimeField()
    motivo = models.CharField(max_length=200)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='programada')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha_hora']

    def __str__(self):
        return f'{self.mascota.nombre} - {self.fecha_hora:%d/%m/%Y %H:%M}'


class Consulta(models.Model):
    mascota = models.ForeignKey(
        Mascota, on_delete=models.CASCADE, related_name='consultas'
    )
    cita = models.OneToOneField(
        Cita, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='consulta'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=200)
    diagnostico = models.TextField()
    tratamiento = models.TextField()
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'Consulta de {self.mascota.nombre} - {self.fecha:%d/%m/%Y}'