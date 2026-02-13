<template>
  <div>
    <v-card>
      <v-card-title class="text-h4 bg-primary pa-4">
        <v-icon start color="white" size="large">mdi-information</v-icon>
        <span class="text-white">Acerca de POSLite</span>
      </v-card-title>
      <v-card-text class="pa-6">
        <v-row>
          <!-- Información del Sistema -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="bg-primary-lighten-4">
                <v-icon start color="primary">mdi-application</v-icon>
                Información del Sistema
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Aplicación</v-list-item-title>
                    <v-list-item-subtitle>POSLite - Sistema de Punto de Venta</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Versión</v-list-item-title>
                    <v-list-item-subtitle>{{ systemInfo.version }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Entorno</v-list-item-title>
                    <v-list-item-subtitle>{{ systemInfo.environment }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Última actualización</v-list-item-title>
                    <v-list-item-subtitle>{{ systemInfo.lastUpdate }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Información del Tenant -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="bg-success-lighten-4">
                <v-icon start color="success">mdi-office-building</v-icon>
                Información del Negocio
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Empresa</v-list-item-title>
                    <v-list-item-subtitle>{{ tenantInfo.name || 'Cargando...' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Usuario</v-list-item-title>
                    <v-list-item-subtitle>{{ tenantInfo.userName || 'Cargando...' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Rol</v-list-item-title>
                    <v-list-item-subtitle>{{ tenantInfo.role || 'Cargando...' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Tema</v-list-item-title>
                    <v-list-item-subtitle>{{ tenantInfo.theme }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Estadísticas del Sistema -->
          <v-col cols="12" class="mt-4">
            <v-card variant="outlined">
              <v-card-title class="bg-info-lighten-4">
                <v-icon start color="info">mdi-chart-bar</v-icon>
                Estadísticas
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="6" sm="3">
                    <v-card color="primary" variant="tonal">
                      <v-card-text class="text-center">
                        <v-icon size="x-large" color="primary">mdi-package-variant</v-icon>
                        <div class="text-h4 mt-2">{{ stats.products }}</div>
                        <div class="text-caption">Productos</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-card color="success" variant="tonal">
                      <v-card-text class="text-center">
                        <v-icon size="x-large" color="success">mdi-receipt</v-icon>
                        <div class="text-h4 mt-2">{{ stats.sales }}</div>
                        <div class="text-caption">Ventas</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-card color="warning" variant="tonal">
                      <v-card-text class="text-center">
                        <v-icon size="x-large" color="warning">mdi-account-group</v-icon>
                        <div class="text-h4 mt-2">{{ stats.customers }}</div>
                        <div class="text-caption">Clientes</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-card color="info" variant="tonal">
                      <v-card-text class="text-center">
                        <v-icon size="x-large" color="info">mdi-store</v-icon>
                        <div class="text-h4 mt-2">{{ stats.locations }}</div>
                        <div class="text-caption">Sedes</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Características Principales -->
          <v-col cols="12" md="6" class="mt-4">
            <v-card variant="outlined">
              <v-card-title class="bg-purple-lighten-4">
                <v-icon start color="purple">mdi-star</v-icon>
                Características Principales
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item
                    v-for="feature in features"
                    :key="feature.title"
                  >
                    <template v-slot:prepend>
                      <v-icon :color="feature.color" size="small">{{ feature.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ feature.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Tecnologías Utilizadas -->
          <v-col cols="12" md="6" class="mt-4">
            <v-card variant="outlined">
              <v-card-title class="bg-orange-lighten-4">
                <v-icon start color="orange">mdi-code-tags</v-icon>
                Tecnologías Utilizadas
              </v-card-title>
              <v-card-text>
                <v-chip-group column>
                  <v-chip
                    v-for="tech in technologies"
                    :key="tech.name"
                    :color="tech.color"
                    size="small"
                    variant="flat"
                  >
                    <v-icon start size="small">{{ tech.icon }}</v-icon>
                    {{ tech.name }}
                  </v-chip>
                </v-chip-group>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Información Adicional -->
          <v-col cols="12" class="mt-4">
            <v-alert
              type="info"
              variant="tonal"
              prominent
            >
              <v-alert-title>
                <v-icon start>mdi-information</v-icon>
                Sistema Multi-Tenant
              </v-alert-title>
              POSLite es un sistema de punto de venta moderno con soporte multi-tenant, 
              seguridad por filas (RLS), gestión de inventario en múltiples sedes, 
              sistema de impuestos configurable, reglas de precios dinámicas y mucho más.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import supabaseService from '@/services/supabase.service'

const { tenantId, tenantData } = useTenant()
const { userProfile } = useAuth()
const { currentTheme } = useTheme()

const systemInfo = ref({
  version: '1.0.0',
  environment: import.meta.env.MODE === 'production' ? 'Producción' : 'Desarrollo',
  lastUpdate: 'Febrero 2026'
})

const tenantInfo = computed(() => ({
  name: tenantData.value?.name || 'No disponible',
  userName: userProfile.value?.full_name || 'No disponible',
  role: userProfile.value?.role || 'No disponible',
  theme: currentTheme.value === 'dark' ? 'Oscuro' : 'Claro'
}))

const stats = ref({
  products: '...',
  sales: '...',
  customers: '...',
  locations: '...'
})

const features = ref([
  { title: 'Multi-Tenant con RLS', icon: 'mdi-security', color: 'primary' },
  { title: 'Gestión de Inventario', icon: 'mdi-warehouse', color: 'success' },
  { title: 'Sistema de Impuestos', icon: 'mdi-calculator', color: 'warning' },
  { title: 'Reglas de Precios', icon: 'mdi-tag-multiple', color: 'info' },
  { title: 'Punto de Venta', icon: 'mdi-cash-register', color: 'purple' },
  { title: 'Gestión de Usuarios', icon: 'mdi-account-group', color: 'pink' },
  { title: 'Reportes y Análisis', icon: 'mdi-chart-line', color: 'teal' },
  { title: 'Plan Separe', icon: 'mdi-calendar-clock', color: 'orange' },
  { title: 'Alertas en Tiempo Real', icon: 'mdi-bell-alert', color: 'red' },
  { title: 'Configuración Multi-Sede', icon: 'mdi-office-building-marker', color: 'cyan' }
])

const technologies = ref([
  { name: 'Vue.js 3', icon: 'mdi-vuejs', color: 'success' },
  { name: 'Vuetify 3', icon: 'mdi-material-design', color: 'primary' },
  { name: 'Supabase', icon: 'mdi-database', color: 'green' },
  { name: 'PostgreSQL', icon: 'mdi-database', color: 'info' },
  { name: 'Vite', icon: 'mdi-lightning-bolt', color: 'warning' },
  { name: 'Vue Router', icon: 'mdi-routes', color: 'purple' },
  { name: 'JavaScript ES6+', icon: 'mdi-language-javascript', color: 'yellow' }
])

const loadStats = async () => {
  if (!tenantId.value) return

  try {
    // Contar productos
    const { count: productsCount } = await supabaseService.client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId.value)
    stats.value.products = productsCount || 0

    // Contar ventas
    const { count: salesCount } = await supabaseService.client
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId.value)
    stats.value.sales = salesCount || 0

    // Contar clientes
    const { count: customersCount } = await supabaseService.client
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId.value)
    stats.value.customers = customersCount || 0

    // Contar sedes
    const { count: locationsCount } = await supabaseService.client
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId.value)
    stats.value.locations = locationsCount || 0
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
    stats.value = { products: 'N/A', sales: 'N/A', customers: 'N/A', locations: 'N/A' }
  }
}

onMounted(() => {
  loadStats()
})
</script>
