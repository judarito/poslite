import { supabase } from '@/plugins/supabase'
import router from '@/router'

let sessionCheckInterval = null
let visibilityHandler = null
let isChecking = false
const SESSION_CHECK_INTERVAL = 60000 // Verificar cada 60 segundos

async function performSessionCheck() {
  // Evitar checks concurrentes
  if (isChecking) return
  isChecking = true

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.warn('Session check: No session found')
      stopSessionMonitoring()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
      return
    }

    // Verificar si el token expiró o está próximo a expirar
    const expiresAt = session.expires_at || 0
    const now = Math.floor(Date.now() / 1000)
    const timeLeft = expiresAt - now

    if (timeLeft <= 0) {
      // Token ya expirado — refrescar
      console.log('Token expired, refreshing...')
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.warn('Session refresh failed:', error.message)
        stopSessionMonitoring()
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
      } else {
        console.log('Session refreshed after expiry')
        // Invalidar caché del service
        try {
          const { default: svc } = await import('@/services/supabase.service')
          svc.invalidateSessionCache()
        } catch (_) {}
      }
    } else if (timeLeft < 300) {
      // Próximo a expirar — refrescar preventivamente
      console.log(`Token expires in ${timeLeft}s, refreshing...`)
      await supabase.auth.refreshSession()
    }
  } catch (error) {
    console.error('Session check error:', error)
  } finally {
    isChecking = false
  }
}

// Iniciar verificación periódica de sesión
export function startSessionMonitoring() {
  if (sessionCheckInterval) return

  console.log('Starting session monitoring...')
  sessionCheckInterval = setInterval(performSessionCheck, SESSION_CHECK_INTERVAL)

  // Manejar cuando la pestaña vuelve a estar visible (wake-up)
  if (!visibilityHandler) {
    visibilityHandler = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab visible again, checking session...')
        // Invalidar caché del service para forzar revalidación
        try {
          const { default: svc } = await import('@/services/supabase.service')
          svc.invalidateSessionCache()
        } catch (_) {}
        performSessionCheck()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }
}

// Detener verificación periódica
export function stopSessionMonitoring() {
  if (sessionCheckInterval) {
    console.log('Stopping session monitoring...')
    clearInterval(sessionCheckInterval)
    sessionCheckInterval = null
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
}

// Verificar sesión inmediatamente
export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}
