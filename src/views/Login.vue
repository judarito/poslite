<template>
  <div class="login-root" :class="{ 'login-dark': isDark }">
    <section class="login-page">
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>

      <v-container class="fill-height" fluid>
        <v-row class="fill-height" align="center" justify="center">
          <v-col cols="12" lg="10" xl="9">
            <v-sheet class="login-shell" rounded="xl" elevation="0">
              <div class="brand-panel d-none d-md-flex">
                <div class="brand-inner">
                  <div class="brand-kicker">POSLITE CORE</div>
                  <h1 class="brand-title">Control real de ventas e inventario</h1>
                  <p class="brand-copy">
                    Opera mas rapido, con reglas de negocio solidas y decisiones apoyadas por IA.
                  </p>
                  <div class="brand-points">
                    <v-chip size="small" variant="flat" class="brand-chip">
                      <v-icon start>mdi-shield-check</v-icon>
                      Seguridad tenant
                    </v-chip>
                    <v-chip size="small" variant="flat" class="brand-chip">
                      <v-icon start>mdi-sync-circle</v-icon>
                      Realtime
                    </v-chip>
                    <v-chip size="small" variant="flat" class="brand-chip">
                      <v-icon start>mdi-robot-outline</v-icon>
                      IA operativa
                    </v-chip>
                  </div>
                </div>
              </div>

              <div class="form-panel">
                <template v-if="recoveryMode">
                  <div class="form-header">
                    <div class="form-logo">
                      <v-icon size="26">mdi-lock-reset</v-icon>
                    </div>
                    <div>
                      <h2 class="form-title">Nueva contrasena</h2>
                      <p class="form-subtitle">Define una nueva contrasena para tu cuenta</p>
                    </div>
                  </div>

                  <v-form @submit.prevent="handleUpdatePassword">
                    <v-text-field
                      v-model="recoveryPassword"
                      label="Nueva contrasena"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                      :type="showPassword ? 'text' : 'password'"
                      variant="outlined"
                      :bg-color="isDark ? 'grey-darken-3' : 'white'"
                      required
                      class="mb-2"
                      @click:append-inner="showPassword = !showPassword"
                    ></v-text-field>

                    <v-text-field
                      v-model="recoveryPasswordConfirm"
                      label="Confirmar contrasena"
                      prepend-inner-icon="mdi-lock-check-outline"
                      :type="showPassword ? 'text' : 'password'"
                      variant="outlined"
                      :bg-color="isDark ? 'grey-darken-3' : 'white'"
                      required
                      class="mb-3"
                    ></v-text-field>

                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      block
                      :loading="loading"
                      class="login-btn"
                    >
                      <v-icon start>mdi-content-save-check</v-icon>
                      Guardar contrasena
                    </v-btn>

                    <v-alert
                      v-if="recoveryMessage"
                      :type="recoverySuccess ? 'success' : 'error'"
                      variant="tonal"
                      class="mt-4"
                    >
                      {{ recoveryMessage }}
                    </v-alert>
                  </v-form>
                </template>

                <template v-else>
                  <div class="form-header">
                    <div class="form-logo">
                      <v-icon size="26">mdi-storefront-outline</v-icon>
                    </div>
                    <div>
                      <h2 class="form-title">Iniciar sesion</h2>
                      <p class="form-subtitle">Ingresa tus credenciales para continuar</p>
                    </div>
                  </div>

                  <v-form @submit.prevent="handleLogin" ref="loginForm">
                    <v-text-field
                      v-model="loginData.email"
                      label="Correo electronico"
                      prepend-inner-icon="mdi-email-outline"
                      variant="outlined"
                      :bg-color="isDark ? 'grey-darken-3' : 'white'"
                      type="email"
                      :rules="[rules.required, rules.email]"
                      required
                      class="mb-2"
                    ></v-text-field>

                    <v-text-field
                      v-model="loginData.password"
                      label="Contrasena"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                      :type="showPassword ? 'text' : 'password'"
                      variant="outlined"
                      :bg-color="isDark ? 'grey-darken-3' : 'white'"
                      :rules="[rules.required]"
                      required
                      class="mb-2"
                      @click:append-inner="showPassword = !showPassword"
                    ></v-text-field>

                    <div class="form-actions-row">
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
                        class="login-link-btn"
                        @click="showResetPassword = true"
                      >
                        Olvide mi contrasena
                      </v-btn>
                    </div>

                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      block
                      :loading="loading"
                      class="login-btn"
                    >
                      <v-icon start>mdi-login</v-icon>
                      Entrar al sistema
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
                </template>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-dialog v-model="showResetPassword" max-width="500">
      <v-card rounded="xl">
        <v-card-title>
          <v-icon start>mdi-lock-reset</v-icon>
          Restablecer contrasena
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleResetPassword">
            <v-text-field
              v-model="resetEmail"
              label="Correo electronico"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              :bg-color="isDark ? 'grey-darken-3' : 'white'"
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
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTenant } from '@/composables/useTenant'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { signIn, resetPassword, updatePassword, loading } = useAuth()
const { saveTenant } = useTenant()
const { syncThemeFromTenant, isDark } = useTheme()

const showPassword = ref(false)
const rememberMe = ref(false)
const showResetPassword = ref(false)
const recoveryMode = ref(false)

const loginData = ref({
  email: '',
  password: ''
})

const resetEmail = ref('')
const loginError = ref('')
const resetMessage = ref('')
const resetSuccess = ref(false)
const recoveryPassword = ref('')
const recoveryPasswordConfirm = ref('')
const recoveryMessage = ref('')
const recoverySuccess = ref(false)

const loginForm = ref(null)

const rules = {
  required: value => !!value || 'Campo requerido',
  email: value => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) || 'Correo electronico invalido'
  }
}

