<template>
  <div>
    <!-- Sesión de caja (solo si no hay sesión abierta) -->
    <v-row v-if="!hasOpenSession">
      <v-col cols="12">
        <CashSessionCard />
      </v-col>
    </v-row>

    <!-- Widget de Pronóstico de Ventas con IA -->
    <v-row>
      <v-col cols="12">
        <SalesForecastWidget />
      </v-col>
    </v-row>

    <!-- Accesos directos -->
    <v-row>
      <v-col
        v-for="card in visibleCards"
        :key="card.title"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card elevation="2" hover @click="navigateTo(card.route)" style="cursor: pointer;">
          <v-card-title class="d-flex align-center">
            <v-icon :color="card.color" size="large" class="mr-2">
              {{ card.icon }}
            </v-icon>
            {{ card.title }}
          </v-card-title>
          <v-card-text>
            {{ card.description }}
          </v-card-text>
          <v-card-actions>
            <v-btn :color="card.color" variant="text" @click.stop="navigateTo(card.route)">
              Ir
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCashSession } from '@/composables/useCashSession'
import { useAuth } from '@/composables/useAuth'
import CashSessionCard from '@/components/CashSessionCard.vue'
import SalesForecastWidget from '@/components/SalesForecastWidget.vue'

const router = useRouter()
const { hasOpenSession, loadPOSContext } = useCashSession()
const { userProfile } = useAuth()

onMounted(async () => {
  await loadPOSContext()
})

const cards = ref([
  {
    title: 'Punto de Venta',
    icon: 'mdi-point-of-sale',
    color: 'primary',
    description: 'Registra ventas rápidamente',
    route: '/pos',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: 'Productos',
    icon: 'mdi-package-variant',
    color: 'success',
    description: 'Administra tu catálogo de productos',
    route: '/products',
    roles: ['ADMINISTRADOR', 'GERENTE', 'VENDEDOR'] // NO cajeros
  },
  {
    title: 'Ventas',
    icon: 'mdi-cart',
    color: 'info',
    description: 'Consulta historial de ventas',
    route: '/sales',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: 'Plan Separe',
    icon: 'mdi-calendar-clock',
    color: 'blue',
    description: 'Contratos de plan separe',
    route: '/layaway',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: 'Inventario',
    icon: 'mdi-warehouse',
    color: 'orange',
    description: 'Control de stock y movimientos',
    route: '/inventory',
    roles: ['ADMINISTRADOR', 'GERENTE'] // NO cajeros
  },
  {
    title: 'Compras',
    icon: 'mdi-cart-plus',
    color: 'teal',
    description: 'Registro de compras a proveedores',
    route: '/purchases',
    roles: ['ADMINISTRADOR', 'GERENTE'] // NO cajeros
  },
  {
    title: 'Reportes',
    icon: 'mdi-chart-bar',
    color: 'purple',
    description: 'Reportes y estadísticas',
    route: '/reports',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
])

// Filtrar cards según roles del usuario
const visibleCards = computed(() => {
  if (!userProfile.value?.roles) return []
  
  const userRoles = userProfile.value.roles.map(r => r.name)
  
  return cards.value.filter(card => {
    // Si el usuario tiene al menos uno de los roles requeridos
    return card.roles.some(role => userRoles.includes(role))
  })
})

const navigateTo = (route) => {
  if (route) {
    router.push(route)
  }
}
</script>
