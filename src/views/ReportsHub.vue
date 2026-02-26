<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-5">
      <div>
        <div class="text-h5 font-weight-bold">Centro de Reportes</div>
        <div class="text-body-2 text-medium-emphasis">{{ todayLabel }}</div>
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="tonal"
        color="indigo"
        :loading="loading"
        @click="loadDashboard"
      ></v-btn>
    </div>

    <!-- KPI Cards -->
    <v-row class="mb-5">
      <!-- Ventas Hoy -->
      <v-col cols="12" sm="6" md="4">
        <v-card class="kpi-card" variant="tonal" color="blue">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Ventas Hoy</div>
              <v-avatar color="blue" size="36">
                <v-icon color="white" size="18">mdi-calendar-today</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-blue mb-1">
              <span v-if="loading"><v-skeleton-loader type="text" width="120"/></span>
              <span v-else>{{ formatMoney(kpis?.today?.total || 0) }}</span>
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ kpis?.today?.count || 0 }} transacciones
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Ventas Este Mes -->
      <v-col cols="12" sm="6" md="4">
        <v-card class="kpi-card" variant="tonal" color="green">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Este Mes</div>
              <v-avatar color="green" size="36">
                <v-icon color="white" size="18">mdi-calendar-month</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-green mb-1">
              <span v-if="loading"><v-skeleton-loader type="text" width="120"/></span>
              <span v-else>{{ formatMoney(kpis?.month?.total || 0) }}</span>
            </div>
            <div class="d-flex align-center gap-1 text-caption">
              <span class="text-medium-emphasis">{{ kpis?.month?.count || 0 }} transacciones</span>
              <template v-if="kpis?.month?.vs_prev !== null && kpis?.month?.vs_prev !== undefined">
                <v-chip
                  :color="parseFloat(kpis.month.vs_prev) >= 0 ? 'green' : 'red'"
                  size="x-small"
                  variant="tonal"
                  class="ml-1"
                >
                  <v-icon start size="10">{{ parseFloat(kpis.month.vs_prev) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                  {{ Math.abs(kpis.month.vs_prev) }}% vs mes ant.
                </v-chip>
              </template>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Ventas Este Año -->
      <v-col cols="12" sm="6" md="4">
        <v-card class="kpi-card" variant="tonal" color="purple">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Este Año</div>
              <v-avatar color="purple" size="36">
                <v-icon color="white" size="18">mdi-calendar-blank</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-purple mb-1">
              <span v-if="loading"><v-skeleton-loader type="text" width="120"/></span>
              <span v-else>{{ formatMoney(kpis?.year?.total || 0) }}</span>
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ kpis?.year?.count || 0 }} transacciones totales
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráficas principales -->
    <v-row class="mb-5">
      <!-- Tendencia 30 días -->
      <v-col cols="12" md="8">
        <v-card height="100%">
          <v-card-title class="d-flex align-center pa-4 pb-0">
            <v-icon start color="blue" size="20">mdi-chart-line</v-icon>
            Tendencia de Ventas — últimos 30 días
          </v-card-title>
          <v-card-text class="pa-2">
            <div v-if="loading" class="d-flex align-center justify-center" style="height:240px">
              <v-progress-circular indeterminate color="blue"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="dailySeries.length"
              type="area"
              height="240"
              :options="trendChartOptions"
              :series="trendSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis" style="height:240px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Métodos de pago (donut) -->
      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-title class="d-flex align-center pa-4 pb-0">
            <v-icon start color="teal" size="20">mdi-credit-card-multiple</v-icon>
            Métodos de Pago
            <span class="text-caption text-medium-emphasis ml-1">(mes)</span>
          </v-card-title>
          <v-card-text class="pa-2">
            <div v-if="loading" class="d-flex align-center justify-center" style="height:240px">
              <v-progress-circular indeterminate color="teal"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="paymentMethods.length"
              type="donut"
              height="240"
              :options="donutChartOptions"
              :series="donutSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis" style="height:240px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Top productos del mes -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center pa-4 pb-0">
            <v-icon start color="orange" size="20">mdi-trophy</v-icon>
            Top Productos del Mes
            <v-spacer></v-spacer>
            <v-btn to="/reports/ventas" variant="text" color="blue" size="small" append-icon="mdi-arrow-right">
              Ver detalle
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-2">
            <div v-if="loading" class="d-flex align-center justify-center" style="height:180px">
              <v-progress-circular indeterminate color="orange"></v-progress-circular>
            </div>
            <apexchart
              v-else-if="topProducts.length"
              type="bar"
              height="200"
              :options="barChartOptions"
              :series="barSeries"
            ></apexchart>
            <div v-else class="d-flex align-center justify-center text-medium-emphasis" style="height:180px">
              Sin datos
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Accesos rápidos a reportes -->
    <div class="text-subtitle-1 font-weight-bold mb-3">Ir a...</div>
    <v-row>
      <v-col v-for="report in reportCards" :key="report.route" cols="12" sm="6" md="4" lg="2-4">
        <v-card
          :to="report.route"
          hover
          class="report-nav-card"
          variant="outlined"
        >
          <v-card-text class="pa-4 d-flex align-center gap-3">
            <v-avatar :color="report.color" size="40" variant="tonal">
              <v-icon :color="report.color">{{ report.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-bold">{{ report.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ report.subtitle }}</div>
            </div>
            <v-spacer></v-spacer>
            <v-icon size="16" color="grey">mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useTenant } from '@/composables/useTenant'
import { useTheme } from '@/composables/useTheme'
import reportsService from '@/services/reports.service'

const apexchart = VueApexCharts

const { tenantId } = useTenant()
const { isDark } = useTheme()

const loading  = ref(true)
const kpis     = ref(null)
const dailySeries   = ref([])
const topProducts   = ref([])
const paymentMethods = ref([])

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const formatMoney = (val) => {
  const n = parseFloat(val) || 0
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

// ─── Trend chart (area) ────────────────────────────────────────────────────
const trendSeries = computed(() => [{
  name: 'Ventas',
  data: dailySeries.value.map(d => ({ x: d.date, y: Math.round(d.total) }))
}])

const trendChartOptions = computed(() => ({
  chart: { id: 'trend', toolbar: { show: false }, sparkline: { enabled: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  colors: ['#1565C0'],
  xaxis: {
    type: 'category',
    tickAmount: 10,
    labels: {
      rotate: -30,
      formatter: v => {
        if (!v) return ''
        const d = new Date(v + 'T00:00:00')
        return `${d.getDate()}/${d.getMonth() + 1}`
      }
    }
  },
  yaxis: {
    labels: {
      formatter: v => {
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
        if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
        return `$${v}`
      }
    }
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: { formatter: v => formatMoney(v) }
  },
  grid: { borderColor: isDark.value ? '#444' : '#f0f0f0' }
}))

// ─── Donut chart (payment methods) ────────────────────────────────────────
const methodLabels = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', OTHER: 'Otro' }
const donutSeries  = computed(() => paymentMethods.value.map(p => Math.round(p.total)))
const donutChartOptions = computed(() => ({
  chart: { id: 'payments', toolbar: { show: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  labels: paymentMethods.value.map(p => methodLabels[p.method] || p.method),
  colors: ['#00897B', '#1565C0', '#F57C00', '#7B1FA2', '#C62828', '#546E7A'],
  dataLabels: { enabled: true, formatter: (v) => `${v.toFixed(1)}%` },
  legend: { position: 'bottom', fontSize: '11px' },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: { formatter: v => formatMoney(v) }
  },
  plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => formatMoney(donutSeries.value.reduce((a, b) => a + b, 0)) } } } } }
}))

