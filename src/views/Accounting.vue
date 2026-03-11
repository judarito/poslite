<template>
  <div>
    <v-card class="mb-4" variant="tonal" color="primary">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <div class="text-h5 font-weight-bold d-flex align-center gap-2">
            <v-icon size="30">mdi-scale-balance</v-icon>
            Contabilidad Colombia
          </div>
          <div class="text-body-2 mt-1">
            Módulo contable desacoplado del POS, con integración asíncrona e IA.
          </div>
        </div>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">
          Actualizar
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span class="d-flex align-center gap-2">
          <v-icon color="primary">mdi-office-building-cog</v-icon>
          Configuración (solo lectura)
        </span>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-cog" @click="goToCompanyConfig">
          Ir a Empresa
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          La configuración de integración contable se administra desde
          <strong>Configuración de Empresa</strong>.
        </p>

        <v-row>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">Contabilidad</div>
            <v-chip :color="settings.accounting_enabled ? 'success' : 'grey'" size="small">
              {{ settings.accounting_enabled ? 'Habilitada' : 'Deshabilitada' }}
            </v-chip>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">Modo</div>
            <v-chip color="primary" size="small">{{ modeLabel }}</v-chip>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">Auto ventas</div>
            <v-chip :color="settings.accounting_auto_post_sales ? 'success' : 'grey'" size="small">
              {{ settings.accounting_auto_post_sales ? 'Activa' : 'Inactiva' }}
            </v-chip>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">Auto compras</div>
            <v-chip :color="settings.accounting_auto_post_purchases ? 'success' : 'grey'" size="small">
              {{ settings.accounting_auto_post_purchases ? 'Activa' : 'Inactiva' }}
            </v-chip>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">IA contable</div>
            <v-chip :color="settings.accounting_ai_enabled ? 'success' : 'grey'" size="small">
              {{ settings.accounting_ai_enabled ? 'Activa' : 'Inactiva' }}
            </v-chip>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-caption text-medium-emphasis">Norma</div>
            <v-chip color="secondary" size="small">{{ settings.accounting_country_code || 'CO' }}</v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="!settings.accounting_enabled"
      type="info"
      variant="tonal"
      class="mb-4"
      icon="mdi-information-outline"
    >
      La contabilidad está desactivada. El POS seguirá operando sin dependencia contable.
    </v-alert>

    <template v-else>
      <v-tabs v-model="activeTab" color="primary" class="mb-4">
        <v-tab value="dashboard">
          <v-icon start>mdi-view-dashboard-outline</v-icon>
          Dashboard
        </v-tab>
        <v-tab value="queue">
          <v-badge
            :content="pendingQueueCount > 99 ? '99+' : pendingQueueCount"
            :model-value="pendingQueueCount > 0"
            color="warning"
            inline
          >
            <span class="d-flex align-center">
              <v-icon size="18" class="mr-1">mdi-queue-first-in-last-out</v-icon>
              Cola POS
            </span>
          </v-badge>
        </v-tab>
        <v-tab value="ai" :disabled="!settings.accounting_ai_enabled">
          <v-icon start>mdi-robot-outline</v-icon>
          Asistente IA
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="dashboard">
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis">Eventos pendientes</div>
                  <div class="text-h4 font-weight-bold">{{ summary.pending_events ?? 0 }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis">Asientos borrador</div>
                  <div class="text-h4 font-weight-bold">{{ summary.draft_entries ?? 0 }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis">Posteados este mes</div>
                  <div class="text-h4 font-weight-bold">{{ summary.posted_entries_month ?? 0 }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis">Balance mensual</div>
                  <v-chip :color="summary.is_balanced_month ? 'success' : 'error'" size="small">
                    {{ summary.is_balanced_month ? 'Cuadrado' : 'Descuadrado' }}
                  </v-chip>
                  <div class="text-caption mt-2">
                    D: {{ formatMoney(summary.month_debits || 0) }}<br>
                    C: {{ formatMoney(summary.month_credits || 0) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
              <span>Balanza de Comprobación</span>
              <div class="d-flex align-center gap-2">
                <v-text-field
                  v-model="filters.date_from"
                  label="Desde"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="max-width: 170px"
                />
                <v-text-field
                  v-model="filters.date_to"
                  label="Hasta"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="max-width: 170px"
                />
                <v-btn color="primary" variant="tonal" @click="loadTrialBalance">Aplicar</v-btn>
              </div>
            </v-card-title>
            <v-divider />

            <v-card-text class="pa-0">
              <v-table density="comfortable" fixed-header height="380">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cuenta</th>
                    <th>Tipo</th>
                    <th>Naturaleza</th>
                    <th class="text-right">Débitos</th>
                    <th class="text-right">Créditos</th>
                    <th class="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in trialBalance" :key="row.account_code">
                    <td><code>{{ row.account_code }}</code></td>
                    <td>{{ row.account_name }}</td>
                    <td>{{ row.account_type }}</td>
                    <td>{{ row.natural_side }}</td>
                    <td class="text-right">{{ formatMoney(row.debit_total) }}</td>
                    <td class="text-right">{{ formatMoney(row.credit_total) }}</td>
                    <td class="text-right" :class="Number(row.balance || 0) < 0 ? 'text-error' : ''">
                      {{ formatMoney(row.balance) }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title>Últimos Asientos</v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <v-table density="comfortable" fixed-header height="320">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Módulo</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in recentEntries" :key="entry.entry_id">
                    <td>{{ entry.entry_number }}</td>
                    <td>{{ formatDate(entry.entry_date) }}</td>
                    <td>{{ entry.source_module }}</td>
                    <td>{{ entry.description || '-' }}</td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="entry.status === 'POSTED' ? 'success' : (entry.status === 'VOIDED' ? 'error' : 'warning')"
                      >
                        {{ entry.status }}
                      </v-chip>
                    </td>
                    <td>{{ formatDate(entry.created_at) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="queue">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Cola de Integración POS → Contabilidad</span>
              <div class="d-flex align-center gap-2">
                <v-btn
                  color="success"
                  variant="tonal"
                  prepend-icon="mdi-play-circle-outline"
                  :loading="processingQueue"
                  @click="processPendingQueue"
                >
                  Procesar pendientes
                </v-btn>
                <v-btn color="primary" variant="tonal" @click="loadQueue">Refrescar cola</v-btn>
              </div>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <v-table density="comfortable" fixed-header height="580">
                <thead>
                  <tr>
                    <th>Creado</th>
                    <th>Módulo</th>
                    <th>Evento</th>
                    <th>Referencia</th>
                    <th>Intentos</th>
                    <th>Estado</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="event in eventQueue" :key="event.event_id">
                    <td>{{ formatDate(event.created_at) }}</td>
                    <td>{{ event.source_module }}</td>
                    <td>{{ event.event_type }}</td>
                    <td><code>{{ event.source_id }}</code></td>
                    <td>{{ event.attempts }}</td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="getQueueStatusColor(event.status)"
                      >
                        {{ event.status }}
                      </v-chip>
                    </td>
                    <td class="text-caption text-error">{{ event.last_error || '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="ai">
          <v-card class="mb-4">
            <v-card-title>Asistente IA Contable (CO)</v-card-title>
            <v-divider />
            <v-card-text>
              <v-textarea
                v-model="aiPrompt"
                label="Describe la operación (ej: venta crédito con IVA 19%, abono parcial, devolución, etc.)"
                variant="outlined"
                auto-grow
                rows="6"
              />
              <div class="d-flex justify-end mt-2">
                <v-btn color="secondary" prepend-icon="mdi-robot-outline" :loading="aiLoading" @click="generateAISuggestion">
                  Generar borrador de asiento
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="aiResult">
            <v-card-title class="d-flex align-center gap-2">
              <v-icon color="secondary">mdi-lightbulb-on-outline</v-icon>
              Sugerencia IA
            </v-card-title>
            <v-divider />
            <v-card-text>
              <div class="mb-3"><strong>Resumen:</strong> {{ aiResult.summary || 'Sin resumen' }}</div>
              <div class="mb-3"><strong>Confianza:</strong> {{ aiResult.confidence ?? 'N/A' }}</div>

              <v-alert
                v-if="Array.isArray(aiResult.warnings) && aiResult.warnings.length"
                type="warning"
                variant="tonal"
                class="mb-4"
              >
                <div><strong>Alertas:</strong></div>
                <div v-for="(w, idx) in aiResult.warnings" :key="idx">- {{ w }}</div>
              </v-alert>

              <v-table density="comfortable" v-if="aiResult.entry?.lines?.length">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Nombre</th>
                    <th class="text-right">Débito</th>
                    <th class="text-right">Crédito</th>
                    <th>Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(line, idx) in aiResult.entry.lines" :key="idx">
                    <td><code>{{ line.account_code }}</code></td>
                    <td>{{ line.account_name }}</td>
                    <td class="text-right">{{ formatMoney(line.debit_amount || 0) }}</td>
                    <td class="text-right">{{ formatMoney(line.credit_amount || 0) }}</td>
                    <td class="text-caption">{{ line.reason || '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { useNotification } from '@/composables/useNotification'
import accountingService from '@/services/accounting.service'

const router = useRouter()
const { tenantId } = useTenant()
const { show } = useNotification()

const loading = ref(false)
const aiLoading = ref(false)
const processingQueue = ref(false)

const activeTab = ref('dashboard')

const settings = ref({
  accounting_enabled: false,
  accounting_mode: 'ASYNC',
  accounting_ai_enabled: true,
  accounting_auto_post_sales: false,
  accounting_auto_post_purchases: false,
  accounting_country_code: 'CO'
})

const summary = ref({})
const trialBalance = ref([])
const recentEntries = ref([])
const eventQueue = ref([])

const filters = ref({
  date_from: null,
  date_to: null
})

const aiPrompt = ref('')
const aiResult = ref(null)

const isEnabled = computed(() => settings.value.accounting_enabled)
const pendingQueueCount = computed(() => Number(summary.value?.pending_events || 0))
const modeLabel = computed(() => {
  const mode = settings.value.accounting_mode
  if (mode === 'OFF') return 'OFF'
  if (mode === 'MANUAL') return 'MANUAL'
  return 'ASYNC'
})

const formatMoney = (value) => {
  const n = Number(value || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2
  }).format(n)
}

const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-CO')
}

const getQueueStatusColor = (status) => {
  if (status === 'PROCESSED') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'PROCESSING') return 'primary'
  if (status === 'SKIPPED') return 'grey'
  return 'warning'
}

const loadSettings = async () => {
  if (!tenantId.value) return
  const result = await accountingService.getSettings(tenantId.value)
  if (result.success) {
    settings.value = {
      ...settings.value,
      ...result.data
    }
  }
}

const loadSummary = async () => {
  if (!tenantId.value || !isEnabled.value) return
  const result = await accountingService.getSummary(tenantId.value)
  if (result.success) {
    summary.value = result.data || {}
  }
}

const loadTrialBalance = async () => {
  if (!tenantId.value || !isEnabled.value) return
  const result = await accountingService.getTrialBalance(tenantId.value, filters.value)
  if (result.success) {
    trialBalance.value = result.data || []
  }
}

const loadRecentEntries = async () => {
  if (!tenantId.value || !isEnabled.value) return
  const result = await accountingService.getRecentEntries(tenantId.value, 30)
  if (result.success) {
    recentEntries.value = result.data || []
  }
}

const loadQueue = async () => {
  if (!tenantId.value || !isEnabled.value) return
  const result = await accountingService.getEventQueue(tenantId.value, 80)
  if (result.success) {
    eventQueue.value = result.data || []
  }
}

const loadAll = async () => {
  if (!tenantId.value) return

  loading.value = true
  try {
    await loadSettings()

    if (!isEnabled.value) {
      summary.value = {}
      trialBalance.value = []
      recentEntries.value = []
      eventQueue.value = []
      return
    }

    await Promise.all([
      loadSummary(),
      loadTrialBalance(),
      loadRecentEntries(),
      loadQueue()
    ])
  } finally {
    loading.value = false
  }
}

const goToCompanyConfig = () => {
  router.push('/tenant-config')
}

const processPendingQueue = async () => {
  if (!tenantId.value) return

  processingQueue.value = true
  try {
    const result = await accountingService.processQueue(tenantId.value, { limit: 100 })
    if (!result.success) {
      show(result.error || 'No se pudo procesar la cola contable.', 'error')
      return
    }

    const payload = result.data || {}
    show(
      `Cola procesada: ${payload.processed || 0} procesados, ${payload.failed || 0} fallidos, ${payload.skipped || 0} omitidos.`,
      'success'
    )

    await Promise.all([
      loadQueue(),
      loadSummary(),
      loadRecentEntries()
    ])
  } finally {
    processingQueue.value = false
  }
}

const generateAISuggestion = async () => {
  if (!tenantId.value) return
  aiResult.value = null

  aiLoading.value = true
  try {
    const result = await accountingService.requestAIAssistant({
      tenantId: tenantId.value,
      prompt: aiPrompt.value
    })

    if (!result.success) {
      show(result.error || 'No se pudo generar sugerencia IA.', 'error')
      return
    }

    aiResult.value = result.data
    show('Sugerencia IA generada.', 'success')
  } finally {
    aiLoading.value = false
  }
}

onMounted(loadAll)
</script>
