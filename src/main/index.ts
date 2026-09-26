import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { registrarIpc } from './ipc'
import { fecharComBackup } from './backup'
import { pastaDados } from './paths'

function criarJanela(): void {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'CRM Assessor',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0d12' : '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Links externos abrem no navegador padrão, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Nenhuma página (nem os quadros de prévia de e-mail) pode navegar para fora do app.
  const urlDoApp = (url: string) => url.startsWith('file://') || url.startsWith('about:') || (!!process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL']))
  win.webContents.on('will-frame-navigate', (e) => {
    if (urlDoApp(e.url)) return
    e.preventDefault()
    if (/^(https?:|mailto:)/.test(e.url)) shell.openExternal(e.url)
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Versão empacotada 100% portátil: até o cache e as preferências do Electron ficam
// na pasta do .exe (subpasta dados-do-app), nada no perfil do Windows (AppData).
if (app.isPackaged) app.setPath('userData', join(pastaDados(), 'dados-do-app'))

const unicaInstancia = app.requestSingleInstanceLock()
if (!unicaInstancia) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    registrarIpc()
    criarJanela()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela()
    })
  })

  // Ao fechar: fecha o banco e faz o backup automático (mantém os 10 mais recentes).
  app.on('window-all-closed', () => {
    fecharComBackup()
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => fecharComBackup())
}
