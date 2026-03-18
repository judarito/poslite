<template>
  <div>
    <v-alert
      v-if="bulkImportHintVisible"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <div class="text-subtitle-2 font-weight-bold mb-1">Cargue masivo para catalogo e inventario</div>
      <div class="text-body-2">
        Esta opcion te permite crear productos, variantes y stock inicial desde Excel para acelerar el arranque del tenant.
      </div>
    </v-alert>

    <v-card class="mb-4" elevation="2">
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h6">Carga masiva de productos</div>
          <div class="text-caption text-grey">Sube un archivo XLSX con productos simples (una variante) y deja que el sistema cree productos, variantes y stock inicial.</div>
        </div>
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            variant="tonal"
            :href="templateUrl"
            target="_blank"
            rel="noreferrer"
          >
            <v-icon left>mdi-file-download-outline</v-icon> Descargar plantilla
          </v-btn>
          <v-btn
            color="secondary"
            variant="outlined"
            @click="showNotes = true"
          >Notas</v-btn>
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-alert color="info" border="start" variant="tonal" dense>
          Se almacenan los archivos en el bucket <strong>dataimport</strong> (puedes revisar las políticas en la consola de Supabase para permitir solo tu tenant). El sistema lee automáticamente la hoja <strong>productos</strong>.
        </v-alert>
        <v-row dense class="mt-4">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedType"
              :items="typeOptions"
              item-title="label"
              item-value="value"
              label="Tipo de importación"
              density="comfortable"
              variant="outlined"
            ></v-select>
          </v-col>
          <v-col cols="12" md="8">
            <v-file-input
              v-model="selectedFile"
              accept=".xls,.xlsx"
              dense
              label="Elige el archivo XLSX"
              placeholder="Arrastra o selecciona"
              truncate-length="20"
              :disabled="processing"
            ></v-file-input>
          </v-col>
        </v-row>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <v-btn
            color="primary"
            :disabled="!selectedFile || processing"
            @click="handleUpload"
          >
            <v-icon left>mdi-cloud-upload-outline</v-icon>
            Subir y procesar
          </v-btn>
          <v-btn
            variant="outlined"
            color="secondary"
            :disabled="processing"
            @click="selectedFile = null"
          >{{ t('common.cancel') }}</v-btn>
          <span class="text-caption text-grey" v-if="processing">Procesando el archivo... esto puede tardar unos segundos.</span>
        </div>
      </v-card-text>
    </v-card>

    <v-card elevation="2">
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h6">Historial de importaciones</div>
          <div class="text-caption text-grey">Últimos {{ history.length }} archivos subidos</div>
        </div>
        <v-btn
          variant="text"
          icon
          @click="loadHistory"
          :loading="loadingHistory"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-data-table
        :items="history"
        :headers="historyHeaders"
        :loading="loadingHistory"
        hide-default-footer
        density="compact"
        class="text-body-2"
      >
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" :variant="item.status === 'failed' ? 'tonal' : 'outlined'" size="small">
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.error_count="{ item }">
          <span :class="item.error_count > 0 ? 'text-error font-weight-bold' : ''">
            {{ item.error_count }}
          </span>
        </template>
        <template #item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon dense @click="loadErrors(item.import_id)">
            <v-icon>mdi-alert-circle-outline</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="errorDialog" max-width="700">
      <v-card>
        <v-card-title>
          Errores de importación
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="errorDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-data-table
            :headers="errorHeaders"
            :items="errorRows"
            hide-default-footer
            density="compact"
          ></v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showNotes" max-width="600">
      <v-card>
        <v-card-title>Notas y guía de la plantilla</v-card-title>
        <v-card-text>
          <iframe
            style="width: 100%; height: 400px; border: none"
            :src="notesUrl"
          ></iframe>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showNotes = false">{{ t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import { useNotification } from '@/composables/useNotification'
import { uploadBulkImport, listBulkImports, getBulkImportErrors } from '@/services/bulkImportClient.service'
import { processBulkImport } from '@/services/bulkImport.service'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const route = useRoute()

const { tenantId } = useTenant()
const { userProfile } = useAuth()
const { show: showSnackbar } = useNotification()

