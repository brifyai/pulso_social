# Variables de Entorno para Supabase Self-Hosted (Producción)

## ⚠️ VARIABLES QUE DEBES CAMBIAR OBLIGATORIAMENTE

### 1. POSTGRES_PASSWORD
```bash
# ❌ INCORRECTO (valor predeterminado)
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password

# ✅ CORRECTO (genera una contraseña segura)
POSTGRES_PASSWORD=tu_contraseña_segura_muy_larga_y_aleatoria_12345
```

### 2. JWT_SECRET
```bash
# ❌ INCORRECTO (valor predeterminado)
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# ✅ CORRECTO (genera un secreto JWT de 32+ caracteres)
JWT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx
```

### 3. ANON_KEY (Clave pública para el frontend)
```bash
# ❌ INCORRECTO (clave de demo)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

# ✅ CORRECTO (genera una nueva clave JWT)
# Genera con: openssl rand -base64 32
ANON_KEY=tu_nueva_clave_anon_generada_con_openssl
```

### 4. SERVICE_ROLE_KEY (Clave de servicio para backend)
```bash
# ❌ INCORRECTO (clave de demo)
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q

# ✅ CORRECTO (genera una nueva clave JWT)
# Genera con: openssl rand -base64 32
SERVICE_ROLE_KEY=tu_nueva_clave_service_role_generada_con_openssl
```

### 5. DASHBOARD_USERNAME y DASHBOARD_PASSWORD
```bash
# ❌ INCORRECTO (credenciales predeterminadas)
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=this_password_is_insecure_and_should_be_updated

# ✅ CORRECTO (credenciales seguras)
DASHBOARD_USERNAME=tu_usuario_admin
DASHBOARD_PASSWORD=tu_contraseña_segura_admin
```

### 6. SECRET_KEY_BASE
```bash
# ❌ INCORRECTO (valor predeterminado)
SECRET_KEY_BASE=UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq

# ✅ CORRECTO (genera un secreto seguro)
# Genera con: openssl rand -base64 64
SECRET_KEY_BASE=tu_nuevo_secreto_base_generado_con_openssl
```

### 7. VAULT_ENC_KEY
```bash
# ❌ INCORRECTO (valor predeterminado)
VAULT_ENC_KEY=your-32-character-encryption-key

# ✅ CORRECTO (debe tener exactamente 32 caracteres)
VAULT_ENC_KEY=abc123def456ghi789jkl012mno345pq
```

### 8. PG_META_CRYPTO_KEY
```bash
# ❌ INCORRECTO (valor predeterminado)
PG_META_CRYPTO_KEY=your-encryption-key-32-chars-min

# ✅ CORRECTO (mínimo 32 caracteres)
PG_META_CRYPTO_KEY=xyz789uvw012rst345mno678pqr901stu
```

### 9. POOLER_TENANT_ID
```bash
# ❌ INCORRECTO (valor predeterminado)
POOLER_TENANT_ID=your-tenant-id

# ✅ CORRECTO (identificador único de tu tenant)
POOLER_TENANT_ID=pulso-social-tenant-001
```

### 10. SITE_URL (URL pública de tu aplicación)
```bash
# ❌ INCORRECTO (localhost)
SITE_URL=http://localhost:3000

# ✅ CORRECTO (tu dominio de producción)
SITE_URL=https://pulso-social-pulsosocial.dsb9vm.easypanel.host
```

### 11. API_EXTERNAL_URL
```bash
# ❌ INCORRECTO (localhost)
API_EXTERNAL_URL=http://localhost:8000

# ✅ CORRECTO (tu dominio de producción)
API_EXTERNAL_URL=https://pulso-social-pulsosocial.dsb9vm.easypanel.host
```

### 12. SUPABASE_PUBLIC_URL
```bash
# ❌ INCORRECTO (localhost)
SUPABASE_PUBLIC_URL=http://localhost:8000

# ✅ CORRECTO (tu dominio de producción)
SUPABASE_PUBLIC_URL=https://pulso-social-pulsosocial.dsb9vm.easypanel.host
```

### 13. OPENAI_API_KEY (en Supabase)
```bash
# ❌ INCORRECTO (vacío)
OPENAI_API_KEY=

# ✅ CORRECTO (tu API key de OpenAI)
OPENAI_API_KEY=sk-proj-... (tu API key de OpenAI)
```

### 14. LOGFLARE_PUBLIC_ACCESS_TOKEN y LOGFLARE_PRIVATE_ACCESS_TOKEN
```bash
# ❌ INCORRECTO (valores predeterminados)
LOGFLARE_PUBLIC_ACCESS_TOKEN=your-super-secret-and-long-logflare-key-public
LOGFLARE_PRIVATE_ACCESS_TOKEN=your-super-secret-and-long-logflare-key-private

# ✅ CORRECTO (genera tokens seguros)
# Genera con: openssl rand -base64 32
LOGFLARE_PUBLIC_ACCESS_TOKEN=tu_token_publico_logflare
LOGFLARE_PRIVATE_ACCESS_TOKEN=tu_token_privado_logflare
```

## ✅ VARIABLES QUE PUEDES MANTENER (Opcional)

### Database (si usas la base de datos interna de Supabase)
```bash
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
```

### Supavisor (Database pooler)
```bash
POOLER_PROXY_PORT_TRANSACTION=6543
POOLER_DEFAULT_POOL_SIZE=20
POOLER_MAX_CLIENT_CONN=100
POOLER_DB_POOL_SIZE=5
```

### Kong (API Proxy)
```bash
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
```

### PostgREST (API)
```bash
PGRST_DB_SCHEMAS=public,storage,graphql_public
```

### Auth (GoTrue)
```bash
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
```

### Functions
```bash
FUNCTIONS_VERIFY_JWT=false
```

## 📝 COMANDOS PARA GENERAR CLAVES SEGURAS

```bash
# Generar contraseña segura
openssl rand -base64 32

# Generar JWT secret
openssl rand -base64 32

# Generar clave de 32 caracteres
openssl rand -hex 16

# Generar clave base64 de 64 caracteres
openssl rand -base64 64
```

## 🚀 VARIABLES PARA PULSO SOCIAL (Easy Panel)

Además de las variables de Supabase, necesitas estas para la aplicación:

```bash
# Convex
VITE_CONVEX_URL=https://energetic-cuttlefish-560.convex.cloud
CONVEX_DEPLOYMENT=dev:energetic-cuttlefish-560

# OpenAI (para la aplicación)
OPENAI_API_KEY=sk-proj-... (tu API key de OpenAI)

# Supabase (para conectar desde la aplicación)
SUPABASE_URL=https://tu-dominio-supabase.com
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role
SUPABASE_ANON_KEY=tu_clave_anon

# GNews (opcional)
GNEWS_API_KEY=tu_api_key_gnews
```
