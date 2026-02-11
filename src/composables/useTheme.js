import { ref, watch, onMounted } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'

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
    isDark.value = theme === 'dark'
    vuetifyTheme.global.name.value = theme
    saveTheme(theme)
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
    currentTheme: vuetifyTheme.global.name
  }
}
