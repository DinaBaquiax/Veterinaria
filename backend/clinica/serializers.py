from django.utils import timezone
from rest_framework import serializers
from .models import Cliente, Mascota, Cita, Consulta


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_telefono(self, value):
        digitos = [c for c in value if c.isdigit()]
        if len(digitos) < 8:
            raise serializers.ValidationError(
                'El teléfono debe tener al menos 8 dígitos.'
            )
        return value


class MascotaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Mascota
        fields = '__all__'

    def get_cliente_nombre(self, obj):
        return str(obj.cliente)

    def validate_fecha_nacimiento(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError(
                'La fecha de nacimiento no puede ser futura.'
            )
        return value


class CitaSerializer(serializers.ModelSerializer):
    mascota_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cita
        fields = '__all__'

    def get_mascota_nombre(self, obj):
        return obj.mascota.nombre

    def validate_fecha_hora(self, value):
        if self.instance is None and value < timezone.now():
            raise serializers.ValidationError(
                'No se puede programar una cita en el pasado.'
            )
        return value


class ConsultaSerializer(serializers.ModelSerializer):
    mascota_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Consulta
        fields = '__all__'

    def get_mascota_nombre(self, obj):
        return obj.mascota.nombre

    def validate(self, data):
        cita = data.get('cita')
        mascota = data.get('mascota')
        if cita and mascota and cita.mascota != mascota:
            raise serializers.ValidationError(
                'La cita seleccionada no pertenece a esta mascota.'
            )
        return data