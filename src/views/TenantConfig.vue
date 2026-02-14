<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="deep-purple">mdi-cog</v-icon>
        Configuración de Empresa
      </v-card-title>

      <v-tabs v-model="tab" color="primary" class="px-4">
        <v-tab value="general">General</v-tab>
        <v-tab value="ui">Interfaz</v-tab>
        <v-tab value="ai">Inteligencia IA</v-tab>
        <v-tab value="inventory">Inventario</v-tab>
        <v-tab value="sales">Ventas</v-tab>
        <v-tab value="invoicing">Facturación</v-tab>
        <v-tab value="notifications">Notificaciones</v-tab>
      </v-tabs>

      <v-card-text>
        <v-form ref="configForm" @submit.prevent="saveAll">
          <v-window v-model="tab">
            <!-- GENERAL -->
            <v-window-item value="general">
              <div class="text-h6 mb-4">Información General</div>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="tenant.name" label="Nombre de la Empresa *" variant="outlined" :rules="[rules.required]"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="tenant.tax_id" label="NIT / Identificación fiscal" variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select v-model="tenant.currency_code" :items="currencies" label="Moneda *" variant="outlined" :rules="[rules.required]"></v-select>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>
              <div class="text-h6 mb-4">Datos del Negocio</div>
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
                <v-col cols="12">
                  <v-textarea v-model="settings.receipt_footer" label="Pie de recibo/factura" variant="outlined" rows="3" hint="Texto que aparecerá al final del recibo"></v-textarea>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch v-model="settings.default_tax_included" label="Impuesto incluido en precio por defecto" color="primary"></v-switch>
                </v-col>
              </v-row>

              <!-- Vista previa logo -->
              <div v-if="settings.logo_url" class="mb-4">
                <div class="text-caption mb-1">Vista previa del logo:</div>
                <v-img :src="settings.logo_url" max-height="100" max-width="200" contain class="border rounded"></v-img>
              </div>
            </v-window-item>

            <!-- INTERFAZ -->
            <v-window-item value="ui">
              <div class="text-h6 mb-4">Configuración de Interfaz</div>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.default_page_size" 
                    :items="[10, 20, 50, 100]" 
                    label="Registros por página *" 
                    variant="outlined"
                    hint="Cantidad de registros a mostrar en listas"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.theme" 
                    :items="themeOptions" 
                    label="Tema de la interfaz *" 
                    variant="outlined"
                    hint="Apariencia visual de la aplicación"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.date_format" 
                    :items="dateFormatOptions" 
                    label="Formato de fecha *" 
                    variant="outlined"
                    hint="Formato para mostrar fechas"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.locale" 
                    :items="localeOptions" 
                    label="Idioma/Región *" 
                    variant="outlined"
                    hint="Configuración regional del sistema"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model.number="settings.session_timeout_minutes" 
                    type="number" 
                    label="Tiempo de sesión (minutos) *" 
                    variant="outlined"
                    min="5"
                    max="480"
                    hint="Minutos de inactividad antes de cerrar sesión"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- IA -->
            <v-window-item value="ai">
              <div class="text-h6 mb-4">Configuración de Inteligencia Artificial</div>
              <v-alert type="info" variant="tonal" class="mb-4">
                <strong>IA Powered by DeepSeek</strong><br>
                Configura cómo la IA analiza tu negocio para generar insights y recomendaciones.
              </v-alert>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.ai_forecast_days_back" 
                    :items="[30, 60, 90, 180]" 
                    label="Días de historial para pronóstico *" 
                    variant="outlined"
                    hint="Días hacia atrás para analizar tendencias"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.ai_purchase_suggestion_days" 
                    :items="[7, 14, 30]" 
                    label="Días de proyección de compras *" 
                    variant="outlined"
                    hint="Días hacia adelante para sugerencias"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.ai_purchase_advisor_enabled" 
                    label="Habilitar Asesor de Compras IA" 
                    color="purple"
                    hint="Sugerencias inteligentes de qué comprar"
                    persistent-hint
                  ></v-switch>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.ai_sales_forecast_enabled" 
                    label="Habilitar Pronóstico de Ventas IA" 
                    color="purple"
                    hint="Predicción de ventas futuras"
                    persistent-hint
                  ></v-switch>
                </v-col>
              </v-row>

              <!-- Administración de Caché IA -->
              <v-divider class="my-6"></v-divider>
              <div class="text-h6 mb-4">Administración de Caché IA</div>
              <v-alert type="info" variant="tonal" class="mb-4">
                <v-icon start>mdi-cached</v-icon>
                El caché ahorra ~70% en costos de API al reutilizar análisis recientes.
                <br>
                <strong>Pronósticos:</strong> 24 horas | <strong>Compras:</strong> 12 horas
              </v-alert>

              <v-row v-if="cacheStats">
                <v-col cols="12" sm="3">
                  <v-card variant="tonal" color="blue">
                    <v-card-text>
                      <div class="text-overline">Total en Caché</div>
                      <div class="text-h4">{{ validCacheCount }}</div>
                      <div class="text-caption">entradas válidas</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="3">
                  <v-card variant="tonal" color="orange">
                    <v-card-text>
                      <div class="text-overline">Expiradas</div>
                      <div class="text-h4">{{ expiredCacheCount }}</div>
                      <div class="text-caption">para limpieza</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="3">
                  <v-card variant="tonal" color="green">
                    <v-card-text>
                      <div class="text-overline">Tamaño</div>
                      <div class="text-h4">{{ cacheSizeKB }}</div>
                      <div class="text-caption">KB almacenados</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="3">
                  <v-card variant="tonal" color="purple">
                    <v-card-text>
                      <div class="text-overline">Ahorro Estimado</div>
                      <div class="text-h4">~70%</div>
                      <div class="text-caption">en costos API</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-row class="mt-2">
                <v-col cols="12" sm="auto">
                  <v-btn 
                    color="primary" 
                    prepend-icon="mdi-refresh" 
                    variant="outlined"
                    @click="refreshCacheStats"
                  >
                    Actualizar Stats
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn 
                    color="warning" 
                    prepend-icon="mdi-broom" 
                    variant="outlined"
                    @click="clearExpiredCache"
                  >
                    Limpiar Expirados
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn 
                    color="error" 
                    prepend-icon="mdi-delete" 
                    variant="outlined"
                    @click="confirmClearAllCache"
                  >
                    Limpiar Todo
                  </v-btn>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- INVENTARIO -->
            <v-window-item value="inventory">
              <div class="text-h6 mb-4">Configuración de Inventario</div>
              <v-alert type="info" variant="tonal" class="mb-4">
                <strong>Nota:</strong> Stock mínimo y sobreventa se configuran individualmente por producto.
              </v-alert>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model.number="settings.expiry_alert_days" 
                    type="number" 
                    label="Días de alerta de vencimiento *" 
                    variant="outlined"
                    min="1"
                    max="365"
                    hint="Alertar productos próximos a vencer"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.reserve_stock_on_layaway" 
                    label="Reservar stock en plan separé" 
                    color="primary"
                    hint="Apartar inventario al crear separé"
                    persistent-hint
                  ></v-switch>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- VENTAS -->
            <v-window-item value="sales">
              <div class="text-h6 mb-4">Configuración de Ventas y Precios</div>
              <v-alert type="info" variant="tonal" class="mb-4">
                <strong>Nota:</strong> Los descuentos están habilitados para el rol ADMINISTRADOR.
              </v-alert>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model.number="settings.max_discount_without_auth" 
                    type="number" 
                    label="Descuento máximo cajeros (%)" 
                    variant="outlined"
                    min="0"
                    max="100"
                    step="0.01"
                    suffix="%"
                    hint="Descuento máximo que puede aplicar un cajero"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.rounding_method" 
                    :items="roundingOptions" 
                    label="Método de redondeo *" 
                    variant="outlined"
                    hint="Cómo redondear totales de ventas"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.rounding_multiple" 
                    :items="[{label: 'Unidades (1)', value: 1}, {label: 'Decenas (10)', value: 10}, {label: 'Centenas (100)', value: 100}, {label: 'Miles (1000)', value: 1000}]"
                    item-title="label"
                    item-value="value" 
                    label="Múltiplo de redondeo *" 
                    variant="outlined"
                    hint="A qué múltiplo redondear"
                    persistent-hint
                  ></v-select>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- FACTURACIÓN -->
            <v-window-item value="invoicing">
              <div class="text-h6 mb-4">Configuración de Facturación</div>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model="settings.invoice_prefix" 
                    label="Prefijo de factura *" 
                    variant="outlined"
                    hint="Ej: FAC, INV, FC"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model.number="settings.next_invoice_number" 
                    type="number" 
                    label="Siguiente número de factura *" 
                    variant="outlined"
                    min="1"
                    hint="Consecutivo actual de facturación"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.print_format" 
                    :items="printFormatOptions" 
                    label="Formato de impresión *" 
                    variant="outlined"
                    hint="Tipo de impresora a usar"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select 
                    v-model="settings.thermal_paper_width" 
                    :items="[{label: '58mm', value: 58}, {label: '80mm', value: 80}]"
                    item-title="label"
                    item-value="value" 
                    label="Ancho papel térmico *" 
                    variant="outlined"
                    :disabled="settings.print_format !== 'thermal'"
                    hint="Ancho del rollo de papel"
                    persistent-hint
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.electronic_invoicing_enabled" 
                    label="Facturación electrónica habilitada" 
                    color="indigo"
                    hint="Integración con DIAN u organismo fiscal"
                    persistent-hint
                  ></v-switch>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- NOTIFICACIONES -->
            <v-window-item value="notifications">
              <div class="text-h6 mb-4">Configuración de Notificaciones</div>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.email_alerts_enabled" 
                    label="Habilitar alertas por email" 
                    color="blue"
                    hint="Enviar notificaciones al correo"
                    persistent-hint
                  ></v-switch>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field 
                    v-model="settings.alert_email" 
                    label="Email para alertas" 
                    variant="outlined"
                    type="email"
                    prepend-inner-icon="mdi-email"
                    :disabled="!settings.email_alerts_enabled"
                    hint="Email que recibirá las notificaciones"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.notify_low_stock" 
                    label="Notificar stock bajo" 
                    color="orange"
                    :disabled="!settings.email_alerts_enabled"
                    hint="Alertar cuando productos tengan poco stock"
                    persistent-hint
                  ></v-switch>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch 
                    v-model="settings.notify_expiring_products" 
                    label="Notificar productos por vencer" 
                    color="red"
                    :disabled="!settings.email_alerts_enabled"
                    hint="Alertar productos próximos a vencerse"
                    persistent-hint
                  ></v-switch>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>

          <v-divider class="my-4"></v-divider>

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
import { useTenantSettings } from '@/composables/useTenantSettings'
import { useAICache } from '@/composables/useAICache'
import tenantSettingsService from '@/services/tenantSettings.service'

