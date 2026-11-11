from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet, MascotaViewSet, CitaViewSet, ConsultaViewSet,
    LoginView, logout, resumen,
)

router = DefaultRouter()
router.register('clientes', ClienteViewSet)
router.register('mascotas', MascotaViewSet)
router.register('citas', CitaViewSet)
router.register('consultas', ConsultaViewSet)

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('logout/', logout),
    path('resumen/', resumen),
] + router.urls