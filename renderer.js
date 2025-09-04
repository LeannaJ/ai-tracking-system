// Global variables (scope issue resolution)
let tabHistory = [];
let currentTab = null;
let lastTabSwitchTime = null;
let userInteracted = false;
let initialLoadComplete = false;
let attributionTracker;

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Check electronAPI availability
    if (!window.electronAPI) {
        console.error('electronAPI is not available!');
        return;
    }
    
    // Initialize attribution tracking
    if (window.AttributionTracker) {
        attributionTracker = new AttributionTracker();
        window.attributionTracker = attributionTracker; // Set as global variable
        console.log('Attribution tracker initialized');
    } else {
        console.warn('AttributionTracker not available');
    }
    
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Set initialization complete after 3 seconds of initial load
    setTimeout(() => {
        initialLoadComplete = true;
        window.initialLoadComplete = true;
        console.log('Initial load complete, logging enabled');
    }, 3000);
    
    // Detect user interaction
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
            
            // Record tab switch history
            const now = new Date();
            if (currentTab) {
                tabHistory.push({
                    from: currentTab,
                    to: targetTab,
                    timestamp: now,
                    timeSinceLastSwitch: lastTabSwitchTime ? now - lastTabSwitchTime : 0
                });
                
                // Limit history size (keep only recent 10 entries)
                if (tabHistory.length > 10) {
                    tabHistory.shift();
                }
            }
            
            currentTab = targetTab;
            lastTabSwitchTime = now;
            
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Activate selected tab
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Log tab switch only after user interaction
            if (userInteracted && initialLoadComplete) {
                logAction('tab_switched', {
                    source: 'UI',
                    action: 'tab_switched',
                    content: `Switched to ${targetTab} tab`,
                    fromTab: currentTab,
                    timestamp: now.toISOString()
                });
                
                // Update real-time debug panel immediately
                setTimeout(updateRealtimeDebugPanel, 100);
            }
        });
    });
    
    // Custom URL loading functionality
    const loadUrlBtn = document.getElementById('loadUrl');
    const customUrlInput = document.getElementById('customUrl');
    const customWebview = document.getElementById('custom-webview');
    
    loadUrlBtn.addEventListener('click', () => {
        const url = customUrlInput.value.trim();
        if (url) {
            customWebview.src = url;
            
            // URL load logging
            logAction('url_loaded', {
                source: 'Custom',
                action: 'url_loaded',
                content: url
            });
        }
    });
    
    // Load URL with Enter key
    customUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadUrlBtn.click();
        }
    });
    
    // Setup WebView event listeners
    console.log('Setting up WebView listeners...');
    setupWebViewListeners();
    
    // Setup ChatGPT interface
    console.log('Setting up ChatGPT interface...');
    setupChatGPTInterface();
    
    // Setup text editor
    console.log('Setting up text editor...');
    setupTextEditor();
    
    // Setup navigation controls (after WebView is ready)
    console.log('Setting up navigation controls...');
    setTimeout(() => {
        setupNavigationControls();
    }, 2000);
    

    
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup debugging panel
    setupDebugPanel(attributionTracker);
    
    // Setup copy tracking listener
    setupCopyTrackingListener(attributionTracker);
});

