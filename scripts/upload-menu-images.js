// Script: sube imágenes del menú a Supabase Storage y actualiza image_url en la BD
// Uso: node scripts/upload-menu-images.js
//
// Las imágenes están en /Users/josh/Desktop/Pulpon/pulpos_jpgs/
// Una misma imagen puede asignarse a varios platillos (ver MAPPINGS abajo).

import { createClient } from '@supabase/supabase-js'
import { readFile }     from 'fs/promises'
import { join, extname } from 'path'
import { createInterface } from 'readline'

const SUPABASE_URL  = 'https://btcgkizocfhyqyfndnvv.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y2draXpvY2ZoeXF5Zm5kbnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjIyODQsImV4cCI6MjA5MzQzODI4NH0.uzn0_xufnBCSO4V1ToDTvNr_RvrqWbaFT623kO8lTxE'
const IMAGES_FOLDER = '/Users/josh/Desktop/Pulpon/pulpos_jpgs'
const BUCKET        = 'menu-images'

// Mapeo explícito: archivo → platillos que reciben esa imagen
const MAPPINGS = [
  {
    file:  'ceviche_mixto_32_16.jpeg',
    items: ['Ceviche Mixto 16 oz', 'Ceviche Mixto 36 oz'],
  },
  {
    file:  'cevivhe_pulpo_cangrejo.jpeg',
    items: [
      'Ceviche de Pulpo 16 oz', 'Ceviche de Pulpo 36 oz',
      'Ceviche de Cangrejo 16 oz', 'Ceviche de Cangrejo 36 oz',
    ],
  },
  {
    file:  'tostada_mixta.jpeg',
    items: ['Tostada Mixta'],
  },
  {
    file:  'porcion_2_tostadas.jpeg',
    items: ['Porción 2 Tostadas Mixtas'],
  },
  {
    file:  'mineral_preparada.jpeg',
    items: ['Mineral Preparada'],
  },
  {
    file:  'cocacola.jpeg',
    items: ['Coca Cola Lata'],
  },
  {
    file:  'picosita_modelo.jpeg',
    items: ['Picosita Modelo'],
  },
  {
    file:  'picosita_gallo.jpeg',
    items: ['Picosita Gallo'],
  },
]

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()) }))
}

function mimeType(ext) {
  if (ext === '.png')  return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

async function main() {
  console.log("── Subida de imágenes — Pulpo's ────────────────────────\n")

  const email    = await ask('Email del admin: ')
  const password = await ask('Contraseña:      ')

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  if (loginError) {
    console.error('\n✗ No se pudo iniciar sesión:', loginError.message)
    process.exit(1)
  }
  console.log('✓ Sesión iniciada\n')

  let ok = 0, fail = 0

  for (const { file, items } of MAPPINGS) {
    const filePath = join(IMAGES_FOLDER, file)
    const ext      = extname(file).toLowerCase()

    // Leer archivo
    let buffer
    try {
      buffer = await readFile(filePath)
    } catch {
      console.error(`✗ Archivo no encontrado: ${file}`)
      fail++
      continue
    }

    // Subir al bucket (upsert para no fallar si ya existe)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(file, buffer, { contentType: mimeType(ext), upsert: true })

    if (uploadError) {
      console.error(`✗ Error subiendo "${file}": ${uploadError.message}`)
      fail++
      continue
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(file)

    // Actualizar cada platillo que usa esta imagen
    for (const itemName of items) {
      const { data: updated, error: dbError } = await supabase
        .from('menu_items')
        .update({ image_url: publicUrl })
        .ilike('name', itemName)
        .select('name')

      if (dbError) {
        console.error(`  ✗ BD error en "${itemName}": ${dbError.message}`)
        fail++
      } else if (!updated.length) {
        console.warn(`  ⚠  No encontrado en BD: "${itemName}"`)
      } else {
        console.log(`  ✓ ${itemName}`)
        ok++
      }
    }
  }

  console.log(`\n────────────────────────────────────────────────────────`)
  console.log(`✓ Actualizados: ${ok}   ✗ Errores: ${fail}`)
}

main().catch(err => { console.error(err); process.exit(1) })
