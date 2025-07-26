# 🤖 AI Research Tracker

ElectronJS 기반 데스크톱 앱으로 연구부터 글쓰기까지의 과정을 추적하는 도구입니다.

## 🚀 기능

### MVP 기능
- **멀티 탭 WebView 인터페이스**
  - ChatGPT (https://chat.openai.com)
  - Google Search (https://www.google.com)
  - Custom URL 입력
  - Google Docs (https://docs.google.com)

- **활동 로깅**
  - ChatGPT: 프롬프트 제출 추적
  - Google: 검색어 추적
  - 웹사이트: 방문 URL, 시간 추적
  - 탭 전환 활동

- **로컬 스토리지**
  - JSON 파일 기반 로그 저장 (`logs/actions.json`)

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 앱 실행
```bash
# 일반 실행
npm start

# 개발 모드 (DevTools 포함)
npm run dev
```

## 📁 프로젝트 구조

```
AI_Tracker/
├── main.js              # Electron 메인 프로세스
├── preload.js           # 보안 브리지
├── index.html           # 메인 UI
├── renderer.js          # 렌더러 프로세스 스크립트
├── package.json         # 프로젝트 설정
├── logs/                # 로그 저장 디렉토리
│   └── actions.json     # 활동 로그 파일
└── README.md           # 프로젝트 문서
```

## 📊 로그 형식

각 활동은 다음과 같은 형식으로 저장됩니다:

```json
{
  "timestamp": "2025-01-17T10:12:33.456Z",
  "source": "ChatGPT",
  "action": "prompt_submitted",
  "content": "difference between RL and RLHF..."
}
```

### 지원하는 액션 타입
- `prompt_submitted`: ChatGPT 프롬프트 제출
- `search_submitted`: Google 검색
- `page_loaded`: 페이지 로드
- `navigation_started`: 페이지 네비게이션
- `tab_switched`: 탭 전환
- `url_loaded`: 커스텀 URL 로드

## 🔧 개발

### 개발 모드 실행
```bash
npm run dev
```

개발 모드에서는 DevTools가 자동으로 열리고 콘솔에서 로그를 확인할 수 있습니다.

### 로그 확인
- 앱 내에서 실시간 로그 상태 확인 가능
- `logs/actions.json` 파일에서 저장된 로그 확인
- 개발 모드에서 콘솔에서 로그 출력

## 🎯 향후 계획

### 다음 단계 (MVP 이후)
- [ ] Google Docs API 연동으로 실시간 글쓰기 추적
- [ ] 대시보드 UI로 시각화
- [ ] 연구 경로 시각화
- [ ] 인용 경로 추적
- [ ] 데이터 내보내기 기능

## ⚠️ 주의사항

- ChatGPT와 Google Docs는 로그인이 필요할 수 있습니다
- 일부 웹사이트는 WebView에서 제한적으로 작동할 수 있습니다
- 로그 데이터는 로컬에만 저장되며, 개인정보 보호를 위해 외부로 전송되지 않습니다

## 📝 라이선스

ISC License 