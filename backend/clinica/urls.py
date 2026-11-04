from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet, MascotaViewSet, CitaViewSet, ConsultaViewSet
)

router = DefaultRouter()
router.register('clientes', ClienteViewSet)
router.register('mascotas', MascotaViewSet)
router.register('citas', CitaViewSet)
router.register('consultas', ConsultaViewSet)

urlpatterns = router.urls