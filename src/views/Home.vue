<template>
  <div>
    <!-- Alerta: sesiones de caja con más de 24h abiertas -->
    <v-alert
      v-if="expiredSessions.length > 0"
      type="error"
      variant="tonal"
      class="mb-4"
      prepend-icon="mdi-clock-alert"
      :title="`${expiredSessions.length} caja${expiredSessions.length > 1 ? 's' : ''} con sesión abierta por más de 24 horas`"
    >
      <div class="text-body-2 mt-1">
        <span v-for="(s, i) in expiredSessions" :key="s.cash_session_id">
          <strong>{{ s.cash_register?.name }}</strong>
          ({{ s.cash_register?.location?.name }}) — {{ Math.floor((Date.now()-new Date(s.opened_at))/3600000) }}h abierta por {{ s.opened_by_user?.full_name }}<span v-if="i < expiredSessions.length-1">, </span>
        </span>
      </div>
      <template #append>
        <v-btn size="small" variant="outlined" color="error" to="/cash-sessions">Ver cajas</v-btn>
      </template>
    </v-alert>

    <!-- KPI Cards de ventas -->
    <v-row class="mb-1">
      <!-- Ventas Hoy -->
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="blue" class="kpi-home-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Ventas Hoy</span>
              <v-avatar color="blue" size="32">
                <v-icon color="white" size="16">mdi-calendar-today</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-blue font-weight-bold">—</div>
            <div v-else class="text-h6 text-blue font-weight-bold">{{ formatMoney(kpis?.today?.total || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ kpis?.today?.count || 0 }} transacciones</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Ventas Este Mes -->
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="green" class="kpi-home-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Este Mes</span>
              <v-avatar color="green" size="32">
                <v-icon color="white" size="16">mdi-calendar-month</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-green font-weight-bold">—</div>
            <div v-else class="text-h6 text-green font-weight-bold">{{ formatMoney(kpis?.month?.total || 0) }}</div>
            <div class="d-flex align-center flex-wrap mt-1" style="gap:4px">
              <span class="text-caption text-medium-emphasis">{{ kpis?.month?.count || 0 }} trans.</span>
              <v-chip
                v-if="kpis?.month?.vs_prev !== null && kpis?.month?.vs_prev !== undefined"
                :color="parseFloat(kpis.month.vs_prev) >= 0 ? 'green' : 'red'"
                size="x-small" variant="tonal"
              >
                <v-icon start size="10">{{ parseFloat(kpis.month.vs_prev) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                {{ Math.abs(kpis.month.vs_prev) }}% vs mes ant.
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Ventas Este Año -->
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="purple" class="kpi-home-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Este Año</span>
              <v-avatar color="purple" size="32">
                <v-icon color="white" size="16">mdi-calendar-blank</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-purple font-weight-bold">—</div>
            <div v-else class="text-h6 text-purple font-weight-bold">{{ formatMoney(kpis?.year?.total || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ kpis?.year?.count || 0 }} transacciones totales</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráficas -->
    <v-row class="mb-1">
      <!-- Tendencia 30 días -->
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="text-body-2 font-weight-bold pa-3 pb-0 d-flex align-center">
            <v-icon start color="blue" size="18">mdi-chart-line</v-icon>
            Ventas diarias — últimos 30 días
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:200px">
              <v-progress-circular indeterminate color="blue" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="dailySeries.length"
              type="area"
              height="200"
              :options="trendChartOptions"
              :series="trendSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:200px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Métodos de pago -->
      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-title class="text-body-2 font-weight-bold pa-3 pb-0 d-flex align-center">
            <v-icon start color="teal" size="18">mdi-credit-card-multiple</v-icon>
            Métodos de pago
            <span class="text-caption font-weight-regular text-medium-emphasis ml-1">(mes)</span>
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:200px">
              <v-progress-circular indeterminate color="teal" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="paymentMethods.length"
              type="donut"
              height="200"
              :options="donutChartOptions"
              :series="donutSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:200px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Top productos del mes -->
    <v-row class="mb-1">
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-body-2 font-weight-bold pa-3 pb-0 d-flex align-center">
            <v-icon start color="orange" size="18">mdi-trophy</v-icon>
            Top productos del mes
            <v-spacer></v-spacer>
            <v-btn to="/reports/ventas" variant="text" color="blue" size="x-small" append-icon="mdi-arrow-right" class="text-caption">
              Ver detalle
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:160px">
              <v-progress-circular indeterminate color="orange" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="topProducts.length"
              type="bar"
              height="180"
              :options="barChartOptions"
              :series="barSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:160px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import { useCashSession } from '@/composables/useCashSession'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useTheme } from '@/composables/useTheme'
import { useTenantSettings } from '@/composables/useTenantSettings'
import SalesForecastWidget from '@/components/SalesForecastWidget.vue'
import reportsService from '@/services/reports.service'
import cashService from '@/services/cash.service'
import { formatMoney } from '@/utils/formatters'

const apexchart = VueApexCharts

const router = useRouter()
const { loadPOSContext } = useCashSession()
const { userProfile } = useAuth()
const { tenantId } = useTenant()
const { isDark } = useTheme()
const { cashSessionMaxHours } = useTenantSettings()

// ─── KPIs & charts ────────────────────────────────────────────────────────
const kpiLoading     = ref(true)
const kpis           = ref(null)
const dailySeries    = ref([])
const topProducts    = ref([])
const paymentMethods = ref([])
const expiredSessions = ref([])

// Trend chart
const trendSeries = computed(() => [{
  name: 'Ventas',
  data: dailySeries.value.map(d => ({ x: d.date, y: Math.round(d.total) }))
}])
const trendChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, sparkline: { enabled: false }, animations: { enabled: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03 } },
  colors: ['#1565C0'],
  xaxis: {
    type: 'category', tickAmount: 8,
    labels: { rotate: -30, style: { fontSize: '10px' }, formatter: v => { if (!v) return ''; const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` } }
  },
  yaxis: { labels: { style: { fontSize: '10px' }, formatter: v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}` } },
  tooltip: { theme: isDark.value ? 'dark' : 'light', y: { formatter: v => formatMoney(v) } },
  grid: { borderColor: isDark.value ? '#444' : '#f0f0f0', padding: { left: 4, right: 4 } }
}))

// Donut chart
const methodLabels = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', OTHER: 'Otro' }
const donutSeries  = computed(() => paymentMethods.value.map(p => Math.round(p.total)))
const donutChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, animations: { enabled: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  labels: paymentMethods.value.map(p => methodLabels[p.method] || p.method),
  colors: ['#00897B', '#1565C0', '#F57C00', '#7B1FA2', '#C62828', '#546E7A'],
  dataLabels: { enabled: true, style: { fontSize: '10px' }, formatter: v => `${v.toFixed(1)}%` },
  legend: { position: 'bottom', fontSize: '10px' },
  tooltip: { theme: isDark.value ? 'dark' : 'light', y: { formatter: v => formatMoney(v) } },
  plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '11px', formatter: () => formatMoney(donutSeries.value.reduce((a, b) => a + b, 0)) } } } } }
}))

