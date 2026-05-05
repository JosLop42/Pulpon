# 🐙 Pulpo Zurdo — Sistema de Pedidos

PWA de pedidos para restaurante con React + Vite, Supabase y Netlify.

---

## Stack

| Capa       | Tecnología                    |
|------------|-------------------------------|
| Frontend   | React 18 + Vite + PWA         |
| Backend    | Supabase (PostgreSQL + Auth)  |
| Realtime   | Supabase Realtime (WebSockets)|
| Deploy     | Netlify                       |
| Acceso QR  | URL con `?branch=X&table=Y`   |

---

## Configuración inicial — paso a paso

### 1. Supabase

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto (guarda la contraseña de la DB)
3. Ir a **SQL Editor** → pegar y ejecutar `supabase/schema.sql`
4. Ir a **Settings → API** → copiar:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Variables de entorno locales

```bash
cp .env.example .env.local
# Editar .env.local con tus valores de Supabase
```

### 3. Instalar y correr localmente

```bash
npm install
npm run dev
```

### 4. Crear el primer admin

En Supabase → **Authentication → Users** → **Invite user**:
- Email: tu correo de admin
- Luego en SQL Editor:
  ```sql
  UPDATE profiles
  SET role = 'admin', full_name = 'Tu Nombre'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');
  ```

### 5. Deploy en Netlify

1. Push del repo a GitHub
2. En Netlify: **New site → Import from Git**
3. Build command: `npm run build` / Publish: `dist`
4. **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy 🎉

### 6. Generar QRs

```bash
# Instalar qrcode
npm install qrcode

# Actualizar scripts/generate-qrs.js con:
# - Tu URL de Netlify
# - Los UUIDs reales de tus sucursales (SELECT id, name FROM branches)

node scripts/generate-qrs.js
# → QRs en public/qrs/ (abre index.html para imprimir)
```

---

## Rutas de la aplicación

| Ruta           | Vista              | Acceso                  |
|----------------|--------------------|-------------------------|
| `/menu?branch=X&table=Y` | Menú cliente | Público (QR)  |
| `/order-success` | Confirmación     | Público                 |
| `/login`       | Login empleado     | Público                 |
| `/orders`      | Gestión pedidos    | employee, admin         |
| `/kitchen`     | Cola cocina        | kitchen, admin          |
| `/admin`       | Gestión empleados  | admin                   |

---

## Roles

| Rol        | Acceso                                           |
|------------|--------------------------------------------------|
| `employee` | `/orders` — gestiona pedidos de su sucursal      |
| `kitchen`  | `/kitchen` — ve cola, cambia estado en cocina    |
| `admin`    | Todo lo anterior + `/admin` para crear empleados |

---

## Estructura del proyecto

```
src/
├── components/
│   └── menu/       # MenuItemCard, CartDrawer
├── context/        # AuthContext, CartContext
├── lib/
│   └── supabase.js # Cliente + helpers de consulta
├── pages/
│   ├── MenuPage.jsx      # Vista cliente QR
│   ├── LoginPage.jsx     # Login empleados
│   ├── OrdersPage.jsx    # Gestión pedidos (realtime)
│   ├── KitchenPage.jsx   # Cola cocina (realtime)
│   ├── AdminPage.jsx     # Gestión empleados
│   └── OrderSuccess.jsx  # Confirmación pedido
└── index.css        # Design system completo
supabase/
└── schema.sql       # Schema completo con RLS
scripts/
└── generate-qrs.js  # Generador de 32 QRs
```

---

## Flujos principales

### Cliente (QR)
1. Escanea QR en la mesa → `/menu?branch=X&table=Y`
2. Navega por categorías del menú
3. Agrega items al carrito
4. Escribe nombre opcional y notas
5. Envía pedido → confirmación en pantalla

### Empleado
1. Login con email/contraseña
2. Ve pedidos de su sucursal en tiempo real
3. Avanza estados: Nuevo → Confirmado → En cocina → Listo → Entregado
4. Puede cancelar pedidos pendientes

### Cocina
1. Ve cola de pedidos confirmados y en preparación
2. Mueve pedidos de "Por preparar" a "Listo"
3. Indicador de tiempo transcurrido con urgencia visual

---

## Extensiones futuras sugeridas

- [ ] Reportes de ventas por sucursal / período
- [ ] Gestión de disponibilidad del menú desde admin
- [ ] Notificaciones push cuando el pedido está listo
- [ ] Soporte para imprimir ticket en cocina (PrintNode)
- [ ] Vista de historial de pedidos por mesa
