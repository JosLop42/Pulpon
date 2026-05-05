#!/usr/bin/env node
/**
 * Generador de QRs para Pulpo Zurdo
 * Genera los 32 códigos QR (4 sucursales × 8 mesas)
 *
 * Uso: node scripts/generate-qrs.js
 * Requiere: npm install qrcode
 */

const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

// ⚠️ Cambia esto a tu URL de producción en Netlify
const BASE_URL = process.env.APP_URL || 'https://pulpo-zurdo.netlify.app'

// IDs reales de las sucursales — cópialos de tu tabla `branches` en Supabase
// Ejecuta: SELECT id, name FROM branches ORDER BY name;
const BRANCHES = [
  { id: 'REEMPLAZA-CON-UUID-1', name: 'Centro' },
  { id: 'REEMPLAZA-CON-UUID-2', name: 'Oakland' },
  { id: 'REEMPLAZA-CON-UUID-3', name: 'Cayalá' },
  { id: 'REEMPLAZA-CON-UUID-4', name: 'Miraflores' },
]

const OUTPUT_DIR = path.join(__dirname, '../public/qrs')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function generate() {
  console.log(`\n🐙 Generando QRs para Pulpo Zurdo → ${BASE_URL}\n`)

  for (const branch of BRANCHES) {
    for (let table = 1; table <= 8; table++) {
      const url = `${BASE_URL}/menu?branch=${branch.id}&table=${table}`
      const filename = `${branch.name.toLowerCase()}-mesa-${table}.png`
      const filepath = path.join(OUTPUT_DIR, filename)

      await QRCode.toFile(filepath, url, {
        width: 400,
        margin: 2,
        color: { dark: '#0a1628', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      })
      console.log(`  ✓ ${branch.name} — Mesa ${table}: ${filename}`)
    }
  }

  // Generar HTML de vista previa
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>QRs Pulpo Zurdo</title>
  <style>
    body { font-family: sans-serif; background: #f5f5f5; padding: 2rem; }
    h1 { color: #0a1628; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
    .qr { background: white; border-radius: 8px; padding: 1rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    img { width: 100%; }
    p { margin: 0.5rem 0 0; font-size: 0.8rem; color: #333; }
  </style>
</head>
<body>
  <h1>🐙 QRs Pulpo Zurdo</h1>
  <p>Imprime y coloca cada QR en la mesa correspondiente.</p>
  <div class="grid">
    ${BRANCHES.flatMap(b =>
      Array.from({ length: 8 }, (_, i) => i + 1).map(t => `
    <div class="qr">
      <img src="${b.name.toLowerCase()}-mesa-${t}.png" alt="${b.name} Mesa ${t}">
      <p><strong>${b.name}</strong><br>Mesa ${t}</p>
    </div>`)
    ).join('')}
  </div>
</body>
</html>`

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html)
  console.log(`\n✅ 32 QRs generados en: public/qrs/`)
  console.log(`   Abre public/qrs/index.html para previsualizar e imprimir\n`)
}

generate().catch(console.error)
