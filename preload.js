const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 로그 저장
  saveLog: (logData) => ipcRenderer.invoke('save-log', logData),
  
  // 로그 읽기
  loadLogs: () => ipcRenderer.invoke('load-logs'),
  
  // OpenAI API 호출 제거됨 - WebView만 사용
  
  // 개발 모드 확인
  isDev: process.argv.includes('--dev'),
  
  // 복사된 텍스트 추가
  addCopiedText: (data) => ipcRenderer.invoke('add-copied-text', data),
  
  // 복사된 텍스트 이벤트 리스너
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  
  // 복사된 텍스트 추적
  trackCopiedText: (data) => ipcRenderer.invoke('track-copied-text', data)
}); 