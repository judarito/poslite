<template>
  <div class="fill-width">
    <ListView
      title="Unidades de Medida"
      icon="mdi-ruler"
      avatar-color="cyan"
      :items="units"
      :total-items="totalItems"
      :loading="loading"
      :default-page-size="defaultPageSize"
      @load-page="loadUnits"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      create-text="Nueva Unidad"
    >
      <template #filters>
        <v-text-field
          v-model="searchQuery"
          label="Buscar por código o nombre"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px;"
          @update:model-value="debouncedSearch"
        ></v-text-field>
      </template>

      <template #subtitle="{ item }">
        <div class="d-flex align-center flex-wrap gap-2">
          <v-chip size="small" variant="flat" :color="item.is_system ? 'blue' : 'green'">
            <v-icon start size="small">{{ item.is_system ? 'mdi-cog' : 'mdi-account' }}</v-icon>
            {{ item.is_system ? 'Sistema' : 'Personalizada' }}
          </v-chip>
          <v-chip size="small" variant="outlined">
            Código: <strong class="ml-1">{{ item.code }}</strong>
          </v-chip>
          <v-chip v-if="item.dian_code" size="small" variant="outlined" color="purple">
            DIAN: <strong class="ml-1">{{ item.dian_code }}</strong>
          </v-chip>
        </div>
      </template>

      <template #content="{ item }">
        <div class="text-caption text-grey" v-if="item.description">
          {{ item.description }}
        </div>
      </template>

      <template #actions="{ item }">
        <!-- Solo permitir editar/eliminar unidades del tenant (no sistema) -->
        <v-btn
          v-if="!item.is_system"
          icon="mdi-pencil"
          size="small"
          variant="text"
          color="primary"
          @click="openEditDialog(item)"
        ></v-btn>
        <v-btn
          v-if="!item.is_system"
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          @click="confirmDelete(item)"
        ></v-btn>
        <v-tooltip v-if="item.is_system" text="Unidad del sistema (no editable)" location="top">
          <template #activator="{ props }">
            <v-icon v-bind="props" color="blue-grey" size="small">mdi-lock</v-icon>
          </template>
        </v-tooltip>
      </template>
    </ListView>

    <!-- Dialog Crear/Editar -->
    <v-dialog v-model="formDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start :color="isEditing ? 'primary' : 'success'">
            {{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}
          </v-icon>
          {{ isEditing ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="unitForm" @submit.prevent="saveUnit">
            <v-text-field
              v-model="formData.code"
              label="Código *"
              hint="Código interno corto (ej: KG, UND, MT)"
              variant="outlined"
              :rules="[rules.required, rules.maxLength(20)]"
              counter="20"
              @input="formData.code = formData.code.toUpperCase()"
            ></v-text-field>

            <v-text-field
              v-model="formData.dian_code"
              label="Código DIAN"
              hint="Código oficial DIAN para facturación electrónica"
              variant="outlined"
              :rules="[rules.maxLength(20)]"
              counter="20"
              @input="formData.dian_code = formData.dian_code ? formData.dian_code.toUpperCase() : ''"
            ></v-text-field>

            <v-text-field
              v-model="formData.name"
              label="Nombre *"
              hint="Nombre descriptivo (ej: Kilogramo, Unidad, Metro)"
              variant="outlined"
              :rules="[rules.required, rules.maxLength(100)]"
              counter="100"
            ></v-text-field>

            <v-textarea
              v-model="formData.description"
              label="Descripción"
              hint="Información adicional sobre la unidad"
              variant="outlined"
              rows="3"
              :rules="[rules.maxLength(500)]"
              counter="500"
            ></v-textarea>

            <v-switch
              v-model="formData.is_active"
              label="Unidad activa"
              color="success"
              hide-details
              class="mb-2"
            ></v-switch>
          </v-form>

          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            <strong>Códigos DIAN comunes:</strong><br>
            • 94 = Unidad • 28 = Kilogramo • GRM = Gramo • LTR = Litro • MTR = Metro<br>
            Consulta la <a href="https://www.dian.gov.co" target="_blank">resolución 000042/2020 DIAN</a> para más códigos.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="formDialog = false" :disabled="saving">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="saveUnit"
            :loading="saving"
            prepend-icon="mdi-content-save"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Eliminar -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center text-error">
          <v-icon start color="error">mdi-alert-circle</v-icon>
          Confirmar Eliminación
        </v-card-title>

        <v-card-text>
          <p>¿Estás seguro de eliminar la unidad <strong>{{ unitToDelete?.name }}</strong> ({{ unitToDelete?.code }})?</p>
          
          <v-alert v-if="usageInfo && usageInfo.total > 0" type="error" variant="tonal" class="mt-4">
            <strong>⚠️ Esta unidad está en uso:</strong>
            <ul class="ml-4 mt-2">
              <li v-if="usageInfo.products > 0">{{ usageInfo.products }} producto(s)</li>
              <li v-if="usageInfo.variants > 0">{{ usageInfo.variants }} variante(s)</li>
              <li v-if="usageInfo.bom_components > 0">{{ usageInfo.bom_components }} componente(s) BOM</li>
            </ul>
            <p class="mt-2">No se puede eliminar hasta que dejes de usarla.</p>
          </v-alert>

          <v-alert v-else-if="!checkingUsage" type="warning" variant="tonal" class="mt-4">
            Esta acción no se puede deshacer.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false" :disabled="deleting">Cancelar</v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="deleteUnit"
            :loading="deleting || checkingUsage"
            :disabled="usageInfo && usageInfo.total > 0"
            prepend-icon="mdi-delete"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import ListView from '@/components/ListView.vue'
import unitsOfMeasureService from '@/services/unitsOfMeasure.service'

const { tenantId } = useTenant()

// Estado principal
const units = ref([])
const totalItems = ref(0)
const loading = ref(false)
const defaultPageSize = ref(20)
const searchQuery = ref('')

// Dialogs
const formDialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const checkingUsage = ref(false)

// Formulario
const unitForm = ref(null)
const formData = ref({
  unit_id: null,
  code: '',
  dian_code: '',
  name: '',
  description: '',
  is_active: true
})

// Eliminar
const unitToDelete = ref(null)
const usageInfo = ref(null)

// Snackbar
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Reglas de validación
const rules = {
  required: v => !!v || 'Campo requerido',
  maxLength: max => v => (v && v.length <= max) || `Máximo ${max} caracteres`
}

// Cargar unidades
const loadUnits = async (params) => {
  if (!tenantId.value) return
  
  loading.value = true
  try {
    const page = typeof params === 'object' ? params.page || 1 : params || 1
    const pageSize = typeof params === 'object' ? params.pageSize || defaultPageSize.value : defaultPageSize.value
    const search = typeof params === 'object' ? params.search || '' : searchQuery.value || ''

    const result = await unitsOfMeasureService.getUnits(tenantId.value, page, pageSize, search)
    
    if (result.success) {
      units.value = result.data
      totalItems.value = result.total
    } else {
      showMsg('Error al cargar unidades: ' + result.error, 'error')
    }
  } catch (error) {
    console.error('Error loadUnits:', error)
    showMsg('Error al cargar unidades', 'error')
  } finally {
    loading.value = false
  }
}

// Búsqueda con debounce
let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadUnits({ page: 1, pageSize: defaultPageSize.value, search: searchQuery.value })
  }, 500)
}

