/**
 * Composable para gestión de Super Admin
 * Super Admin = Usuario en auth.users pero NO en tabla users (sin tenant)
 */
import { computed } from 'vue'
import { useAuth } from './useAuth'
import { useTenant } from './useTenant'

const normalizeEmail = (value) => String(value || '')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .toLowerCase()

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(normalizeEmail)
  .filter(Boolean)

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
      !userProfile.value // NO tiene perfil en tabla users
    )
  })

  // Emails específicos que pueden ser super admin (opcional)
  const allowedSuperAdminEmails = [
    // 'superadmin@empresa.com',
    // 'admin@sistema.com'
  ]

  const isSuperAdminByEmail = computed(() => {
    // Fail-closed: requiere whitelist explícita
    const allowed = SUPER_ADMIN_EMAILS.length > 0 ? SUPER_ADMIN_EMAILS : allowedSuperAdminEmails
    if (allowed.length === 0) return false
    if (!user.value?.email) return false // Guarda: si no hay email, no es super admin
    return allowed.includes(normalizeEmail(user.value.email))
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
