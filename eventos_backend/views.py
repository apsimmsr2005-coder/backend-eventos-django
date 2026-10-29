from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

class LoginThrottle(AnonRateThrottle):
    scope = 'login'

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def token_api(request):
    serializer = AuthTokenSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    token, _ = Token.objects.get_or_create(user=serializer.validated_data['user'])
    return Response({'token': token.key})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_api(request):
    request.auth.delete()
    return Response(status=204)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuario_api(request):
    administrador = (
        request.user.is_staff or request.user.is_superuser
        or request.user.groups.filter(name='Administrador').exists()
    )
    if not administrador and not request.user.groups.filter(name__in=['Organizador', 'Consulta']).exists():
        return Response({'detail': 'Su perfil no tiene permiso para esta operación.'}, status=403)
    return Response({'id': request.user.pk, 'username': request.user.username,
                     'roles': list(request.user.groups.values_list('name', flat=True)),
                     'administrador': administrador})
