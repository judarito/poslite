import { ref, watch, onMounted } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import supabaseService from '@/services/supabase.service'

const THEME_STORAGE_KEY = 'poslite_theme'

export function useTheme() {
  const vuetifyTheme = useVuetifyTheme()
  const isDark = ref(false)

  // Cargar tema desde localStorage
  const loadTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme) {
      isDark.value = savedTheme === 'dark'
      vuetifyTheme.global.name.value = savedTheme
    } else {
      // Detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
      vuetifyTheme.global.name.value = prefersDark ? 'dark' : 'light'
    }
  }

  // Sincronizar tema desde tenant_settings (al hacer login o cambiar de tenant)
  const syncThemeFromTenant = async (tenantId) => {
    if (!tenantId) {
      console.warn('No se puede sincronizar tema: tenantId no proporcionado')
      return
    }

    try {
      const { data, error } = await supabaseService.client
        .from('tenant_settings')
        .select('theme')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) throw error

      if (data?.theme) {
        console.log(`🎨 Sincronizando tema del tenant: ${data.theme}`)
        setTheme(data.theme)
      }
    } catch (error) {
      console.error('Error sincronizando tema del tenant:', error)
      // Si falla, mantener el tema actual (no romper la app)
    }
  }

  // Guardar tema en localStorage
  const saveTheme = (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }

  // Alternar tema
  const toggleTheme = () => {
    isDark.value = !isDark.value
    const newTheme = isDark.value ? 'dark' : 'light'
    vuetifyTheme.global.name.value = newTheme
    saveTheme(newTheme)
  }

  // Establecer tema específico
  const setTheme = (theme) => {
    if (theme === 'auto') {
      // Modo automático: detectar del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
      vuetifyTheme.global.name.value = prefersDark ? 'dark' : 'light'
      saveTheme('auto')
    } else {
      isDark.value = theme === 'dark'
      vuetifyTheme.global.name.value = theme
      saveTheme(theme)
    }
  }

  // Observar cambios en la preferencia del sistema
  onMounted(() => {
    loadTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      // Solo cambiar si no hay preferencia guardada
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        isDark.value = e.matches
        vuetifyTheme.global.name.value = e.matches ? 'dark' : 'light'
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  })

  return {
    isDark,
    toggleTheme,
    setTheme,
    syncThemeFromTenant,
    currentTheme: vuetifyTheme.global.name
  }
}