// ─── Bar chart (top products) ──────────────────────────────────────────────
const barSeries = computed(() => [{
  name: 'Ingresos',
  data: topProducts.value.map(p => Math.round(p.revenue))
}])
const barChartOptions = computed(() => ({
  chart: { id: 'top-products', toolbar: { show: false } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 4 } },
  colors: ['#E65100'],
  dataLabels: { enabled: true, formatter: v => formatMoney(v), style: { fontSize: '11px' } },
  xaxis: {
    categories: topProducts.value.map(p => p.name.length > 28 ? p.name.substring(0, 26) + '…' : p.name),
    labels: { formatter: v => { if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`; if (v >= 1_000) return `$${(v/1_000).toFixed(0)}K`; return `$${v}` } }
  },
  tooltip: { theme: isDark.value ? 'dark' : 'light', y: { formatter: v => formatMoney(v) } },
  grid: { borderColor: isDark.value ? '#444' : '#f0f0f0' }
}))

// ─── Load ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  if (!tenantId.value) return
  loading.value = true
  const res = await reportsService.getDashboardSummary(tenantId.value)
  if (res.success) {
    kpis.value          = res.kpis
    dailySeries.value   = res.dailySeries
    topProducts.value   = res.topProducts
    paymentMethods.value = res.paymentMethods
  }
  loading.value = false
}

onMounted(loadDashboard)

const reportCards = [
  { route: '/reports/ventas',      title: 'Ventas',      subtitle: 'Diarias · Productos · Categorías', icon: 'mdi-cash-register',         color: 'blue'   },
  { route: '/reports/inventario',  title: 'Inventario',  subtitle: 'Stock · Alertas · Vencimientos',  icon: 'mdi-package-variant-closed', color: 'green'  },
  { route: '/reports/produccion',  title: 'Producción',  subtitle: 'Órdenes · Costos · Componentes',  icon: 'mdi-factory',                color: 'purple' },
  { route: '/reports/cajas',       title: 'Cajas',       subtitle: 'Sesiones · Cajeros · Diferencias',icon: 'mdi-cash-multiple',          color: 'orange' },
  { route: '/reports/financiero',  title: 'Financiero',  subtitle: 'P&L · Márgenes · Flujo de caja',  icon: 'mdi-finance',                color: 'teal'   },
]
</script>

<style scoped>
.kpi-card {
  border-radius: 12px;
  transition: transform 0.15s;
}
.kpi-card:hover {
  transform: translateY(-2px);
}
.report-nav-card {
  transition: transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.report-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.gap-3 {
  gap: 12px;
}
.gap-1 {
  gap: 4px;
}
</style>