// Setup WebView event listeners
function setupWebViewListeners() {
    const webviews = document.querySelectorAll('webview');
    
    webviews.forEach(webview => {
        // Page load complete - based on user interaction
        webview.addEventListener('did-finish-load', () => {
            const currentUrl = webview.src;
            const source = getSourceFromWebview(webview);
            
            // Log only after user interaction
            if (window.userInteracted && window.initialLoadComplete) {
                logAction('page_loaded', {
                    source: source,
                    action: 'page_loaded',
                    content: currentUrl
                });
                
                // Add website visit to AttributionTracker (for Google and ChatGPT tabs)
                if ((webview.id === 'google-webview' || webview.id === 'chatgpt-webview') && window.attributionTracker) {
                    // Filter: exclude unnecessary URLs
                    if (!currentUrl.includes('about:blank') && 
                        !currentUrl.includes('recaptcha') &&
                        !currentUrl.includes('google.com/recaptcha')) {
                        
                        // Try to get page title
                        webview.executeJavaScript(`
                            document.title
                        `).then(title => {
                            window.attributionTracker.trackWebsiteVisit(currentUrl, title || '', 0);
                        }).catch(() => {
                            window.attributionTracker.trackWebsiteVisit(currentUrl, '', 0);
                        });
                    }
                }
                
                // Add copy detection functionality (for Google, Custom URL, ChatGPT)
                if (window.attributionTracker && 
                    (webview.id === 'google-webview' || webview.id === 'custom-webview' || webview.id === 'chatgpt-webview')) {
                    
                    // Filter: exclude unnecessary URLs
                    if (!currentUrl.includes('about:blank') && 
                        !currentUrl.includes('recaptcha') &&
                        !currentUrl.includes('google.com/recaptcha')) {
                        
                        // Add copy detection functionality
                        webview.executeJavaScript(`
                            console.log('Setting up copy detection for:', window.location.href);
                            
                            // Add copy event listener
                            document.addEventListener('copy', (e) => {
                                const selection = window.getSelection();
                                const copiedText = selection.toString().trim();
                                
                                if (copiedText) {
                                    console.log('Text copied from webview:', copiedText.substring(0, 50) + '...');
                                    const currentUrl = window.location.href;
                                    const pageTitle = document.title;
                                    
                                    // Send copied text to AttributionTracker
                                    if (window.electronAPI) {
                                        window.electronAPI.trackCopiedText({
                                            text: copiedText,
                                            url: currentUrl,
                                            title: pageTitle,
                                            timestamp: new Date().toISOString(),
                                            copyMethod: 'keyboard'
                                        });
                                    }
                                }
                            });
                            
                            // Detect Ctrl+C via keyboard events
                            document.addEventListener('keydown', (e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                                    setTimeout(() => {
                                        const selection = window.getSelection();
                                        const copiedText = selection.toString().trim();
                                        
                                        if (copiedText) {
                                            console.log('Text copied via Ctrl+C from webview:', copiedText.substring(0, 50) + '...');
                                            if (window.electronAPI) {
                                                window.electronAPI.trackCopiedText({
                                                    text: copiedText,
                                                    url: window.location.href,
                                                    title: document.title,
                                                    timestamp: new Date().toISOString(),
                                                    copyMethod: 'ctrl+c'
                                                });
                                            }
                                        }
                                    }, 100);
                                }
                            });
                            
                            // Setup copy detection after page load completion
                            if (document.readyState === 'complete') {
                                console.log('Page fully loaded, copy detection ready');
                            } else {
                                window.addEventListener('load', () => {
                                    console.log('Page loaded, copy detection ready');
                                });
                            }
                        `);
                    }
                }
            }
        });
        
        // Navigation started - based on user interaction
        webview.addEventListener('did-start-navigation', (e) => {
            const source = getSourceFromWebview(webview);
            const url = e.url;
            
            // Log only after user interaction + filtering
            if (window.userInteracted && window.initialLoadComplete && shouldLogNavigation(url)) {
                logAction('navigation_started', {
                    source: source,
                    action: 'navigation_started',
                    content: url
                });
            }
        });
        
        // ChatGPT prompt tracking and copy detection - WebView specific handling
        if (webview.id === 'chatgpt-webview') {
            // Use did-finish-load instead of dom-ready
            webview.addEventListener('did-finish-load', () => {
                console.log('ChatGPT WebView finished loading, waiting for stability...');
                
                // Safe initialization with longer delay
                setTimeout(() => {
                    try {
                        // Check if WebView is fully ready
                        if (webview.isLoading) {
                            console.log('ChatGPT WebView still loading, skipping setup...');
                            return;
                        }
                        
                        console.log('Attempting to setup ChatGPT WebView...');
                        webview.executeJavaScript(`
                            console.log('ChatGPT WebView setup started...');
                            
                            // 간단한 복사 감지만 먼저 구현
                            document.addEventListener('copy', (e) => {
                                const selection = window.getSelection();
                                const copiedText = selection.toString().trim();
                                
                                if (copiedText) {
                                    console.log('Text copied from ChatGPT:', copiedText.substring(0, 50) + '...');
                                    if (window.electronAPI) {
                                        window.electronAPI.trackCopiedText({
                                            text: copiedText,
                                            url: window.location.href,
                                            title: document.title,
                                            timestamp: new Date().toISOString(),
                                            source: 'ChatGPT',
                                            copyMethod: 'simple'
                                        });
                                    }
                                }
                            });
                            
                            console.log('ChatGPT WebView setup completed');
                        `);
                    } catch (error) {
                        console.error('Error setting up ChatGPT WebView:', error);
                    }
                }, 3000); // 3초 지연으로 안전한 초기화
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
                        const decodedQuery = decodeURIComponent(searchQuery);
                        
                        // 기존 로그 시스템
                        logAction('search_submitted', {
                            source: 'Google',
                            action: 'search_submitted',
                            content: decodedQuery
                        });
                        
                        // AttributionTracker에 검색 활동 추가
                        if (window.attributionTracker) {
                            window.attributionTracker.trackSearch(decodedQuery, url);
                        }
                    }
                }
            });
        }
    });
}

