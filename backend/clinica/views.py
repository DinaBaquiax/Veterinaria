from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cliente, Mascota, Cita, Consulta
from .serializers import (
    ClienteSerializer, MascotaSerializer, CitaSerializer, ConsultaSerializer
)


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'apellido', 'telefono']


class MascotaViewSet(viewsets.ModelViewSet):
    queryset = Mascota.objects.select_related('cliente')
    serializer_class = MascotaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'cliente__nombre', 'cliente__apellido']

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        mascota = self.get_object()
        consultas = mascota.consultas.all()
        serializer = ConsultaSerializer(consultas, many=True)
        return Response(serializer.data)


class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.select_related('mascota')
    serializer_class = CitaSerializer


class ConsultaViewSet(viewsets.ModelViewSet):
    queryset = Consulta.objects.select_related('mascota')
    serializer_class = ConsultaSerializer