// Abrir dialog crear
const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    unit_id: null,
    code: '',
    dian_code: '',
    name: '',
    description: '',
    is_active: true
  }
  unitForm.value?.resetValidation()
  formDialog.value = true
}

// Abrir dialog editar
const openEditDialog = (unit) => {
  if (unit.is_system) {
    showMsg('No puedes editar unidades del sistema', 'warning')
    return
  }
  
  isEditing.value = true
  formData.value = {
    unit_id: unit.unit_id,
    code: unit.code,
    dian_code: unit.dian_code || '',
    name: unit.name,
    description: unit.description || '',
    is_active: unit.is_active
  }
  unitForm.value?.resetValidation()
  formDialog.value = true
}

// Guardar unidad
const saveUnit = async () => {
  const { valid } = await unitForm.value.validate()
  if (!valid || !tenantId.value) return

  saving.value = true
  try {
    let result
    if (isEditing.value) {
      result = await unitsOfMeasureService.updateUnit(
        tenantId.value,
        formData.value.unit_id,
        formData.value
      )
    } else {
      result = await unitsOfMeasureService.createUnit(tenantId.value, formData.value)
    }

    if (result.success) {
      showMsg(isEditing.value ? 'Unidad actualizada' : 'Unidad creada', 'success')
      formDialog.value = false
      await loadUnits()
    } else {
      showMsg('Error: ' + result.error, 'error')
    }
  } catch (error) {
    console.error('Error saveUnit:', error)
    showMsg('Error al guardar unidad', 'error')
  } finally {
    saving.value = false
  }
}

// Confirmar eliminación
const confirmDelete = async (unit) => {
  if (unit.is_system) {
    showMsg('No puedes eliminar unidades del sistema', 'warning')
    return
  }

  unitToDelete.value = unit
  usageInfo.value = null
  deleteDialog.value = true

  // Verificar si está en uso
  checkingUsage.value = true
  try {
    const result = await unitsOfMeasureService.checkUnitUsage(unit.unit_id)
    if (result.success) {
      usageInfo.value = result.usage
    }
  } catch (error) {
    console.error('Error checking usage:', error)
  } finally {
    checkingUsage.value = false
  }
}

// Eliminar unidad
const deleteUnit = async () => {
  if (!unitToDelete.value || !tenantId.value) return

  deleting.value = true
  try {
    const result = await unitsOfMeasureService.deleteUnit(
      tenantId.value,
      unitToDelete.value.unit_id
    )

    if (result.success) {
      showMsg('Unidad eliminada', 'success')
      deleteDialog.value = false
      unitToDelete.value = null
      usageInfo.value = null
      await loadUnits()
    } else {
      showMsg('Error: ' + result.error, 'error')
    }
  } catch (error) {
    console.error('Error deleteUnit:', error)
    showMsg('Error al eliminar unidad', 'error')
  } finally {
    deleting.value = false
  }
}

// Mostrar mensaje
const showMsg = (msg, color = 'success') => {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// Montar componente
onMounted(() => {
  if (tenantId.value) {
    loadUnits()
  }
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
