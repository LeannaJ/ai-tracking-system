// 탭 전환 기능
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 사용자 상호작용 추적
    let userInteracted = false;
    let initialLoadComplete = false;
    
    // 초기 로드 완료 후 3초 뒤에 초기화 완료로 설정
    setTimeout(() => {
        initialLoadComplete = true;
        window.initialLoadComplete = true;
        console.log('Initial load complete, logging enabled');
    }, 3000);
    
    // 사용자 상호작용 감지
    document.addEventListener('click', () => {
        if (!userInteracted) {
            userInteracted = true;
            window.userInteracted = true;
            console.log('User interaction detected');
        }
    });
    
    document.addEventListener('keydown', () => {
        if (!userInteracted) {
            userInteracted = true;
            window.userInteracted = true;
            console.log('User interaction detected');
        }
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // 모든 탭 비활성화
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택된 탭 활성화
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // 사용자 상호작용 후에만 탭 전환 로그
            if (userInteracted && initialLoadComplete) {
                logAction('tab_switched', {
                    source: 'UI',
                    action: 'tab_switched',
                    content: `Switched to ${targetTab} tab`
                });
            }
        });
    });
    
    // 커스텀 URL 로드 기능
    const loadUrlBtn = document.getElementById('loadUrl');
    const customUrlInput = document.getElementById('customUrl');
    const customWebview = document.getElementById('custom-webview');
    
    loadUrlBtn.addEventListener('click', () => {
        const url = customUrlInput.value.trim();
        if (url) {
            customWebview.src = url;
            
            // URL 로드 로그
            logAction('url_loaded', {
                source: 'Custom',
                action: 'url_loaded',
                content: url
            });
        }
    });
    
    // Enter 키로 URL 로드
    customUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadUrlBtn.click();
        }
    });
    
    // WebView 이벤트 리스너 설정
    setupWebViewListeners();
    
    // 네비게이션 컨트롤 설정
    setupNavigationControls();
    
    // 시간 업데이트
    updateTime();
    setInterval(updateTime, 1000);
});