// Setup navigation controls
function setupNavigationControls() {
    // Google WebView navigation
    setupWebViewNavigation('google-webview', 'google-back', 'google-forward', 'google-refresh', 'google-home', 'Google', 'https://www.google.com');
    
    // ChatGPT WebView navigation
    setupWebViewNavigation('chatgpt-webview', 'chatgpt-back', 'chatgpt-forward', 'chatgpt-refresh', 'chatgpt-home', 'ChatGPT', 'https://chat.openai.com');
}

function setupWebViewNavigation(webviewId, backId, forwardId, refreshId, homeId, source, homeUrl) {
    const webview = document.getElementById(webviewId);
    const backBtn = document.getElementById(backId);
    const forwardBtn = document.getElementById(forwardId);
    const refreshBtn = document.getElementById(refreshId);
    const homeBtn = document.getElementById(homeId);

    // Check if WebView is ready
    if (!webview || !backBtn || !forwardBtn || !refreshBtn || !homeBtn) {
        console.error(`Navigation elements not found for ${source}`);
        return;
    }

    // Wait until WebView is ready
    if (!webview.isLoading && webview.src) {
        console.log(`${source} WebView is ready, setting up navigation controls`);
        setupNavigationButtons();
    } else {
        console.log(`${source} WebView not ready, waiting for dom-ready event`);
        webview.addEventListener('dom-ready', () => {
            console.log(`${source} WebView dom-ready, setting up navigation controls`);
            setupNavigationButtons();
        });
    }

    function setupNavigationButtons() {
        // Go back
        backBtn.addEventListener('click', () => {
            if (webview.canGoBack()) {
                webview.goBack();
                logAction('navigation_back', {
                    source: source,
                    action: 'navigation_back',
                    content: 'Go back button clicked'
                });
            }
        });

        // Go forward
        forwardBtn.addEventListener('click', () => {
            if (webview.canGoForward()) {
                webview.goForward();
                logAction('navigation_forward', {
                    source: source,
                    action: 'navigation_forward',
                    content: 'Go forward button clicked'
                });
            }
        });

        // Refresh
        refreshBtn.addEventListener('click', () => {
            webview.reload();
            logAction('navigation_refresh', {
                source: source,
                action: 'navigation_refresh',
                content: 'Refresh button clicked'
            });
        });

        // Go home
        homeBtn.addEventListener('click', () => {
            webview.loadURL(homeUrl);
            logAction('navigation_home', {
                source: source,
                action: 'navigation_home',
                content: 'Home button clicked'
            });
        });

        // Enable/disable buttons based on WebView state
        webview.addEventListener('did-navigate', () => {
            updateNavigationButtons();
        });

        webview.addEventListener('did-navigate-in-page', () => {
            updateNavigationButtons();
        });

        function updateNavigationButtons() {
            try {
                backBtn.disabled = !webview.canGoBack();
                forwardBtn.disabled = !webview.canGoForward();
            } catch (error) {
                console.log(`${source} WebView not ready for navigation buttons update`);
            }
        }

        // Set initial state
        updateNavigationButtons();
    }
}

