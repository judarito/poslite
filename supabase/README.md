# Supabase Edge Functions

## Instalar Supabase CLI

```bash
# Windows (PowerShell)
scoop install supabase

# O descargar desde:
# https://github.com/supabase/cli/releases
```

## Desplegar la Edge Function

```bash
# 1. Login en Supabase
supabase login

# 2. Link al proyecto
supabase link --project-ref [TU_PROJECT_REF]

# 3. Desplegar la función
supabase functions deploy create-tenant-user

# 4. Verificar que se desplegó
supabase functions list
```

## ¿Qué hace esta Edge Function?

La función `create-tenant-user`:
- ✅ Crea usuarios en Supabase Auth con **autoconfirmación de email**
- ✅ Usa `auth.admin.createUser({ email_confirm: true })`
- ✅ Requiere `SUPABASE_SERVICE_ROLE_KEY` (solo disponible en backend)
- ✅ Retorna el `user_id` para guardarlo en la tabla `users`

## Alternativa sin Edge Function

Si no quieres configurar Edge Functions, simplemente:

1. Ve a **Supabase Dashboard**
2. Authentication → Providers → Email
3. Desactiva **"Enable email confirmations"**
4. Cambia en `tenants.service.js` de:
   ```javascript
   await supabaseService.client.functions.invoke('create-tenant-user', ...)
   ```
   A:
   ```javascript
   await supabaseService.client.auth.signUp({ email, password })
   ```

Con esta configuración, todos los usuarios se crean sin necesidad de confirmar email.