// Bar chart
const barSeries = computed(() => [{ name: 'Ingresos', data: topProducts.value.map(p => Math.round(p.revenue)) }])
const barChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, animations: { enabled: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
  colors: ['#E65100'],
  dataLabels: { enabled: true, style: { fontSize: '10px' }, formatter: v => formatMoney(v) },
  xaxis: {
    categories: topProducts.value.map(p => p.name.length > 30 ? p.name.substring(0, 28) + '…' : p.name),
    labels: { style: { fontSize: '10px' }, formatter: v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}` }
  },
  tooltip: { theme: isDark.value ? 'dark' : 'light', y: { formatter: v => formatMoney(v) } },
  grid: { borderColor: isDark.value ? '#444' : '#f0f0f0', padding: { left: 4, right: 8 } }
}))

async function loadKPIs() {
  if (!tenantId.value) return
  kpiLoading.value = true
  const res = await reportsService.getDashboardSummary(tenantId.value)
  if (res.success) {
    kpis.value           = res.kpis
    dailySeries.value    = res.dailySeries
    topProducts.value    = res.topProducts
    paymentMethods.value = res.paymentMethods
  }
  kpiLoading.value = false
}

onMounted(async () => {
  await loadPOSContext()
  await loadKPIs()
  if (tenantId.value) {
    const r = await cashService.getExpiredSessions(tenantId.value, cashSessionMaxHours.value)
    if (r.success) expiredSessions.value = r.data
  }
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

<style scoped>
.kpi-home-card {
  border-radius: 12px;
  transition: transform 0.15s;
}
.kpi-home-card:hover {
  transform: translateY(-2px);
}
</style>