// URL filtering function
function shouldLogNavigation(url) {
    // Domains to filter
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
    
    // URL patterns to filter
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
        
        // Domain filtering
        for (const domain of filteredDomains) {
            if (urlObj.hostname.includes(domain)) {
                return false;
            }
        }
        
        // Pattern filtering
        for (const pattern of filteredPatterns) {
            if (pattern.test(url)) {
                return false;
            }
        }
        
        return true;
    } catch (e) {
        // Don't log invalid URLs
        return false;
    }
}

// Identify source from WebView
function getSourceFromWebview(webview) {
    switch(webview.id) {
        case 'chatgpt-webview': return 'ChatGPT';
        case 'google-webview': return 'Google';
        case 'custom-webview': return 'Custom';
        default: return 'Unknown';
    }
}

// Estimate paste source function
function estimatePasteSource() {
    const now = new Date();
    const maxTimeWindow = 30000; // Within 30 seconds
    
    // Check if currently on text editor tab
    if (currentTab !== 'docs') {
        return {
            source: 'Unknown',
            confidence: 0,
            timeSinceTabSwitch: 0
        };
    }
    
    // Check recent tab switch history
    if (tabHistory.length === 0) {
        return {
            source: 'Unknown',
            confidence: 0,
            timeSinceTabSwitch: 0
        };
    }
    
    const lastSwitch = tabHistory[tabHistory.length - 1];
    const timeSinceSwitch = now - lastSwitch.timestamp;
    
    // 시간 창을 벗어나면 신뢰도 낮음
    if (timeSinceSwitch > maxTimeWindow) {
        return {
            source: lastSwitch.from,
            confidence: 0.3,
            timeSinceTabSwitch: timeSinceSwitch
        };
    }
    
    // 시간이 가까우면 신뢰도 높음
    let confidence = 1.0 - (timeSinceSwitch / maxTimeWindow);
    
    // 특정 소스에 대한 신뢰도 조정
    switch (lastSwitch.from) {
        case 'chatgpt':
            confidence *= 0.9; // ChatGPT는 복사가 어려우므로 약간 낮춤
            break;
        case 'google':
            confidence *= 1.0; // Google은 일반적으로 높은 신뢰도
            break;
        case 'custom':
            confidence *= 0.8; // Custom URL은 다양하므로 약간 낮춤
            break;
        default:
            confidence *= 0.7;
    }
    
    // 신뢰도 범위 조정 (0.1 ~ 1.0)
    confidence = Math.max(0.1, Math.min(1.0, confidence));
    
    return {
        source: lastSwitch.from,
        confidence: confidence,
        timeSinceTabSwitch: timeSinceSwitch
    };
}

// Store recent logs as global variable
if (!window.recentLogs) {
    window.recentLogs = [];
}

// Save log action
async function logAction(actionType, logData) {
    try {
        const result = await window.electronAPI.saveLog(logData);
        if (result.success) {
            updateLogStatus('Log Saved', false);
            console.log('Log saved:', logData);
            
            // Add to recent logs
            window.recentLogs.push(logData);
            
            // Keep only recent 20 entries
            if (window.recentLogs.length > 20) {
                window.recentLogs.shift();
            }
        } else {
            updateLogStatus('Log Save Failed', true);
            console.error('Log save failed:', result.error);
        }
    } catch (error) {
        updateLogStatus('Log Save Error', true);
        console.error('Log save error:', error);
    }
}

// Update log status
function updateLogStatus(message, isError = false) {
    const logStatus = document.getElementById('logStatus');
    logStatus.textContent = message;
    logStatus.className = isError ? 'log-indicator error' : 'log-indicator';
    
    // Restore original state after 3 seconds
    setTimeout(() => {
        logStatus.textContent = 'Log Ready';
        logStatus.className = 'log-indicator';
    }, 3000);
}

// Update current time
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString('en-US');
}

// ChatGPT WebView setup (API removed)
function setupChatGPTInterface() {
    console.log('setupChatGPTInterface called - WebView only');
    // ChatGPT is now handled by WebView only, no additional setup needed
}

