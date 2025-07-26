const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 로그 디렉토리 생성
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // 아이콘은 나중에 추가
    title: 'AI Research Tracker'
  });

  mainWindow.loadFile('index.html');

  // 개발 모드에서 DevTools 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 로그 저장 IPC 핸들러
ipcMain.handle('save-log', async (event, logData) => {
  try {
    const logFile = path.join(logsDir, 'actions.json');
    let logs = [];
    
    // 기존 로그 파일이 있으면 읽기
    if (fs.existsSync(logFile)) {
      const existingData = fs.readFileSync(logFile, 'utf8');
      logs = JSON.parse(existingData);
    }
    
    // 새 로그 추가
    logs.push({
      ...logData,
      timestamp: new Date().toISOString(),
      localTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    });
    
    // 파일에 저장
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Log save failed:', error);
    return { success: false, error: error.message };
  }
});

// 로그 읽기 IPC 핸들러
ipcMain.handle('load-logs', async () => {
  try {
    const logFile = path.join(logsDir, 'actions.json');
    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Log read failed:', error);
    return [];
  }
}); 