// WebView 이벤트 리스너 설정
function setupWebViewListeners() {
    const webviews = document.querySelectorAll('webview');
    
    webviews.forEach(webview => {
        // 페이지 로드 완료 - 사용자 상호작용 기반
        webview.addEventListener('did-finish-load', () => {
            const currentUrl = webview.src;
            const source = getSourceFromWebview(webview);
            
            // 사용자 상호작용 후에만 로그
            if (window.userInteracted && window.initialLoadComplete) {
                logAction('page_loaded', {
                    source: source,
                    action: 'page_loaded',
                    content: currentUrl
                });
            }
        });
        
        // 네비게이션 시작 - 사용자 상호작용 기반
        webview.addEventListener('did-start-navigation', (e) => {
            const source = getSourceFromWebview(webview);
            const url = e.url;
            
            // 사용자 상호작용 후에만 로그 + 필터링
            if (window.userInteracted && window.initialLoadComplete && shouldLogNavigation(url)) {
                logAction('navigation_started', {
                    source: source,
                    action: 'navigation_started',
                    content: url
                });
            }
        });
        
        // ChatGPT 프롬프트 추적 - 개선된 방법
        if (webview.id === 'chatgpt-webview') {
            webview.addEventListener('dom-ready', () => {
                webview.executeJavaScript(`
                    console.log('ChatGPT DOM ready, setting up prompt detection...');
                    
                    function setupPromptDetection() {
                        // 여러 방법으로 프롬프트 감지
                        
                        // 방법 1: 전송 버튼 감지
                        const sendButtons = document.querySelectorAll('button[data-testid="send-button"], button[aria-label*="Send"], button[title*="Send"], button:has(svg)');
                        
                        sendButtons.forEach(button => {
                            if (!button.dataset.tracked) {
                                button.dataset.tracked = 'true';
                                console.log('Found send button:', button);
                                
                                button.addEventListener('click', (e) => {
                                    console.log('Send button clicked');
                                    
                                    // 프롬프트 내용 가져오기 - 여러 방법 시도
                                    let promptText = '';
                                    
                                    // 방법 1: textarea
                                    const textarea = document.querySelector('textarea[data-id="root"], textarea[placeholder*="Message"], textarea[placeholder*="Send a message"]');
                                    if (textarea && textarea.value.trim()) {
                                        promptText = textarea.value.trim();
                                    }
                                    
                                    // 방법 2: contenteditable div
                                    if (!promptText) {
                                        const editableDiv = document.querySelector('[contenteditable="true"]');
                                        if (editableDiv && editableDiv.textContent.trim()) {
                                            promptText = editableDiv.textContent.trim();
                                        }
                                    }
                                    
                                    // 방법 3: input field
                                    if (!promptText) {
                                        const input = document.querySelector('input[type="text"], input[placeholder*="Message"]');
                                        if (input && input.value.trim()) {
                                            promptText = input.value.trim();
                                        }
                                    }
                                    
                                    if (promptText) {
                                        console.log('Prompt detected:', promptText.substring(0, 50) + '...');
                                        window.electronAPI.saveLog({
                                            source: 'ChatGPT',
                                            action: 'prompt_submitted',
                                            content: promptText.substring(0, 200) + (promptText.length > 200 ? '...' : '')
                                        });
                                    }
                                });
                            }
                        });
                        
                        // 방법 2: Enter 키 감지
                        const textAreas = document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]');
                        textAreas.forEach(element => {
                            if (!element.dataset.tracked) {
                                element.dataset.tracked = 'true';
                                console.log('Found input element:', element);
                                
                                element.addEventListener('keypress', (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        console.log('Enter key pressed');
                                        
                                        let promptText = '';
                                        if (element.value) {
                                            promptText = element.value.trim();
                                        } else if (element.textContent) {
                                            promptText = element.textContent.trim();
                                        }
                                        
                                        if (promptText) {
                                            console.log('Prompt via Enter:', promptText.substring(0, 50) + '...');
                                            window.electronAPI.saveLog({
                                                source: 'ChatGPT',
                                                action: 'prompt_submitted',
                                                content: promptText.substring(0, 200) + (promptText.length > 200 ? '...' : '')
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                    
                    // 초기 설정
                    setupPromptDetection();
                    
                    // DOM 변경 감지
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList') {
                                setupPromptDetection();
                            }
                        });
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                `);
            });
        }
        
        // Google 검색 감지 - URL 기반 방법
        if (webview.id === 'google-webview') {
            // URL 변경 감지로 검색어 추출
            webview.addEventListener('did-navigate', (e) => {
                const url = e.url;
                if (url.includes('google.com/search')) {
                    const urlParams = new URLSearchParams(url.split('?')[1]);
                    const searchQuery = urlParams.get('q');
                    if (searchQuery) {
                        logAction('search_submitted', {
                            source: 'Google',
                            action: 'search_submitted',
                            content: decodeURIComponent(searchQuery)
                        });
                    }
                }
            });
        }
    });
}