const selectedType = ref('product_variants')
const selectedFile = ref(null)
const processing = ref(false)
const showNotes = ref(false)
const history = ref([])
const loadingHistory = ref(false)
const errorDialog = ref(false)
const errorRows = ref([])

const typeOptions = [
  { label: 'Productos/variantes', value: 'product_variants' },
  { label: 'Terceros (clientes/proveedores)', value: 'third_parties' }
]
const bulkImportHintVisible = computed(() => {
  const onboarding = String(route.query.onboarding || '').trim()
  return onboarding === 'inventory-import' || onboarding === 'inventory-stock'
})

const historyHeaders = [
  { title: 'Archivo', key: 'file_name', value: 'file_name' },
  { title: 'Tipo', key: 'import_type', value: 'import_type' },
  { title: 'Estado', key: 'status', value: 'status' },
  { title: 'Procesados', key: 'processed_count', value: 'processed_count' },
  { title: 'Errores', key: 'error_count', value: 'error_count' },
  { title: 'Creado', key: 'created_at', value: 'created_at' },
  { title: 'Acciones', key: 'actions', value: 'actions' }
]

const errorHeaders = [
  { title: 'Fila', key: 'row_number', value: 'row_number' },
  { title: 'Detalle', key: 'detail', value: 'detail' },
  { title: 'Datos', key: 'raw_data', value: 'raw_data' }
]

const templateUrl = computed(() =>
  selectedType.value === 'third_parties'
    ? '/templates/import-third-parties.xlsx'
    : '/templates/import-product-variants.xlsx'
)
const notesUrl = computed(() => '/templates/import-product-variants-notes.md')

const applyRouteContext = () => {
  const requestedType = String(route.query.type || '').trim()
  if (typeOptions.some((option) => option.value === requestedType)) {
    selectedType.value = requestedType
  }
}

const loadHistory = async () => {
  if (!tenantId.value) return
  loadingHistory.value = true
  try {
    history.value = await listBulkImports(tenantId.value, selectedType.value)
  } catch (error) {
    console.error('[loadHistory]', error)
    showSnackbar('No fue posible cargar el historial de importaciones', 'error')
  } finally {
    loadingHistory.value = false
  }
}

const handleUpload = async () => {
  if (!selectedFile.value || !tenantId.value) {
    showSnackbar('Selecciona un archivo válido', 'error')
    return
  }
  processing.value = true
  try {
    const importRecord = await uploadBulkImport({
      importType: selectedType.value,
      file: selectedFile.value,
      tenantId: tenantId.value,
      uploadedBy: userProfile.value?.user_id
    })
    showSnackbar('Archivo subido. Procesando...', 'info')
    selectedFile.value = null
    await loadHistory()
    await processBulkImport(importRecord)
    await loadHistory()
    const done = history.value.find(r => r.import_id === importRecord.import_id)
    if (done?.error_count > 0 && done?.processed_count === 0) {
      showSnackbar(`Importación fallida: ${done.error_count} errores. Revisa el log.`, 'error')
    } else if (done?.error_count > 0) {
      showSnackbar(`Importación con advertencias: ${done.processed_count} ok, ${done.error_count} errores. Revisa el log.`, 'warning')
    } else {
      showSnackbar(`Importación completada: ${done?.processed_count ?? 0} registros creados/actualizados.`, 'success')
    }
  } catch (error) {
    showSnackbar(error.message || 'Error en la importación', 'error')
    await loadHistory()
  } finally {
    processing.value = false
  }
}

const loadErrors = async (importId) => {
  errorDialog.value = true
  try {
    errorRows.value = await getBulkImportErrors(importId)
  } catch (error) {
    showSnackbar('No se pudieron cargar los errores', 'error')
  }
}

const formatDate = (value) => {
  if (!value) return '-' 
  return new Date(value).toLocaleString()
}

const statusColor = (status) => {
  switch (status) {
    case 'processing': return 'info'
    case 'completed': return 'success'
    case 'completed_with_errors': return 'warning'
    case 'failed': return 'error'
    default: return 'grey'
  }
}

onMounted(() => {
  applyRouteContext()
  loadHistory()
})

watch(
  () => route.query.type,
  () => {
    applyRouteContext()
    loadHistory()
  }
)

watch(selectedType, () => {
  loadHistory()
})
</script>
