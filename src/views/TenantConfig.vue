<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="deep-purple">mdi-domain</v-icon>
        Configuración de Empresa
      </v-card-title>

      <v-card-text>
        <v-form ref="configForm" @submit.prevent="saveAll">
          <div class="text-subtitle-1 font-weight-bold mb-2">Datos de la Empresa</div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tenant.name" label="Nombre de la Empresa *" variant="outlined" :rules="[rules.required]"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tenant.tax_id" label="NIT / Identificación fiscal" variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="tenant.currency_code" :items="currencies" label="Moneda" variant="outlined"></v-select>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <div class="text-subtitle-1 font-weight-bold mb-2">Configuración del Negocio</div>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="settings.business_name" label="Nombre comercial (recibos)" variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="settings.business_phone" label="Teléfono de contacto" variant="outlined" prepend-inner-icon="mdi-phone"></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="settings.business_address" label="Dirección" variant="outlined" prepend-inner-icon="mdi-map-marker"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="settings.logo_url" label="URL del Logo" variant="outlined" prepend-inner-icon="mdi-image"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-switch v-model="settings.default_tax_included" label="Impuesto incluido en precio por defecto" color="primary" hide-details></v-switch>
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="settings.receipt_footer" label="Pie de recibo/factura" variant="outlined" rows="3" hint="Texto que aparecerá al final del recibo"></v-textarea>
            </v-col>
          </v-row>

          <!-- Vista previa logo -->
          <div v-if="settings.logo_url" class="mb-4">
            <div class="text-caption mb-1">Vista previa del logo:</div>
            <v-img :src="settings.logo_url" max-height="100" max-width="200" contain class="border rounded"></v-img>
          </div>

          <v-btn type="submit" color="primary" block size="large" :loading="saving" prepend-icon="mdi-content-save">
            Guardar Configuración
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import tenantSettingsService from '@/services/tenantSettings.service'

const { tenantId } = useTenant()

const configForm = ref(null)
const saving = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const rules = { required: v => !!v || 'Campo requerido' }

const currencies = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'ARS', 'CLP', 'BRL']

const tenant = ref({ name: '', tax_id: '', currency_code: 'COP' })
const settings = ref({
  business_name: '',
  business_address: '',
  business_phone: '',
  logo_url: '',
  receipt_footer: '',
  default_tax_included: false
})

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }

const loadData = async () => {
  if (!tenantId.value) return

  const [tRes, sRes] = await Promise.all([
    tenantSettingsService.getTenant(tenantId.value),
    tenantSettingsService.getSettings(tenantId.value)
  ])

  if (tRes.success) {
    tenant.value = {
      name: tRes.data.name || '',
      tax_id: tRes.data.tax_id || '',
      currency_code: tRes.data.currency_code || 'COP'
    }
  }

  if (sRes.success && sRes.data) {
    settings.value = {
      business_name: sRes.data.business_name || '',
      business_address: sRes.data.business_address || '',
      business_phone: sRes.data.business_phone || '',
      logo_url: sRes.data.logo_url || '',
      receipt_footer: sRes.data.receipt_footer || '',
      default_tax_included: sRes.data.default_tax_included || false
    }
  }
}

const saveAll = async () => {
  const { valid } = await configForm.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const [tRes, sRes] = await Promise.all([
      tenantSettingsService.updateTenant(tenantId.value, tenant.value),
      tenantSettingsService.saveSettings(tenantId.value, settings.value)
    ])

    if (tRes.success && sRes.success) showMsg('Configuración guardada exitosamente')
    else showMsg(tRes.error || sRes.error || 'Error al guardar', 'error')
  } catch (error) {
    showMsg('Error al guardar configuración', 'error')
  } finally { saving.value = false }
}

onMounted(loadData)
</script>
