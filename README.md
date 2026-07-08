# Alfredo — Dashboard de Información

Panel de análisis para la Secretaría de Gestión Institucional del MJyS Santa Fe.

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create alfredo-dashboard --private
git push origin main
```

### 2. Importar en Vercel

1. Ir a [vercel.com](https://vercel.com) → New Project
2. Importar el repo de GitHub
3. Framework: Next.js (auto-detectado)

### 3. Variables de entorno (Vercel → Settings → Environment Variables)

```
ANTHROPIC_API_KEY        = sk-ant-...
OPENAI_API_KEY           = sk-...  (para embeddings del RAG)
NEXT_PUBLIC_SUPABASE_URL = https://jyvlnqcqyeolbyfwmcrf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ...
NEXTAUTH_SECRET          = (generar con: openssl rand -base64 32)
NEXTAUTH_URL             = https://tu-app.vercel.app
APP_USERS                = (ver abajo)
```

### 4. Generar usuarios

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('tu-contraseña', 10))"
```

Luego armar el JSON para APP_USERS:
```json
[
  {"name":"Federico Angelini","email":"fangelini@mjys.gob.ar","passwordHash":"$2b$10$..."},
  {"name":"Carlos Actis","email":"cactis@mjys.gob.ar","passwordHash":"$2b$10$..."}
]
```

**Importante**: el JSON debe estar en una sola línea en Vercel.

### 5. Deploy

Vercel hace el deploy automáticamente al pushear a main.

## Estructura

```
app/
  page.tsx          — Dashboard principal (métricas + chat)
  login/page.tsx    — Login
  api/
    auth/           — NextAuth (login/logout)
    chat/           — Chat con Claude + RAG
    metrics/        — Métricas desde Supabase
lib/
  supabase.ts       — Cliente Supabase + funciones RAG
```

## Cómo agregar usuarios

Editar la variable de entorno `APP_USERS` en Vercel con el nuevo usuario y hacer redeploy.
