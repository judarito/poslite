<template>
  <div class="home-root" :class="{ 'home-dark': isDark }">
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
        <v-btn size="small" variant="outlined" color="error" to="/cash-sessions">{{ t('home.viewCashRegisters') }}</v-btn>
      </template>
    </v-alert>

    <!-- Alerta: cuentas por pagar a proveedores vencidas / por vencer -->
    <v-alert
      v-if="canViewSupplierPayables && (supplierPayablesOverdueCount > 0 || supplierPayablesDueSoonCount > 0)"
      :type="supplierPayablesOverdueCount > 0 ? 'error' : 'warning'"
      variant="tonal"
      class="mb-4"
      prepend-icon="mdi-file-alert"
      :title="supplierPayablesAlertTitle"
    >
      <div class="text-body-2 mt-1">
        <span v-if="supplierPayablesOverdueCount > 0">
          {{ t('home.overdue') }}: <strong>{{ supplierPayablesOverdueCount }}</strong>
          ({{ formatMoney(supplierPayablesOverdueAmount) }})
        </span>
        <span v-if="supplierPayablesDueSoonCount > 0">
          <span v-if="supplierPayablesOverdueCount > 0"> • </span>
          {{ t('home.dueSoon7Days') }}: <strong>{{ supplierPayablesDueSoonCount }}</strong>
          ({{ formatMoney(supplierPayablesDueSoonAmount) }})
        </span>
      </div>
      <template #append>
        <v-btn size="small" variant="outlined" :color="supplierPayablesOverdueCount > 0 ? 'error' : 'warning'" to="/purchases">
          {{ t('app.viewPurchases') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- KPI Cards de ventas -->
    <v-row class="mb-1">
      <!-- Ventas Hoy -->
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="blue" class="kpi-home-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">{{ t('home.salesToday') }}</span>
              <v-avatar color="blue" size="32">
                <v-icon color="white" size="16">mdi-calendar-today</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-blue font-weight-bold">—</div>
            <div v-else class="text-h6 text-blue font-weight-bold">{{ formatMoney(kpis?.today?.total || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ kpis?.today?.count || 0 }} {{ t('home.transactions') }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Ventas Este Mes -->
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="green" class="kpi-home-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">{{ t('home.thisMonth') }}</span>
              <v-avatar color="green" size="32">
                <v-icon color="white" size="16">mdi-calendar-month</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-green font-weight-bold">—</div>
            <div v-else class="text-h6 text-green font-weight-bold">{{ formatMoney(kpis?.month?.total || 0) }}</div>
            <div class="d-flex align-center flex-wrap mt-1" style="gap:4px">
              <span class="text-caption text-medium-emphasis">{{ kpis?.month?.count || 0 }} {{ t('home.transShort') }}</span>
              <v-chip
                v-if="kpis?.month?.vs_prev !== null && kpis?.month?.vs_prev !== undefined"
                :color="parseFloat(kpis.month.vs_prev) >= 0 ? 'green' : 'red'"
                size="x-small" variant="tonal"
              >
                <v-icon start size="10">{{ parseFloat(kpis.month.vs_prev) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                {{ Math.abs(kpis.month.vs_prev) }}% {{ t('home.vsPreviousMonth') }}
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
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">{{ t('home.thisYear') }}</span>
              <v-avatar color="purple" size="32">
                <v-icon color="white" size="16">mdi-calendar-blank</v-icon>
              </v-avatar>
            </div>
            <div v-if="kpiLoading" class="text-h6 text-purple font-weight-bold">—</div>
            <div v-else class="text-h6 text-purple font-weight-bold">{{ formatMoney(kpis?.year?.total || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ kpis?.year?.count || 0 }} {{ t('home.totalTransactions') }}</div>
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
            {{ t('home.dailySalesLast30Days') }}
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:200px">
              <v-progress-circular indeterminate color="blue" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="dailySeries.length"
              :key="`trend-${chartThemeMode}`"
              type="area"
              height="200"
              :options="trendChartOptions"
              :series="trendSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:200px">
              {{ t('home.noData') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Métodos de pago -->
      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-title class="text-body-2 font-weight-bold pa-3 pb-0 d-flex align-center">
            <v-icon start color="teal" size="18">mdi-credit-card-multiple</v-icon>
            {{ t('home.paymentMethods') }}
            <span class="text-caption font-weight-regular text-medium-emphasis ml-1">({{ t('home.month') }})</span>
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:200px">
              <v-progress-circular indeterminate color="teal" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="paymentMethods.length"
              :key="`donut-${chartThemeMode}`"
              type="donut"
              height="200"
              :options="donutChartOptions"
              :series="donutSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:200px">
              {{ t('home.noData') }}
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
            {{ t('home.topProductsOfMonth') }}
            <v-spacer></v-spacer>
            <v-btn to="/reports/ventas" variant="text" color="blue" size="x-small" append-icon="mdi-arrow-right" class="text-caption">
              {{ t('home.viewDetail') }}
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-1 pt-0">
            <div v-if="kpiLoading" class="d-flex align-center justify-center" style="height:160px">
              <v-progress-circular indeterminate color="orange" size="28"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="topProducts.length"
              :key="`bar-${chartThemeMode}`"
              type="bar"
              height="180"
              :options="barChartOptions"
              :series="barSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis text-caption" style="height:160px">
              {{ t('home.noData') }}
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import { useCashSession } from '@/composables/useCashSession'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useTheme } from '@/composables/useTheme'
import { useTenantSettings } from '@/composables/useTenantSettings'
import { useI18n } from '@/i18n'
import SalesForecastWidget from '@/components/SalesForecastWidget.vue'
import reportsService from '@/services/reports.service'
import cashService from '@/services/cash.service'
import alertsService from '@/services/alerts.service'
import { formatMoney } from '@/utils/formatters'

const apexchart = VueApexCharts

const router = useRouter()
const { t } = useI18n()
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
let supplierPayablesAlertsChannel = null
const supplierPayablesOverdueCount = ref(0)
const supplierPayablesDueSoonCount = ref(0)
const supplierPayablesOverdueAmount = ref(0)
const supplierPayablesDueSoonAmount = ref(0)
const canViewSupplierPayables = computed(() => {
  const roles = (userProfile.value?.roles || []).map(r => r.name)
  return roles.includes('ADMINISTRADOR') || roles.includes('GERENTE')
})
const supplierPayablesAlertTitle = computed(() => {
  if (supplierPayablesOverdueCount.value > 0) {
    return `${supplierPayablesOverdueCount.value} CxP de proveedores vencidas`
  }
  return `${supplierPayablesDueSoonCount.value} CxP de proveedores por vencer`
})

const chartThemeMode = computed(() => isDark.value ? 'dark' : 'light')
const chartTextColor = computed(() => isDark.value ? '#E5E7EB' : '#334155')
const chartGridColor = computed(() => isDark.value ? '#3F3F46' : '#E2E8F0')

// Trend chart
const trendSeries = computed(() => [{
  name: 'Ventas',
  data: dailySeries.value.map(d => ({ x: d.date, y: Math.round(d.total) }))
}])
const trendChartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    sparkline: { enabled: false },
    animations: { enabled: false },
    background: 'transparent',
    foreColor: chartTextColor.value
  },
  theme: { mode: chartThemeMode.value },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03 } },
  colors: ['#1565C0'],
  xaxis: {
    type: 'category', tickAmount: 8,
    labels: { rotate: -30, style: { fontSize: '10px', colors: chartTextColor.value }, formatter: v => { if (!v) return ''; const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` } }
  },
  yaxis: { labels: { style: { fontSize: '10px', colors: chartTextColor.value }, formatter: v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}` } },
  tooltip: { theme: chartThemeMode.value, y: { formatter: v => formatMoney(v) } },
  grid: { borderColor: chartGridColor.value, padding: { left: 4, right: 4 } }
}))

// Donut chart
const methodLabels = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', OTHER: 'Otro' }
const donutSeries  = computed(() => paymentMethods.value.map(p => Math.round(p.total)))
const donutChartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    animations: { enabled: false },
    background: 'transparent',
    foreColor: chartTextColor.value
  },
  theme: { mode: chartThemeMode.value },
  labels: paymentMethods.value.map(p => methodLabels[p.method] || p.method),
  colors: ['#00897B', '#1565C0', '#F57C00', '#7B1FA2', '#C62828', '#546E7A'],
  dataLabels: { enabled: true, style: { fontSize: '10px' }, formatter: v => `${v.toFixed(1)}%` },
  legend: { position: 'bottom', fontSize: '10px', labels: { colors: chartTextColor.value } },
  tooltip: { theme: chartThemeMode.value, y: { formatter: v => formatMoney(v) } },
  plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', color: chartTextColor.value, fontSize: '11px', formatter: () => formatMoney(donutSeries.value.reduce((a, b) => a + b, 0)) } } } } }
}))

