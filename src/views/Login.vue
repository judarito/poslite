<template>
  <v-app>
    <div class="login-wrapper">
      <!-- Panel izquierdo -->
      <div class="login-left d-none d-md-flex">
        <v-icon size="120" class="mb-6">mdi-lock-outline</v-icon>
        <h1 class="text-h3 mb-4">Bienvenido</h1>
        <p class="text-h6 text-center px-8">
          Gestiona tu negocio de forma inteligente con nuestro sistema POS e inventarios
        </p>
        <div class="mt-8 d-flex ga-2">
          <v-chip color="white" variant="outlined" size="large">
            <v-icon start>mdi-shield-check</v-icon>
            Seguro
          </v-chip>
          <v-chip color="white" variant="outlined" size="large">
            <v-icon start>mdi-speedometer</v-icon>
            Rápido
          </v-chip>
          <v-chip color="white" variant="outlined" size="large">
            <v-icon start>mdi-cloud-check</v-icon>
            En la nube
          </v-chip>
        </div>
      </div>

      <!-- Panel derecho -->
      <div class="login-right">
        <!-- Logo móvil -->
        <div class="text-center mb-8 d-md-none">
          <v-icon size="80" color="primary">mdi-lock-outline</v-icon>
          <h2 class="text-h4 mt-4">Bienvenido</h2>
        </div>

        <div class="text-center mb-8 d-none d-md-block">
          <h2 class="text-h4 mb-2">Iniciar Sesión</h2>
          <p class="text-body-1 text-grey">Ingresa tus credenciales para continuar</p>
        </div>

        <v-form @submit.prevent="handleLogin" ref="loginForm">
          <v-text-field
            v-model="loginData.email"
            label="Correo Electrónico"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            type="email"
            :rules="[rules.required, rules.email]"
            required
            class="mb-1"
          ></v-text-field>

          <v-text-field
            v-model="loginData.password"
            label="Contraseña"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            :type="showPassword ? 'text' : 'password'"
            variant="outlined"
            :rules="[rules.required]"
            required
            class="mb-1"
            @click:append-inner="showPassword = !showPassword"
          ></v-text-field>

          <div class="d-flex justify-space-between align-center mb-4">
            <v-checkbox
              v-model="rememberMe"
              label="Recordarme"
              density="compact"
              hide-details
            ></v-checkbox>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="showResetPassword = true"
            >
              ¿Olvidaste tu contraseña?
            </v-btn>
          </div>

          <v-btn
            type="submit"
            color="primary"
            size="x-large"
            block
            :loading="loading"
            elevation="0"
          >
            <v-icon start>mdi-login</v-icon>
            Iniciar Sesión
          </v-btn>

          <v-alert
            v-if="loginError"
            type="error"
            variant="tonal"
            closable
            class="mt-4"
            @click:close="loginError = ''"
          >
            {{ loginError }}
          </v-alert>
        </v-form>
      </div>
    </div>

    <!-- Dialog Restablecer Contraseña -->
    <v-dialog v-model="showResetPassword" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start>mdi-lock-reset</v-icon>
          Restablecer Contraseña
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleResetPassword">
            <v-text-field
              v-model="resetEmail"
              label="Correo Electrónico"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              type="email"
              required
            ></v-text-field>

            <v-alert
              v-if="resetMessage"
              :type="resetSuccess ? 'success' : 'error'"
              variant="tonal"
              class="mb-4"
            >
              {{ resetMessage }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showResetPassword = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            @click="handleResetPassword"
            :loading="loading"
          >
            Enviar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { signIn, resetPassword, loading } = useAuth()
const { saveTenant } = useTenant()
const { syncThemeFromTenant } = useTheme()

const showPassword = ref(false)
const rememberMe = ref(false)
const showResetPassword = ref(false)

const loginData = ref({
  email: '',
  password: ''
})

const resetEmail = ref('')
const loginError = ref('')
const resetMessage = ref('')
const resetSuccess = ref(false)

const loginForm = ref(null)

const rules = {
  required: value => !!value || 'Campo requerido',
  email: value => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) || 'Correo electrónico inválido'
  }
}

const handleLogin = async () => {
  const { valid } = await loginForm.value.validate()
  if (!valid) return

  loginError.value = ''

  const result = await signIn(loginData.value.email, loginData.value.password)

  if (result.success) {
    // Guardar datos del tenant en localStorage
    if (result.tenant) {
      saveTenant({
        tenant_id: result.tenant.tenant_id,
        tenant_name: result.tenant.name,
        currency_code: result.tenant.currency_code
      })
      
      // Sincronizar tema del tenant
      await syncThemeFromTenant(result.tenant.tenant_id)
    }

    // Redirigir al home
    router.push('/')
  } else {
    loginError.value = result.error || 'Error al iniciar sesión'
  }
}

const handleResetPassword = async () => {
  if (!resetEmail.value) return

  resetMessage.value = ''

  const result = await resetPassword(resetEmail.value)

  if (result.success) {
    resetSuccess.value = true
    resetMessage.value = 'Se ha enviado un correo para restablecer tu contraseña'
  } else {
    resetSuccess.value = false
    resetMessage.value = result.error || 'Error al enviar correo'
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  height: 100vh;
  width: 100%;
}

.login-left {
  width: 50%;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.login-right {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

@media (min-width: 960px) {
  .login-right {
    width: 50%;
  }
}

.login-right .v-form {
  width: 100%;
  max-width: 400px;
}
</style>
