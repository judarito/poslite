/**
 * Composable para gestión de Super Admin
 * Super Admin = Usuario en auth.users pero NO en tabla users (sin tenant)
 */
import { ref, computed } from 'vue'
import { useAuth } from './useAuth'
import { useTenant } from './useTenant'

export const useSuperAdmin = () => {
  const { userProfile, user } = useAuth()
  const { tenantId } = useTenant()

  // Super Admin es quien:
  // 1. Está autenticado en auth.users 
  // 2. NO tiene registro en tabla users (sin tenant_id)
  const isSuperAdmin = computed(() => {
    // Guarda defensiva: asegurar que user está disponible
    if (!user.value?.id) {
      return false
    }
    
    return !!(
      user.value && // Autenticado en Auth
      user.value.id && // Tiene ID de auth
      !userProfile.value && // NO tiene perfil en tabla users
      !tenantId.value // NO tiene tenant
    )
  })

  // Emails específicos que pueden ser super admin (opcional)
  const allowedSuperAdminEmails = [
    // 'superadmin@empresa.com',
    // 'admin@sistema.com'
  ]

  const isSuperAdminByEmail = computed(() => {
    if (allowedSuperAdminEmails.length === 0) return true // Sin restricción
    if (!user.value?.email) return false // Guarda: si no hay email, no es super admin
    return allowedSuperAdminEmails.includes(user.value.email)
  })

  const canManageTenants = computed(() => {
    return isSuperAdmin.value && isSuperAdminByEmail.value
  })

  return {
    isSuperAdmin,
    canManageTenants,
    superAdminInfo: computed(() => ({
      userId: user.value?.id,
      email: user.value?.email,
      hasProfile: !!userProfile.value,
      hasTenant: !!tenantId.value
    }))
  }
}