// Bar chart
const barSeries = computed(() => [{ name: 'Ingresos', data: topProducts.value.map(p => Math.round(p.revenue)) }])
const barChartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    animations: { enabled: false },
    background: 'transparent',
    foreColor: chartTextColor.value
  },
  theme: { mode: chartThemeMode.value },
  plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
  colors: ['#E65100'],
  dataLabels: { enabled: true, style: { fontSize: '10px' }, formatter: v => formatMoney(v) },
  xaxis: {
    categories: topProducts.value.map(p => p.name.length > 30 ? p.name.substring(0, 28) + '…' : p.name),
    labels: { style: { fontSize: '10px', colors: chartTextColor.value }, formatter: v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}` }
  },
  yaxis: { labels: { style: { colors: chartTextColor.value } } },
  tooltip: { theme: chartThemeMode.value, y: { formatter: v => formatMoney(v) } },
  grid: { borderColor: chartGridColor.value, padding: { left: 4, right: 8 } }
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

async function loadSupplierPayablesAlerts() {
  if (!tenantId.value || !canViewSupplierPayables.value) return

  const result = await alertsService.getAlertsByType(tenantId.value, 'PAYABLE')

  if (!result.success) return

  const rows = result.data || []
  const overdue = rows.filter(r => r.alert_level === 'OVERDUE')
  const dueSoon = rows.filter(r => r.alert_level === 'DUE_SOON')

  supplierPayablesOverdueCount.value = overdue.length
  supplierPayablesDueSoonCount.value = dueSoon.length
  supplierPayablesOverdueAmount.value = overdue.reduce((acc, r) => acc + Number(r?.data?.balance || 0), 0)
  supplierPayablesDueSoonAmount.value = dueSoon.reduce((acc, r) => acc + Number(r?.data?.balance || 0), 0)
}

onMounted(async () => {
  await loadPOSContext()
  await loadKPIs()
  await loadSupplierPayablesAlerts()
  if (tenantId.value) {
    const r = await cashService.getExpiredSessions(tenantId.value, cashSessionMaxHours.value)
    if (r.success) expiredSessions.value = r.data
  }

  if (tenantId.value && canViewSupplierPayables.value) {
    supplierPayablesAlertsChannel = alertsService.subscribeToAlerts(tenantId.value, (payload) => {
      const alertType = payload?.new?.alert_type || payload?.old?.alert_type
      if (alertType === 'PAYABLE') {
        loadSupplierPayablesAlerts()
      }
    })
  }
})

onBeforeUnmount(() => {
  if (supplierPayablesAlertsChannel) {
    alertsService.unsubscribe(supplierPayablesAlertsChannel)
    supplierPayablesAlertsChannel = null
  }
})

const cards = ref([
  {
    title: t('home.pos'),
    icon: 'mdi-point-of-sale',
    color: 'primary',
    description: t('home.posDescription'),
    route: '/pos',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: t('home.products'),
    icon: 'mdi-package-variant',
    color: 'success',
    description: t('home.productsDescription'),
    route: '/products',
    roles: ['ADMINISTRADOR', 'GERENTE', 'VENDEDOR'] // NO cajeros
  },
  {
    title: t('home.sales'),
    icon: 'mdi-cart',
    color: 'info',
    description: t('home.salesDescription'),
    route: '/sales',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: t('home.layaway'),
    icon: 'mdi-calendar-clock',
    color: 'blue',
    description: t('home.layawayDescription'),
    route: '/layaway',
    roles: ['ADMINISTRADOR', 'CAJERO', 'VENDEDOR', 'GERENTE'] // Todos
  },
  {
    title: t('home.inventory'),
    icon: 'mdi-warehouse',
    color: 'orange',
    description: t('home.inventoryDescription'),
    route: '/inventory',
    roles: ['ADMINISTRADOR', 'GERENTE'] // NO cajeros
  },
  {
    title: t('home.purchases'),
    icon: 'mdi-cart-plus',
    color: 'teal',
    description: t('home.purchasesDescription'),
    route: '/purchases',
    roles: ['ADMINISTRADOR', 'GERENTE'] // NO cajeros
  },
  {
    title: t('home.reports'),
    icon: 'mdi-chart-bar',
    color: 'purple',
    description: t('home.reportsDescription'),
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
.home-root.home-dark :deep(.apexcharts-canvas),
.home-root.home-dark :deep(.apexcharts-svg),
.home-root.home-dark :deep(.apexcharts-inner) {
  background: transparent !important;
}

.home-root.home-dark :deep(.apexcharts-text),
.home-root.home-dark :deep(.apexcharts-legend-text),
.home-root.home-dark :deep(.apexcharts-xaxis-label),
.home-root.home-dark :deep(.apexcharts-yaxis-label) {
  fill: #e5e7eb !important;
  color: #e5e7eb !important;
}

.home-root.home-dark :deep(.apexcharts-gridline) {
  stroke: #3f3f46 !important;
}
</style>

<style scoped>
.kpi-home-card {
  border-radius: 12px;
  transition: transform 0.15s;
}
.kpi-home-card:hover {
  transform: translateY(-2px);
}
</style>
