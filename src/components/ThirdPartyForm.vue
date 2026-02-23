<template>
  <v-form @submit.prevent="onSubmit" ref="formRef">
    <v-row>
      <!-- Tipo de tercero -->
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis mb-1">Tipo de tercero</div>
        <v-btn-toggle v-model="form.type" mandatory density="comfortable" color="primary" variant="outlined" rounded="lg">
          <v-btn value="customer" prepend-icon="mdi-account">Cliente</v-btn>
          <v-btn value="supplier" prepend-icon="mdi-truck">Proveedor</v-btn>
          <v-btn value="both" prepend-icon="mdi-account-switch">Ambos</v-btn>
        </v-btn-toggle>
      </v-col>

      <!-- Identificación -->
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis font-weight-bold mt-2 mb-n1">Identificación</div>
      </v-col>
      <v-col cols="12" sm="8">
        <v-text-field v-model="form.legal_name" label="Razón social / Nombre completo" prepend-inner-icon="mdi-domain" :rules="[rules.required]" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="form.trade_name" label="Nombre comercial" prepend-inner-icon="mdi-tag" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-select
          v-model="form.document_type"
          :items="documentTypes"
          item-title="label"
          item-value="code"
          label="Tipo de documento"
          prepend-inner-icon="mdi-card-account-details"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>
      <v-col cols="12" sm="5">
        <v-text-field v-model="form.document_number" label="Número de documento" prepend-inner-icon="mdi-numeric" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="3">
        <v-text-field v-model="form.dv" label="Dígito verificación" prepend-inner-icon="mdi-shield-check" variant="outlined" density="comfortable"></v-text-field>
      </v-col>

      <!-- Contacto -->
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis font-weight-bold mt-2 mb-n1">Contacto</div>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.phone" label="Teléfono" prepend-inner-icon="mdi-phone" type="tel" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.email" label="Correo electrónico" prepend-inner-icon="mdi-email-outline" type="email" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="form.fiscal_email" label="Correo fiscal / facturación" prepend-inner-icon="mdi-email" type="email" variant="outlined" density="comfortable"></v-text-field>
      </v-col>

      <!-- Ubicación -->
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis font-weight-bold mt-2 mb-n1">Ubicación</div>
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.department" :items="departments" item-title="name" item-value="department_id" label="Departamento" prepend-inner-icon="mdi-map" variant="outlined" density="comfortable" @update:model-value="onDepartmentChange"></v-select>
      </v-col>
      <v-col cols="12" sm="6">
        <v-select v-model="form.city" :items="cities" item-title="name" item-value="city_id" label="Ciudad / Municipio" prepend-inner-icon="mdi-city" variant="outlined" density="comfortable"></v-select>
      </v-col>
      <v-col cols="12">
        <v-textarea v-model="form.address_text" label="Dirección" prepend-inner-icon="mdi-map-marker" rows="2" auto-grow variant="outlined" density="comfortable"></v-textarea>
      </v-col>

      <!-- Condiciones comerciales -->
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis font-weight-bold mt-2 mb-n1">Condiciones comerciales</div>
      </v-col>
      <v-col cols="12" sm="5">
        <v-text-field v-model.number="form.max_credit_amount" label="Cupo de crédito (COP)" prepend-inner-icon="mdi-cash" type="number" min="0" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model.number="form.default_payment_terms" label="Días de pago" prepend-inner-icon="mdi-calendar-clock" type="number" min="0" variant="outlined" density="comfortable"></v-text-field>
      </v-col>
      <v-col cols="12" sm="3">
        <v-text-field v-model="form.default_currency" label="Moneda" prepend-inner-icon="mdi-currency-usd" variant="outlined" density="comfortable"></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-switch v-model="form.is_active" label="Activo" hide-details color="success" inset></v-switch>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup>
import { reactive, toRefs, watch, computed, ref, onMounted, defineExpose } from 'vue'
import lookupsService from '@/services/lookups.service'

const props = defineProps({ model: { type: Object, default: () => ({}) } })
const emit = defineEmits(['save', 'cancel'])

const formRef = ref(null)

const form = reactive({
  third_party_id: null,
  tenant_id: null,
  type: 'both',
  document_type: '',
  document_number: '',
  dv: '',
  legal_name: '',
  trade_name: '',
  address: null,
  address_text: '',
  city: '',
  department: '',
  country_code: 'CO',
  postal_code: '',
  phone: '',
  email: '',
  fiscal_email: '',
  tax_regime: '',
  tax_responsibilities: [],
  is_responsible_for_iva: false,
  electronic_invoicing_enabled: false,
  default_payment_terms: null,
  default_currency: 'COP',
  max_credit_amount: null,
  is_active: true
})

const rules = { required: v => !!v || 'Campo requerido' }

// Inicializar con modelo si viene
if (props.model && Object.keys(props.model).length > 0) {
  Object.assign(form, props.model)
  // Normalizar address: puede venir como string plano, JSON string o JSONB objeto
  const addr = props.model.address
  if (addr) {
    if (typeof addr === 'string') {
      // JSON string {"street":"..."} → extraer street; texto plano → usar directo
      if (addr.startsWith('{')) {
        try { form.address_text = JSON.parse(addr)?.street || addr } catch (e) { form.address_text = addr }
      } else {
        form.address_text = addr
      }
    } else if (typeof addr === 'object') {
      // Objeto JSONB del DB → extraer street o serializar
      form.address_text = addr.street || addr.text || addr.address || Object.values(addr)[0] || ''
    }
  }
}

watch(() => form.address_text, (val) => {
  form.address = val || null
})

function onSubmit() {
  // address es texto plano desde address_text
  form.address = form.address_text || null
  // Normalize document_type: extraer solo el code si llegó como objeto o JSON string
  if (form.document_type && typeof form.document_type === 'object') {
    form.document_type = form.document_type.code
  } else if (form.document_type && typeof form.document_type === 'string' && form.document_type.startsWith('{')) {
    try { form.document_type = JSON.parse(form.document_type).code } catch (e) {}
  }
  emit('save', { ...form })
}

const documentTypes = ref([])
const departments = ref([])
const cities = ref([])

async function loadLookups() {
  try {
    documentTypes.value = await lookupsService.listDocumentTypes()
    departments.value = await lookupsService.listDepartments()
    // if department preselected, load its cities
    if (form.department) cities.value = await lookupsService.listCities(form.department)
  } catch (e) {
    console.error('Error cargando lookups', e)
  }
}

function onDepartmentChange(val) {
  form.city = null
  if (!val) { cities.value = []; return }
  lookupsService.listCities(val).then(d => cities.value = d).catch(console.error)
}

onMounted(() => loadLookups())

// Exponer submit para que el padre pueda dispararlo desde su botón
async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  onSubmit()
}

defineExpose({ submit })
</script>
