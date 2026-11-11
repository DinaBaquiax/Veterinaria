from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view

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

class LoginView(ObtainAuthToken):
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=usuario)
        return Response({'token': token.key, 'usuario': usuario.username})


@api_view(['POST'])
def logout(request):
    if request.auth:
        request.auth.delete()
    return Response(status=204)


@api_view(['GET'])
def resumen(request):
    ahora = timezone.localtime()
    hoy = ahora.date()
    inicio_mes = hoy.replace(day=1)
    return Response({
        'clientes': Cliente.objects.count(),
        'mascotas': Mascota.objects.count(),
        'citas_hoy': Cita.objects.filter(
            fecha_hora__date=hoy, estado='programada'
        ).count(),
        'citas_pendientes': Cita.objects.filter(
            estado='programada', fecha_hora__gte=ahora
        ).count(),
        'consultas_mes': Consulta.objects.filter(
            fecha__date__gte=inicio_mes
        ).count(),
    })    