// Setup text editor
function setupTextEditor() {
    console.log('setupTextEditor called');
    
    const textEditor = document.getElementById('textEditor');
    const saveBtn = document.getElementById('saveText');
    const clearBtn = document.getElementById('clearText');
    
    // Get attributionTracker from global scope
    const attributionTracker = window.attributionTracker;
    
    console.log('Found elements:', {
        textEditor: !!textEditor,
        saveBtn: !!saveBtn,
        clearBtn: !!clearBtn
    });
    
    if (!textEditor || !saveBtn || !clearBtn) {
        console.error('Some text editor elements not found!');
        return;
    }
    
    // Load saved text
    loadSavedText();
    
    // Auto save (every 5 seconds)
    let autoSaveInterval;
    let currentParagraph = null;
    
    textEditor.addEventListener('input', () => {
        clearTimeout(autoSaveInterval);
        autoSaveInterval = setTimeout(() => {
            saveText();
        }, 5000);
        
        // 문단 추적
        if (attributionTracker) {
            const content = textEditor.value;
            attributionTracker.updateParagraph(content);
            
            // 문단 끝 감지 (빈 줄로 구분)
            const lines = content.split('\n');
            if (lines.length > 1 && lines[lines.length - 1] === '' && lines[lines.length - 2] === '') {
                attributionTracker.endParagraph();
            }
        }
    });
    
    // Text Editor에서 복사 감지
    textEditor.addEventListener('copy', (e) => {
        const copiedText = textEditor.value.substring(
            textEditor.selectionStart,
            textEditor.selectionEnd
        );
        if (copiedText.trim()) {
            console.log('Text editor copied:', copiedText);
            
            // AttributionTracker에 복사 활동 추가
            if (attributionTracker) {
                attributionTracker.trackActivity('text_editor_copied', {
                    text: copiedText.substring(0, 500),
                    textLength: copiedText.length,
                    copyTime: new Date().toISOString()
                });
            }
        }
    });
    
    // Text Editor에서 붙여넣기 감지 (출처 추정 포함)
    textEditor.addEventListener('paste', (e) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.trim()) {
            console.log('Text editor pasted:', pastedText);
            
            // 출처 추정 로직
            const estimatedSource = estimatePasteSource();
            
            // AttributionTracker에 붙여넣기 활동 추가
            if (attributionTracker) {
                attributionTracker.trackActivity('text_editor_pasted', {
                    text: pastedText.substring(0, 500),
                    textLength: pastedText.length,
                    pasteTime: new Date().toISOString(),
                    estimatedSource: estimatedSource.source,
                    confidence: estimatedSource.confidence,
                    timeSinceTabSwitch: estimatedSource.timeSinceTabSwitch
                });
            }
            
            // 로그에도 출처 정보 추가
            logAction('text_pasted', {
                source: 'TextEditor',
                action: 'text_pasted',
                content: pastedText.substring(0, 200) + (pastedText.length > 200 ? '...' : ''),
                estimatedSource: estimatedSource.source,
                confidence: estimatedSource.confidence,
                timeSinceTabSwitch: estimatedSource.timeSinceTabSwitch
            });
            
            // 실시간 디버그 패널 즉시 업데이트
            setTimeout(updateRealtimeDebugPanel, 100);
        }
    });
    
    // 저장 버튼
    saveBtn.addEventListener('click', () => {
        saveText();
        updateLogStatus('Text saved', false);
    });
    
    // 클리어 버튼
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all text?')) {
            textEditor.value = '';
            saveText();
            updateLogStatus('Text cleared', false);
        }
    });
    
    function saveText() {
        const text = textEditor.value;
        localStorage.setItem('savedText', text);
        
        // 로그 저장
        logAction('text_saved', {
            source: 'Text Editor',
            action: 'text_saved',
            content: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            text_length: text.length
        });
    }
    
    function loadSavedText() {
        const savedText = localStorage.getItem('savedText');
        if (savedText) {
            textEditor.value = savedText;
        }
    }
}



