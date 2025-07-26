const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 로그 저장
  saveLog: (logData) => ipcRenderer.invoke('save-log', logData),
  
  // 로그 읽기
  loadLogs: () => ipcRenderer.invoke('load-logs'),
  
  // 개발 모드 확인
  isDev: process.argv.includes('--dev')
}); 