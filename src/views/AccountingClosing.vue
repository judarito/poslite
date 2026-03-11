<template>
  <div>
    <div class="mb-3">
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-arrow-left" @click="goBackToAccounting">
        Volver a Contabilidad
      </v-btn>
    </div>

    <v-breadcrumbs :items="breadcrumbs" class="pa-0 mb-4">
      <template #divider><v-icon>mdi-chevron-right</v-icon></template>
    </v-breadcrumbs>

    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span class="d-flex align-center gap-2">
          <v-icon color="error">mdi-lock-check-outline</v-icon>
          Cierre Contable por Periodo
        </span>
        <div class="d-flex align-center gap-2 flex-wrap">
          <v-btn-toggle
            v-model="viewMode"
            mandatory
            color="primary"
            density="comfortable"
            variant="outlined"
          >
            <v-btn value="LIST" size="small" prepend-icon="mdi-view-list">Lista</v-btn>
            <v-btn value="TABLE" size="small" prepend-icon="mdi-table">Tabla</v-btn>
          </v-btn-toggle>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" :loading="loadingClosures" @click="loadClosures">
            Refrescar
          </v-btn>
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row class="ga-2" align="center">
          <v-col cols="12" sm="3">
            <v-text-field v-model.number="period.year" type="number" label="Anio" variant="outlined" density="compact" hide-details />
          </v-col>
          <v-col cols="12" sm="3">
            <v-select
              v-model.number="period.month"
              :items="monthOptions"
              item-title="title"
              item-value="value"
              label="Mes"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field v-model="period.notes" label="Nota (opcional)" variant="outlined" density="compact" hide-details />
          </v-col>
        </v-row>

        <div class="d-flex align-center gap-2 mt-4">
          <v-btn
            color="error"
            prepend-icon="mdi-lock"
            :loading="closingPeriod"
            :disabled="!canCloseCurrentPeriod"
            @click="closeCurrentPeriod"
          >
            Cerrar periodo
          </v-btn>
          <v-btn
            color="warning"
            variant="tonal"
            prepend-icon="mdi-lock-open-variant"
            :loading="openingPeriod"
            :disabled="!canOpenCurrentPeriod"
            @click="openCurrentPeriod"
          >
            Abrir periodo
          </v-btn>
          <v-chip :color="currentPeriodStatus.color" size="small">
            Estado: {{ currentPeriodStatus.label }}
          </v-chip>
        </div>

        <v-alert
          v-if="openPeriodElsewhere"
          type="warning"
          variant="tonal"
          class="mt-4"
          density="comfortable"
        >
          Ya existe un periodo abierto ({{ openPeriodElsewhere.period_year }}-{{ String(openPeriodElsewhere.period_month).padStart(2, '0') }}).
          Solo puedes tener un periodo OPEN por tenant.
        </v-alert>

        <v-alert type="info" variant="tonal" class="mt-4" density="comfortable">
          Solo se puede contabilizar cuando el periodo existe y esta OPEN. Si no existe o esta CLOSED, el posteo se bloquea.
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>Historial de cierres</v-card-title>
      <v-divider />
      <v-card-text v-if="isTableView" class="pa-0">
        <v-table density="comfortable" fixed-header height="520">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Cerrado</th>
              <th>Reabierto</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in closures" :key="item.closure_id">
              <td>
                <strong>{{ item.period_year }}-{{ String(item.period_month).padStart(2, '0') }}</strong>
              </td>
              <td>
                <v-chip size="x-small" :color="item.status === 'CLOSED' ? 'error' : 'success'">
                  {{ item.status === 'CLOSED' ? 'CERRADO' : 'ABIERTO' }}
                </v-chip>
              </td>
              <td>{{ formatDate(item.closed_at) || '-' }}</td>
              <td>{{ formatDate(item.reopened_at) || '-' }}</td>
              <td class="text-caption">{{ item.notes || '-' }}</td>
            </tr>
            <tr v-if="closures.length === 0">
              <td colspan="5" class="text-center text-medium-emphasis py-6">No hay cierres registrados.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-text v-else>
        <v-alert
          v-if="closures.length === 0"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          No hay cierres registrados.
        </v-alert>
        <v-timeline v-else density="compact" side="end" align="start">
          <v-timeline-item
            v-for="item in closures"
            :key="item.closure_id"
            :dot-color="item.status === 'CLOSED' ? 'error' : 'success'"
            size="small"
          >
            <template #opposite>
              <strong>{{ item.period_year }}-{{ String(item.period_month).padStart(2, '0') }}</strong>
            </template>
            <div class="mb-1">
              <v-chip size="x-small" :color="item.status === 'CLOSED' ? 'error' : 'success'">
                {{ item.status === 'CLOSED' ? 'CERRADO' : 'ABIERTO' }}
              </v-chip>
            </div>
            <div class="text-caption"><strong>Cerrado:</strong> {{ formatDate(item.closed_at) || '-' }}</div>
            <div class="text-caption"><strong>Reabierto:</strong> {{ formatDate(item.reopened_at) || '-' }}</div>
            <div class="text-caption"><strong>Notas:</strong> {{ item.notes || '-' }}</div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { useNotification } from '@/composables/useNotification'
