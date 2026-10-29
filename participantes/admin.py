from django.contrib import admin
from .models import Participante


@admin.register(Participante)
class ParticipanteAdmin(admin.ModelAdmin):
    """Operaciones de negocio por API para conservar sus validaciones."""
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