// 디버깅 패널 설정
function setupDebugPanel(attributionTracker) {
    const debugToggle = document.getElementById('debugToggle');
    const debugPanel = document.getElementById('debugPanel');
    const debugContent = document.getElementById('debugContent');
    
    if (!debugToggle || !debugPanel || !debugContent) {
        console.warn('Debug panel elements not found');
        return;
    }
    
    // 토글 버튼 클릭
    debugToggle.addEventListener('click', () => {
        if (debugPanel.style.display === 'none') {
            debugPanel.style.display = 'block';
            updateDebugContent();
        } else {
            debugPanel.style.display = 'none';
        }
    });
    
    // 디버그 내용 업데이트
    function updateDebugContent() {
        if (!attributionTracker) {
            debugContent.innerHTML = '<div>AttributionTracker not available</div>';
            return;
        }
        
        const stats = attributionTracker.getStatistics();
        const recentActivities = attributionTracker.getAllActivities().slice(-5);
        const recentParagraphs = attributionTracker.getAllParagraphs().slice(-3);
        
        let html = `
            <div class="attribution-debug-item">
                <strong>📊 통계</strong><br>
                문단: ${stats.totalParagraphs} | 활동: ${stats.totalActivities}<br>
                단어: ${stats.totalWords} | 문자: ${stats.totalCharacters}
            </div>
        `;
        
        // 최근 활동
        if (recentActivities.length > 0) {
            html += '<div class="attribution-debug-item"><strong>🕒 최근 활동</strong></div>';
            recentActivities.forEach(activity => {
                html += `
                    <div class="attribution-debug-item">
                        <strong>${activity.type}</strong><br>
                        ${activity.localTime}<br>
                        ${activity.data.prompt ? activity.data.prompt.substring(0, 50) + '...' : 
                          activity.data.query ? activity.data.query : 
                          activity.data.url ? activity.data.url : 
                          activity.data.text ? activity.data.text.substring(0, 50) + '...' : '데이터 없음'}
                        ${activity.data.estimatedSource ? `<br>출처: ${activity.data.estimatedSource} (${Math.round(activity.data.confidence * 100)}% 신뢰도)` : ''}
                    </div>
                `;
            });
        }
        
        // 탭 히스토리
        if (tabHistory && tabHistory.length > 0) {
            html += '<div class="attribution-debug-item"><strong>🔄 탭 전환 히스토리</strong></div>';
            tabHistory.slice(-3).forEach((switch_, index) => {
                const timeAgo = Math.round((Date.now() - switch_.timestamp) / 1000);
                html += `
                    <div class="attribution-debug-item">
                        <strong>${switch_.from} → ${switch_.to}</strong><br>
                        ${timeAgo}초 전
                    </div>
                `;
            });
        }
        
        // 현재 상태
        html += '<div class="attribution-debug-item"><strong>📊 현재 상태</strong></div>';
        html += `<div class="attribution-debug-item">현재 탭: <strong>${currentTab || 'None'}</strong></div>`;
        if (lastTabSwitchTime) {
            const timeSinceLastSwitch = Math.round((Date.now() - lastTabSwitchTime) / 1000);
            html += `<div class="attribution-debug-item">마지막 전환 후: <strong>${timeSinceLastSwitch}초</strong></div>`;
        }
        
        // 최근 문단
        if (recentParagraphs.length > 0) {
            html += '<div class="attribution-debug-item"><strong>📝 최근 문단</strong></div>';
            recentParagraphs.forEach(para => {
                html += `
                    <div class="attribution-debug-item">
                        <strong>문단 ${para.id.split('_')[1]}</strong><br>
                        단어: ${para.wordCount} | 출처: ${para.sources.length}개<br>
                        ${para.content.substring(0, 100)}...
                    </div>
                `;
            });
        }
        
        debugContent.innerHTML = html;
    }
    
    // 5초마다 디버그 내용 업데이트
    setInterval(updateDebugContent, 5000);
    
    // Update real-time debug panel as well
    setInterval(updateRealtimeDebugPanel, 2000);
}