const handleLogin = async () => {
  const { valid } = await loginForm.value.validate()
  if (!valid) return

  loginError.value = ''

  const result = await signIn(loginData.value.email, loginData.value.password)

  if (result.success) {
    if (result.tenant) {
      saveTenant({
        tenant_id: result.tenant.tenant_id,
        tenant_name: result.tenant.name,
        currency_code: result.tenant.currency_code
      })

      await syncThemeFromTenant(result.tenant.tenant_id)
    }

    router.push('/')
  } else {
    loginError.value = result.error || 'Error al iniciar sesion'
  }
}

const handleResetPassword = async () => {
  const normalizedEmail = (resetEmail.value || '').trim()
  if (!normalizedEmail) return
  if (rules.email(normalizedEmail) !== true) {
    resetSuccess.value = false
    resetMessage.value = 'Correo electronico invalido'
    return
  }

  resetMessage.value = ''

  const result = await resetPassword(normalizedEmail)

  if (result.success) {
    resetSuccess.value = true
    resetMessage.value = 'Se ha enviado un correo para restablecer tu contrasena'
  } else {
    resetSuccess.value = false
    resetMessage.value = result.error || 'Error al enviar correo'
  }
}

const handleUpdatePassword = async () => {
  recoveryMessage.value = ''

  if (!recoveryPassword.value || recoveryPassword.value.length < 6) {
    recoverySuccess.value = false
    recoveryMessage.value = 'La contrasena debe tener al menos 6 caracteres'
    return
  }

  if (recoveryPassword.value !== recoveryPasswordConfirm.value) {
    recoverySuccess.value = false
    recoveryMessage.value = 'Las contrasenas no coinciden'
    return
  }

  const result = await updatePassword(recoveryPassword.value)
  if (!result.success) {
    recoverySuccess.value = false
    recoveryMessage.value = result.error || 'No se pudo actualizar la contrasena'
    return
  }

  recoverySuccess.value = true
  recoveryMessage.value = 'Contrasena actualizada. Redirigiendo...'
  setTimeout(() => {
    router.push('/')
  }, 1200)
}

onMounted(() => {
  const hash = (window.location.hash || '').toLowerCase()
  const search = (window.location.search || '').toLowerCase()
  recoveryMode.value =
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    (hash.includes('access_token=') && hash.includes('refresh_token='))
})
</script>

<style scoped>
.login-root {
  min-height: 100%;
}

.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 10% 15%, rgba(17, 85, 204, 0.18), transparent 30%),
    radial-gradient(circle at 90% 90%, rgba(11, 143, 172, 0.18), transparent 30%),
    linear-gradient(135deg, #f4f7fb 0%, #ebf2fb 100%);
}

.login-page :deep(.v-container) {
  position: relative;
  z-index: 2;
  min-height: 100vh;
}

.bg-orb {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.5;
  pointer-events: none;
}

.orb-a {
  width: 260px;
  height: 260px;
  top: -80px;
  right: -80px;
  background: #1462d8;
}

.orb-b {
  width: 300px;
  height: 300px;
  bottom: -110px;
  left: -80px;
  background: #0f9f9a;
}

.login-shell {
  min-height: 620px;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(var(--v-theme-outline), 0.22);
  box-shadow: 0 28px 64px rgba(14, 36, 64, 0.14);
  overflow: hidden;
}

.brand-panel {
  background: linear-gradient(165deg, #0f4cc2 0%, #0b74b6 52%, #169184 100%);
  color: #fff;
  display: flex;
  justify-content: center;
  padding: 48px;
}

.brand-inner {
  max-width: 420px;
}

.brand-kicker {
  letter-spacing: 1.8px;
  font-size: 12px;
  font-weight: 700;
  opacity: 0.9;
  margin-bottom: 12px;
}

.brand-title {
  font-size: clamp(28px, 3vw, 44px);
  line-height: 1.08;
  margin-bottom: 16px;
  font-weight: 800;
}

.brand-copy {
  font-size: 16px;
  line-height: 1.55;
  opacity: 0.94;
  margin-bottom: 24px;
}

.brand-points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.brand-chip {
  background: rgba(255, 255, 255, 0.16) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.28);
}

.brand-chip :deep(.v-icon) {
  color: #ffffff !important;
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 38px;
  max-width: 460px;
  margin: 0 auto;
  width: 100%;
  color: rgb(var(--v-theme-on-surface));
}

.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.form-logo {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #0f4cc2;
  background: linear-gradient(145deg, rgba(15, 76, 194, 0.13), rgba(16, 159, 154, 0.13));
  border: 1px solid rgba(15, 76, 194, 0.15);
}

.form-title {
  font-size: 28px;
  line-height: 1.1;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.form-subtitle {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 14px;
}

.form-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.login-btn {
  min-height: 48px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 12px 24px rgba(15, 76, 194, 0.25);
}

.login-link-btn {
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.login-root.login-dark .login-page {
  background:
    radial-gradient(circle at 10% 15%, rgba(17, 85, 204, 0.24), transparent 30%),
    radial-gradient(circle at 90% 90%, rgba(11, 143, 172, 0.2), transparent 30%),
    linear-gradient(135deg, #0f1522 0%, #101a2c 100%);
}

.login-root.login-dark .login-shell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 64px rgba(0, 0, 0, 0.4);
}

.login-root.login-dark .brand-chip {
  background: rgba(255, 255, 255, 0.13) !important;
  color: #ffffff !important;
}

@media (max-width: 960px) {
  .login-shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .form-panel {
    padding: 28px 20px;
    max-width: 100%;
  }

  .form-title {
    font-size: 24px;
  }
}

@media (max-width: 600px) {
  .form-actions-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
