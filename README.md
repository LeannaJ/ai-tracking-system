# 🤖 AI Research Tracker

A desktop application built with ElectronJS that tracks the research and writing process from start to finish.

## 🚀 Features

### MVP Features
- **Multi-tab WebView Interface**
  - ChatGPT (https://chat.openai.com)
  - Google Search (https://www.google.com)
  - Custom URL input
  - Google Docs (https://docs.google.com)

- **Activity Logging**
  - ChatGPT: Prompt submission tracking
  - Google: Search query tracking
  - Websites: URL visits and time tracking
  - Tab switching activities

- **Local Storage**
  - JSON file-based log storage (`logs/actions.json`)

## 📦 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
# Normal execution
npm start

# Development mode (with DevTools)
npm run dev
```

## 📁 Project Structure

```
AI_Tracker/
├── main.js              # Electron main process
├── preload.js           # Security bridge
├── index.html           # Main UI
├── renderer.js          # Renderer process script
├── package.json         # Project configuration
├── logs/                # Log storage directory
│   └── actions.json     # Activity log file
└── README.md           # Project documentation
```

## 📊 Log Format

Each activity is stored in the following format:

```json
{
  "timestamp": "2025-01-17T10:12:33.456Z",
  "source": "ChatGPT",
  "action": "prompt_submitted",
  "content": "difference between RL and RLHF..."
}
```

### Supported Action Types
- `prompt_submitted`: ChatGPT prompt submission
- `search_submitted`: Google search
- `page_loaded`: Page load
- `navigation_started`: Page navigation
- `tab_switched`: Tab switching
- `url_loaded`: Custom URL load

## 🔧 Development

### Run in Development Mode
```bash
npm run dev
```

In development mode, DevTools will automatically open and you can check logs in the console.

### Log Monitoring
- Real-time log status checking within the app
- View saved logs in `logs/actions.json` file
- Log output in console during development mode

## 🎯 Future Plans

### Next Steps (Post-MVP)
- [ ] Google Docs API integration for real-time writing tracking
- [ ] Dashboard UI for visualization
- [ ] Research path visualization
- [ ] Citation path tracking
- [ ] Data export functionality

## ⚠️ Important Notes

- ChatGPT and Google Docs may require login
- Some websites may have limited functionality in WebView
- Log data is stored locally only and is not transmitted externally for privacy protection

## 📝 License

ISC License 