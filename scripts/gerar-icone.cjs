/** Gera resources/icon.png (512×512): quadrado arredondado azul com barras de crescimento. Sem dependências. */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const N = 512
const px = Buffer.alloc(N * N * 4)
const dentroArredondado = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
// Amostragem 4×4 por pixel para bordas suaves.
function cobertura(x, y, fn) {
  let n = 0
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (fn(x + (i + 0.5) / 4, y + (j + 0.5) / 4)) n++
  return n / 16
}
const barras = [
  [138, 300, 196, 392],
  [227, 226, 285, 392],
  [316, 148, 374, 392]
]
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const fundo = cobertura(x, y, (a, b) => dentroArredondado(a, b, 16, 16, 496, 496, 110))
    const barra = cobertura(x, y, (a, b) => barras.some(([x0, y0, x1, y1]) => dentroArredondado(a, b, x0, y0, x1, y1, 14)))
    // Degradê diagonal: brand-500 → brand-700
    const t = (x + y) / (2 * N)
    const r = Math.round(59 + (29 - 59) * t), g = Math.round(108 + (63 - 108) * t), bl = Math.round(246 + (216 - 246) * t)
    const i = (y * N + x) * 4
    px[i] = Math.round(r + (255 - r) * barra)
    px[i + 1] = Math.round(g + (255 - g) * barra)
    px[i + 2] = Math.round(bl + (255 - bl) * barra)
    px[i + 3] = Math.round(255 * fundo)
  }
}
// PNG mínimo (RGBA 8 bits, sem entrelaçamento).
const crcTabela = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTabela[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const bloco = (tipo, dados) => {
  const t = Buffer.from(tipo)
  const len = Buffer.alloc(4); len.writeUInt32BE(dados.length)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dados])))
  return Buffer.concat([len, t, dados, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6
const linhas = Buffer.alloc(N * (N * 4 + 1))
for (let y = 0; y < N; y++) px.copy(linhas, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4)
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0))
])
const destino = path.join(__dirname, '..', 'resources', 'icon.png')
fs.writeFileSync(destino, png)
console.log('Ícone gerado em', destino)
