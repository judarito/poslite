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
          <v-icon color="secondary">mdi-cogs</v-icon>
          Automatizacion Contable
        </span>
        <div class="d-flex align-center gap-2">
          <v-btn color="success" variant="tonal" prepend-icon="mdi-play-circle-outline" :loading="processingQueue" @click="processQueueNow">
            Procesar cola
          </v-btn>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" :loading="loadingRules || loadingExceptions" @click="loadAll">
            Refrescar
          </v-btn>
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row class="ga-2" align="center">
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.source_module"
              :items="moduleOptions"
              item-title="title"
              item-value="value"
              label="Modulo"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.event_type"
              :items="eventOptions"
              item-title="title"
              item-value="value"
              label="Evento"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.exception_status"
              :items="exceptionStatusOptions"
              item-title="title"
              item-value="value"
              label="Estado excepcion"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span>Reglas de contabilizacion automatica</span>
        <v-btn color="secondary" variant="tonal" prepend-icon="mdi-plus" @click="showAddDialog = true">
          Nueva regla
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-0">
        <v-table density="comfortable" fixed-header height="360">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Modulo</th>
              <th>Evento</th>
              <th>Debito</th>
              <th>Credito</th>
              <th>Prioridad</th>
              <th>Auto post</th>
              <th>Activo</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in filteredRules" :key="rule.rule_id">
              <td style="min-width: 180px"><v-text-field v-model="rule.rule_name" density="compact" variant="outlined" hide-details /></td>
              <td style="min-width: 130px">
                <v-select
                  v-model="rule.source_module"
                  :items="moduleOptions.filter((m) => m.value !== 'ALL')"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </td>
              <td style="min-width: 180px">
                <v-select
                  v-model="rule.event_type"
                  :items="eventOptions.filter((e) => e.value !== 'ALL')"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </td>
              <td style="min-width: 120px"><v-text-field v-model="rule.debit_account_code" density="compact" variant="outlined" hide-details /></td>
              <td style="min-width: 120px"><v-text-field v-model="rule.credit_account_code" density="compact" variant="outlined" hide-details /></td>
              <td style="min-width: 90px"><v-text-field v-model.number="rule.priority" type="number" density="compact" variant="outlined" hide-details /></td>
              <td><v-switch v-model="rule.auto_post" density="compact" hide-details /></td>
              <td><v-switch v-model="rule.is_active" density="compact" hide-details /></td>
              <td>
                <v-btn color="primary" size="small" :loading="savingRuleId === rule.rule_id" @click="saveRule(rule)">
                  Guardar
                </v-btn>
              </td>
            </tr>
            <tr v-if="filteredRules.length === 0">
              <td colspan="9" class="text-center text-medium-emphasis py-6">No hay reglas para el filtro seleccionado.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>Excepciones de automatizacion</v-card-title>
      <v-divider />
      <v-card-text class="pa-0">
        <v-table density="comfortable" fixed-header height="360">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Modulo</th>
              <th>Evento</th>
              <th>Referencia</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in exceptions" :key="item.exception_id">
              <td>{{ formatDate(item.created_at) }}</td>
              <td>{{ item.source_module }}</td>
              <td>{{ item.event_type }}</td>
              <td><code>{{ item.source_id || '-' }}</code></td>
              <td class="text-caption">{{ item.reason }}</td>
              <td>
                <v-chip size="x-small" :color="item.status === 'OPEN' ? 'error' : (item.status === 'RESOLVED' ? 'success' : 'grey')">
                  {{ item.status }}
                </v-chip>
              </td>
              <td>
                <v-btn
                  v-if="item.status === 'OPEN'"
                  color="success"
                  size="x-small"
                  variant="tonal"
                  :loading="resolvingExceptionId === item.exception_id"
                  @click="resolveException(item)"
                >
                  Resolver
                </v-btn>
                <span v-else>-</span>
              </td>
            </tr>
            <tr v-if="exceptions.length === 0">
              <td colspan="7" class="text-center text-medium-emphasis py-6">No hay excepciones para el filtro seleccionado.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="showAddDialog" max-width="760">
      <v-card>
        <v-card-title>Nueva regla de automatizacion</v-card-title>
        <v-divider />
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="newRule.rule_name" label="Nombre" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="newRule.source_module"
                :items="moduleOptions.filter((m) => m.value !== 'ALL')"
                item-title="title"
                item-value="value"
                label="Modulo"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="newRule.event_type"
                :items="eventOptions.filter((e) => e.value !== 'ALL')"
                item-title="title"
                item-value="value"
                label="Evento"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newRule.debit_account_code" label="Cuenta debito" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newRule.credit_account_code" label="Cuenta credito" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="newRule.priority" type="number" label="Prioridad" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newRule.description_template" label="Plantilla descripcion" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6"><v-switch v-model="newRule.auto_post" label="Auto post" color="primary" /></v-col>
            <v-col cols="12" md="6"><v-switch v-model="newRule.is_active" label="Activa" color="primary" /></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="creatingRule" @click="createRule">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { useNotification } from '@/composables/useNotification'
import accountingService from '@/services/accounting.service'
import { formatDateTime as formatDate } from '@/utils/formatters'

const router = useRouter()
const route = useRoute()
const { tenantId } = useTenant()
const { show } = useNotification()