const { tenantId } = useTenant()
const { loadSettings } = useTenantSettings()
const { 
  cacheStats, 
  validCacheCount, 
  expiredCacheCount, 
  cacheSizeKB,
  refreshStats: refreshCacheStats,
  clearAll,
  clearExpired
} = useAICache()

const configForm = ref(null)
const tab = ref('general')
const saving = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const rules = { required: v => !!v || 'Campo requerido' }

const currencies = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'ARS', 'CLP', 'BRL']

const themeOptions = [
  { title: 'Claro', value: 'light' },
  { title: 'Oscuro', value: 'dark' },
  { title: 'Automático', value: 'auto' }
]

const dateFormatOptions = [
  { title: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { title: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { title: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
]

const localeOptions = [
  { title: 'Español Colombia (es-CO)', value: 'es-CO' },
  { title: 'Español México (es-MX)', value: 'es-MX' },
  { title: 'Español España (es-ES)', value: 'es-ES' },
  { title: 'Inglés US (en-US)', value: 'en-US' }
]

const roundingOptions = [
  { title: 'Normal (Matemático)', value: 'normal' },
  { title: 'Hacia arriba', value: 'up' },
  { title: 'Hacia abajo', value: 'down' },
  { title: 'Sin redondeo', value: 'none' }
]

const printFormatOptions = [
  { title: 'Impresora Térmica', value: 'thermal' },
  { title: 'Carta (A4)', value: 'letter' },
  { title: 'Ticket (Media Carta)', value: 'ticket' }
]

const tenant = ref({ name: '', tax_id: '', currency_code: 'COP' })

const settings = ref({
  // General
  business_name: '',
  business_address: '',
  business_phone: '',
  logo_url: '',
  receipt_footer: '',
  default_tax_included: false,
  
  // UI
  default_page_size: 20,
  theme: 'light',
  date_format: 'DD/MM/YYYY',
  locale: 'es-CO',
  session_timeout_minutes: 60,
  
  // IA
  ai_forecast_days_back: 90,
  ai_purchase_suggestion_days: 14,
  ai_purchase_advisor_enabled: true,
  ai_sales_forecast_enabled: true,
  
  // Inventario (sin duplicados - min_stock y allow_backorder ya existen por producto)
  expiry_alert_days: 30,
  reserve_stock_on_layaway: true,
  
  // Ventas
  max_discount_without_auth: 5,
  rounding_method: 'normal',
  rounding_multiple: 100,
  
  // Facturación
  invoice_prefix: 'FAC',
  next_invoice_number: 1,
  electronic_invoicing_enabled: false,
  print_format: 'thermal',
  thermal_paper_width: 80,
  
  // Notificaciones
  email_alerts_enabled: false,
  alert_email: '',
  notify_low_stock: true,
  notify_expiring_products: true
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
    const data = sRes.data
    settings.value = {
      // General
      business_name: data.business_name || '',
      business_address: data.business_address || '',
      business_phone: data.business_phone || '',
      logo_url: data.logo_url || '',
      receipt_footer: data.receipt_footer || '',
      default_tax_included: data.default_tax_included || false,
      
      // UI
      default_page_size: data.default_page_size || 20,
      theme: data.theme || 'light',
      date_format: data.date_format || 'DD/MM/YYYY',
      locale: data.locale || 'es-CO',
      session_timeout_minutes: data.session_timeout_minutes || 60,
      
      // IA
      ai_forecast_days_back: data.ai_forecast_days_back || 90,
      ai_purchase_suggestion_days: data.ai_purchase_suggestion_days || 14,
      ai_purchase_advisor_enabled: data.ai_purchase_advisor_enabled !== false,
      ai_sales_forecast_enabled: data.ai_sales_forecast_enabled !== false,
      
      // Inventario (sin duplicados)
      expiry_alert_days: data.expiry_alert_days || 30,
      reserve_stock_on_layaway: data.reserve_stock_on_layaway !== false,
      
      // Ventas
      max_discount_without_auth: data.max_discount_without_auth || 5,
      rounding_method: data.rounding_method || 'normal',
      rounding_multiple: data.rounding_multiple || 100,
      
      // Facturación
      invoice_prefix: data.invoice_prefix || 'FAC',
      next_invoice_number: data.next_invoice_number || 1,
      electronic_invoicing_enabled: data.electronic_invoicing_enabled || false,
      print_format: data.print_format || 'thermal',
      thermal_paper_width: data.thermal_paper_width || 80,
      
      // Notificaciones
      email_alerts_enabled: data.email_alerts_enabled || false,
      alert_email: data.alert_email || '',
      notify_low_stock: data.notify_low_stock !== false,
      notify_expiring_products: data.notify_expiring_products !== false
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

    if (tRes.success && sRes.success) {
      showMsg('Configuración guardada exitosamente')
      // Recargar settings para que se propague el cambio (especialmente el tema)
      await loadSettings(true)
    } else {
      showMsg(tRes.error || sRes.error || 'Error al guardar', 'error')
    }
  } catch (error) {
    showMsg('Error al guardar configuración', 'error')
  } finally { saving.value = false }
}

// Funciones de Gestión de Caché IA
const clearExpiredCache = () => {
  const count = clearExpired()
  showMsg(`${count} entradas expiradas eliminadas`, 'success')
}

const confirmClearAllCache = () => {
  if (confirm('¿Está seguro de eliminar TODO el caché de IA? Esto forzará nuevas consultas a la API.')) {
    const count = clearAll()
    showMsg(`${count} entradas eliminadas. El caché se ha limpiado completamente.`, 'warning')
  }
}

onMounted(loadData)
</script>