// Update real-time debug panel function
function updateRealtimeDebugPanel() {
    const now = new Date();
    const timeSinceLastSwitch = lastTabSwitchTime ? now - lastTabSwitchTime : 0;
    
    // Update current status
    const currentTabDisplay = document.getElementById('currentTabDisplay');
    const lastSwitchDisplay = document.getElementById('lastSwitchDisplay');
    const timeElapsedDisplay = document.getElementById('timeElapsedDisplay');
    
    if (currentTabDisplay) {
        currentTabDisplay.textContent = currentTab || '-';
    }
    
    if (lastSwitchDisplay) {
        lastSwitchDisplay.textContent = lastTabSwitchTime ? 
            lastTabSwitchTime.toLocaleTimeString() : '-';
    }
    
    if (timeElapsedDisplay) {
        timeElapsedDisplay.textContent = `${Math.round(timeSinceLastSwitch / 1000)}s`;
    }
    
    // Update tab switch history
    const tabHistoryDisplay = document.getElementById('tabHistoryDisplay');
    if (tabHistoryDisplay) {
        if (tabHistory.length === 0) {
            tabHistoryDisplay.innerHTML = '<div class="no-data">No switch history</div>';
        } else {
            const recentHistory = tabHistory.slice(-5).reverse();
            let historyHTML = '';
            
            recentHistory.forEach(entry => {
                const timeAgo = Math.round((now - entry.timestamp) / 1000);
                historyHTML += `
                    <div class="tab-history-item">
                        <span class="from-to">${entry.from} → ${entry.to}</span>
                        <span class="time">${timeAgo}s ago</span>
                    </div>
                `;
            });
            
            tabHistoryDisplay.innerHTML = historyHTML;
        }
    }
    
    // Update recent pastes
    const recentPasteDisplay = document.getElementById('recentPasteDisplay');
    if (recentPasteDisplay) {
        const recentPastes = window.recentLogs ? window.recentLogs.filter(log => 
            log.action === 'text_pasted'
        ).slice(-5) : [];
        
        if (recentPastes.length === 0) {
            recentPasteDisplay.innerHTML = '<div class="no-data">No paste history</div>';
        } else {
            let pasteHTML = '';
            
            // Display recent 5 in reverse order (newest first)
            recentPastes.reverse().forEach((paste, index) => {
                const estimatedSource = paste.estimatedSource || 'Unknown';
                const confidence = paste.confidence || 0;
                const timeSinceTabSwitch = paste.timeSinceTabSwitch || 0;
                const pasteTime = paste.timestamp ? new Date(paste.timestamp).toLocaleTimeString() : '';
                
                pasteHTML += `
                    <div class="paste-item" style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #007bff;">
                        <div class="source" style="font-weight: 600; color: #007bff; margin-bottom: 4px;">
                            ${estimatedSource} (${Math.round(confidence * 100)}% confidence)
                        </div>
                        <div class="content" style="color: #495057; font-size: 11px; line-height: 1.3; margin-bottom: 4px;">
                            ${paste.content ? paste.content.substring(0, 80) + (paste.content.length > 80 ? '...' : '') : 'No content'}
                        </div>
                        <div class="meta" style="font-size: 10px; color: #6c757d;">
                            ${Math.round(timeSinceTabSwitch / 1000)}s after switch | ${pasteTime}
                        </div>
                    </div>
                `;
            });
            
            recentPasteDisplay.innerHTML = pasteHTML;
        }
    }
}

// 복사 추적 리스너 설정
function setupCopyTrackingListener(attributionTracker) {
    if (!window.electronAPI || !attributionTracker) {
        console.warn('Copy tracking not available');
        return;
    }
    
    // IPC를 통해 복사된 텍스트 추적 받기
    window.electronAPI.on('track-copied-text-to-attribution', (data) => {
        console.log('Copy tracking received:', data);
        attributionTracker.trackCopiedText(data.text, data.url, data.title);
    });
}

// 개발 모드에서 추가 디버깅
if (window.electronAPI && window.electronAPI.isDev) {
    console.log('Running in development mode');
    
    // 모든 로그 확인
    window.electronAPI.loadLogs().then(logs => {
        console.log('Saved logs:', logs);
    });
} 