import { useAccountingViewMode } from '@/composables/useAccountingViewMode'
import accountingService from '@/services/accounting.service'
import { formatDateTime as formatDate } from '@/utils/formatters'

const router = useRouter()
const route = useRoute()
const { tenantId } = useTenant()
const { show } = useNotification()
const { viewMode, isTableView } = useAccountingViewMode()

const now = new Date()
const period = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  notes: ''
})

const loadingClosures = ref(false)
const closingPeriod = ref(false)
const openingPeriod = ref(false)
const closures = ref([])

const monthOptions = [
  { value: 1, title: '01 - Enero' },
  { value: 2, title: '02 - Febrero' },
  { value: 3, title: '03 - Marzo' },
  { value: 4, title: '04 - Abril' },
  { value: 5, title: '05 - Mayo' },
  { value: 6, title: '06 - Junio' },
  { value: 7, title: '07 - Julio' },
  { value: 8, title: '08 - Agosto' },
  { value: 9, title: '09 - Septiembre' },
  { value: 10, title: '10 - Octubre' },
  { value: 11, title: '11 - Noviembre' },
  { value: 12, title: '12 - Diciembre' }
]

const breadcrumbs = computed(() => [
  { title: 'Contabilidad', to: '/accounting', disabled: false },
  { title: 'Cierre Contable', disabled: true }
])

const currentPeriodStatus = computed(() => {
  const found = closures.value.find((item) =>
    Number(item.period_year) === Number(period.value.year) &&
    Number(item.period_month) === Number(period.value.month)
  )

  if (!found) {
    return { code: 'MISSING', label: 'NO CREADO', color: 'grey' }
  }
  if (found.status === 'CLOSED') {
    return { code: 'CLOSED', label: 'CERRADO', color: 'error' }
  }
  return { code: 'OPEN', label: 'ABIERTO', color: 'success' }
})

const openPeriodElsewhere = computed(() => {
  return closures.value.find((item) =>
    item.status === 'OPEN' &&
    (
      Number(item.period_year) !== Number(period.value.year) ||
      Number(item.period_month) !== Number(period.value.month)
    )
  ) || null
})

const canCloseCurrentPeriod = computed(() => currentPeriodStatus.value.code === 'OPEN')
const canOpenCurrentPeriod = computed(() => currentPeriodStatus.value.code !== 'OPEN' && !openPeriodElsewhere.value)

const loadClosures = async () => {
  if (!tenantId.value) return
  loadingClosures.value = true
  try {
    const result = await accountingService.getPeriodClosures(tenantId.value, {
      limit: 60
    })

    if (!result.success) {
      show(result.error || 'No se pudo cargar historial de cierres.', 'error')
      return
    }

    closures.value = result.data || []
  } finally {
    loadingClosures.value = false
  }
}

const closeCurrentPeriod = async () => {
  if (!tenantId.value) return
  closingPeriod.value = true
  try {
    const result = await accountingService.closePeriod(tenantId.value, {
      year: period.value.year,
      month: period.value.month,
      notes: period.value.notes || null
    })

    if (!result.success) {
      show(result.error || 'No se pudo cerrar el periodo.', 'error')
      return
    }

    show('Periodo cerrado correctamente.', 'success')
    await loadClosures()
  } finally {
    closingPeriod.value = false
  }
}

const openCurrentPeriod = async () => {
  if (!tenantId.value) return
  openingPeriod.value = true
  try {
    const result = await accountingService.reopenPeriod(tenantId.value, {
      year: period.value.year,
      month: period.value.month,
      notes: period.value.notes || null
    })

    if (!result.success) {
      show(result.error || 'No se pudo abrir el periodo.', 'error')
      return
    }

    show('Periodo abierto correctamente.', 'success')
    await loadClosures()
  } finally {
    openingPeriod.value = false
  }
}

const goBackToAccounting = () => {
  const tab = String(route.query.tab || 'compliance')
  router.push({ path: '/accounting', query: { tab } })
}

onMounted(loadClosures)
</script>