const loadingRules = ref(false)
const loadingExceptions = ref(false)
const processingQueue = ref(false)
const savingRuleId = ref(null)
const resolvingExceptionId = ref(null)
const creatingRule = ref(false)
const showAddDialog = ref(false)

const rules = ref([])
const exceptions = ref([])

const filters = ref({
  source_module: 'ALL',
  event_type: 'ALL',
  exception_status: 'OPEN'
})

const moduleOptions = [
  { title: 'Todos', value: 'ALL' },
  { title: 'POS', value: 'POS' },
  { title: 'Compras', value: 'PURCHASES' }
]

const eventOptions = [
  { title: 'Todos', value: 'ALL' },
  { title: 'SALE_CREATED', value: 'SALE_CREATED' },
  { title: 'PURCHASE_CREATED', value: 'PURCHASE_CREATED' }
]

const exceptionStatusOptions = [
  { title: 'Abiertas', value: 'OPEN' },
  { title: 'Resueltas', value: 'RESOLVED' },
  { title: 'Ignoradas', value: 'IGNORED' },
  { title: 'Todas', value: 'ALL' }
]

const newRule = ref({
  source_module: 'POS',
  event_type: 'SALE_CREATED',
  rule_name: '',
  debit_account_code: '110505',
  credit_account_code: '413595',
  description_template: 'Asiento automatico {{source_id}}',
  auto_post: true,
  is_active: true,
  priority: 100
})

const breadcrumbs = computed(() => [
  { title: 'Contabilidad', to: '/accounting', disabled: false },
  { title: 'Automatizacion', disabled: true }
])

const filteredRules = computed(() => {
  return rules.value.filter((rule) => {
    const sourceOk = filters.value.source_module === 'ALL' || rule.source_module === filters.value.source_module
    const eventOk = filters.value.event_type === 'ALL' || rule.event_type === filters.value.event_type
    return sourceOk && eventOk
  })
})

const loadRules = async () => {
  if (!tenantId.value) return
  loadingRules.value = true
  try {
    const result = await accountingService.getPostingRules(tenantId.value, {
      source_module: filters.value.source_module,
      event_type: filters.value.event_type
    })

    if (!result.success) {
      show(result.error || 'No se pudieron cargar reglas.', 'error')
      return
    }

    rules.value = result.data || []
  } finally {
    loadingRules.value = false
  }
}

const loadExceptions = async () => {
  if (!tenantId.value) return
  loadingExceptions.value = true
  try {
    const result = await accountingService.getAutomationExceptions(tenantId.value, {
      status: filters.value.exception_status,
      limit: 120
    })

    if (!result.success) {
      show(result.error || 'No se pudieron cargar excepciones.', 'error')
      return
    }

    exceptions.value = result.data || []
  } finally {
    loadingExceptions.value = false
  }
}

const loadAll = async () => {
  await Promise.all([loadRules(), loadExceptions()])
}

const saveRule = async (rule) => {
  if (!tenantId.value) return
  savingRuleId.value = rule.rule_id
  try {
    const result = await accountingService.savePostingRule(tenantId.value, rule)
    if (!result.success) {
      show(result.error || 'No se pudo guardar la regla.', 'error')
      return
    }

    show('Regla guardada.', 'success')
    await loadRules()
  } finally {
    savingRuleId.value = null
  }
}

const createRule = async () => {
  if (!tenantId.value) return
  creatingRule.value = true
  try {
    const result = await accountingService.savePostingRule(tenantId.value, newRule.value)
    if (!result.success) {
      show(result.error || 'No se pudo crear la regla.', 'error')
      return
    }

    show('Regla creada.', 'success')
    showAddDialog.value = false
    newRule.value = {
      source_module: 'POS',
      event_type: 'SALE_CREATED',
      rule_name: '',
      debit_account_code: '110505',
      credit_account_code: '413595',
      description_template: 'Asiento automatico {{source_id}}',
      auto_post: true,
      is_active: true,
      priority: 100
    }
    await loadRules()
  } finally {
    creatingRule.value = false
  }
}

const resolveException = async (item) => {
  if (!tenantId.value) return
  resolvingExceptionId.value = item.exception_id
  try {
    const result = await accountingService.resolveAutomationException(tenantId.value, item)
    if (!result.success) {
      show(result.error || 'No se pudo resolver la excepcion.', 'error')
      return
    }

    show('Excepcion marcada como resuelta.', 'success')
    await loadExceptions()
  } finally {
    resolvingExceptionId.value = null
  }
}

const processQueueNow = async () => {
  if (!tenantId.value) return
  processingQueue.value = true
  try {
    const result = await accountingService.processQueue(tenantId.value, { limit: 100 })
    if (!result.success) {
      show(result.error || 'No se pudo procesar la cola.', 'error')
      return
    }

    const payload = result.data || {}
    show(`Procesados: ${payload.processed || 0}, fallidos: ${payload.failed || 0}`, 'success')
    await loadAll()
  } finally {
    processingQueue.value = false
  }
}

const goBackToAccounting = () => {
  const tab = String(route.query.tab || 'compliance')
  router.push({ path: '/accounting', query: { tab } })
}

onMounted(loadAll)
</script>