// 네비게이션 컨트롤 설정
function setupNavigationControls() {
    const googleWebview = document.getElementById('google-webview');
    const backBtn = document.getElementById('google-back');
    const forwardBtn = document.getElementById('google-forward');
    const refreshBtn = document.getElementById('google-refresh');
    const homeBtn = document.getElementById('google-home');

    // 뒤로 가기
    backBtn.addEventListener('click', () => {
        if (googleWebview.canGoBack()) {
            googleWebview.goBack();
            logAction('navigation_back', {
                source: 'Google',
                action: 'navigation_back',
                content: 'Go back button clicked'
            });
        }
    });

    // 앞으로 가기
    forwardBtn.addEventListener('click', () => {
        if (googleWebview.canGoForward()) {
            googleWebview.goForward();
            logAction('navigation_forward', {
                source: 'Google',
                action: 'navigation_forward',
                content: 'Go forward button clicked'
            });
        }
    });

    // 새로고침
    refreshBtn.addEventListener('click', () => {
        googleWebview.reload();
        logAction('navigation_refresh', {
            source: 'Google',
            action: 'navigation_refresh',
            content: 'Refresh button clicked'
        });
    });

    // 홈으로 가기
    homeBtn.addEventListener('click', () => {
        googleWebview.loadURL('https://www.google.com');
        logAction('navigation_home', {
            source: 'Google',
            action: 'navigation_home',
            content: 'Home button clicked'
        });
    });

    // WebView 상태에 따라 버튼 활성화/비활성화
    googleWebview.addEventListener('did-navigate', () => {
        updateNavigationButtons();
    });

    googleWebview.addEventListener('did-navigate-in-page', () => {
        updateNavigationButtons();
    });

    function updateNavigationButtons() {
        backBtn.disabled = !googleWebview.canGoBack();
        forwardBtn.disabled = !googleWebview.canGoForward();
    }

    // 초기 상태 설정
    updateNavigationButtons();
}

// URL 필터링 함수
function shouldLogNavigation(url) {
    // 필터링할 도메인들
    const filteredDomains = [
        'doubleclick.net',
        'googleadservices.com',
        'googlesyndication.com',
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com',
        'facebook.net',
        'fbcdn.net',
        'twitter.com',
        't.co',
        'linkedin.com',
        'adnxs.com',
        'adsrvr.org',
        'rubiconproject.com',
        'amazon-adsystem.com',
        'criteo.com',
        'outbrain.com',
        'taboola.com',
        'about:blank',
        'about:srcdoc'
    ];
    
    // 필터링할 URL 패턴들
    const filteredPatterns = [
        /\/pixel\?/,
        /\/track\?/,
        /\/analytics\?/,
        /\/ads\?/,
        /\/ad\?/,
        /\/beacon\?/,
        /\/collect\?/,
        /\/log\?/,
        /\/stats\?/,
        /\/metrics\?/
    ];
    
    try {
        const urlObj = new URL(url);
        
        // 도메인 필터링
        for (const domain of filteredDomains) {
            if (urlObj.hostname.includes(domain)) {
                return false;
            }
        }
        
        // 패턴 필터링
        for (const pattern of filteredPatterns) {
            if (pattern.test(url)) {
                return false;
            }
        }
        
        return true;
    } catch (e) {
        // 잘못된 URL은 로그하지 않음
        return false;
    }
}

// WebView에서 소스 식별
function getSourceFromWebview(webview) {
    switch(webview.id) {
        case 'chatgpt-webview': return 'ChatGPT';
        case 'google-webview': return 'Google';
        case 'docs-webview': return 'Google Docs';
        case 'custom-webview': return 'Custom';
        default: return 'Unknown';
    }
}

// 로그 액션 저장
async function logAction(actionType, logData) {
    try {
        const result = await window.electronAPI.saveLog(logData);
        if (result.success) {
            updateLogStatus('Log Saved', false);
            console.log('Log saved:', logData);
        } else {
            updateLogStatus('Log Save Failed', true);
            console.error('Log save failed:', result.error);
        }
    } catch (error) {
        updateLogStatus('Log Save Error', true);
        console.error('Log save error:', error);
    }
}

// 로그 상태 업데이트
function updateLogStatus(message, isError = false) {
    const logStatus = document.getElementById('logStatus');
    logStatus.textContent = message;
    logStatus.className = isError ? 'log-indicator error' : 'log-indicator';
    
    // 3초 후 원래 상태로 복원
    setTimeout(() => {
        logStatus.textContent = 'Log Ready';
        logStatus.className = 'log-indicator';
    }, 3000);
}

// 현재 시간 업데이트
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString('en-US');
}

// 개발 모드에서 추가 디버깅
if (window.electronAPI.isDev) {
    console.log('Running in development mode');
    
    // 모든 로그 확인
    window.electronAPI.loadLogs().then(logs => {
        console.log('Saved logs:', logs);
    });
} 