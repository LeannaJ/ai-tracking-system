/**
 * Attribution-aware Writing Assistant
 * 출처 기반 작성 어시스턴트 - 기본 추적 모듈
 */

class AttributionTracker {
    constructor() {
        this.currentParagraph = null;
        this.activities = [];
        this.paragraphs = [];
        this.isTracking = false;
        this.lastActivityTime = null;
        
        // 로컬 스토리지 키
        this.ACTIVITIES_KEY = 'attribution_activities';
        this.PARAGRAPHS_KEY = 'attribution_paragraphs';
        
        // 초기화
        this.loadData();
        this.startTracking();
        
        console.log('AttributionTracker initialized');
    }
    
    /**
     * 추적 시작
     */
    startTracking() {
        this.isTracking = true;
        console.log('Attribution tracking started');
    }
    
    /**
     * 추적 중지
     */
    stopTracking() {
        this.isTracking = false;
        console.log('Attribution tracking stopped');
    }
    
    /**
     * 실시간 활동 추적
     * @param {string} type - 활동 타입 (chatgpt_prompt, search, website_visit 등)
     * @param {object} data - 활동 데이터
     */
    trackActivity(type, data) {
        if (!this.isTracking) return;
        
        const activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: new Date().toISOString(),
            localTime: new Date().toLocaleString('ko-KR'),
            data
        };
        
        this.activities.push(activity);
        this.lastActivityTime = new Date();
        
        console.log(`Activity tracked: ${type}`, activity);
        this.saveActivities();
        
        return activity;
    }
    
    /**
     * ChatGPT 프롬프트 추적
     * @param {string} prompt - 사용자 프롬프트
     * @param {string} response - AI 응답
     * @param {string} model - 사용된 모델
     */
    trackChatGPTPrompt(prompt, response, model = 'GPT-4') {
        return this.trackActivity('chatgpt_prompt', {
            prompt: prompt.substring(0, 500), // 길이 제한
            response: response.substring(0, 1000), // 길이 제한
            model,
            promptLength: prompt.length,
            responseLength: response.length
        });
    }
    
    /**
     * 검색 활동 추적
     * @param {string} query - 검색어
     * @param {string} url - 클릭한 URL (선택사항)
     */
    trackSearch(query, url = null) {
        return this.trackActivity('search', {
            query: query.substring(0, 200),
            clickedUrl: url,
            searchTime: new Date().toISOString()
        });
    }
    
    /**
     * 웹사이트 방문 추적
     * @param {string} url - 방문한 URL
     * @param {string} title - 페이지 제목
     * @param {number} duration - 체류 시간(초)
     */
    trackWebsiteVisit(url, title = '', duration = 0) {
        return this.trackActivity('website_visit', {
            url,
            title: title.substring(0, 100),
            duration,
            visitTime: new Date().toISOString()
        });
    }
    
    /**
     * 복사된 텍스트 추적
     * @param {string} text - 복사된 텍스트
     * @param {string} url - 복사한 페이지 URL
     * @param {string} title - 페이지 제목
     */
    trackCopiedText(text, url, title = '') {
        return this.trackActivity('text_copied', {
            text: text.substring(0, 500), // 길이 제한
            url,
            title: title.substring(0, 100),
            textLength: text.length,
            copyTime: new Date().toISOString()
        });
    }
    
    /**
     * 문단 작성 시작
     * @param {string} initialContent - 초기 내용 (선택사항)
     */
    startParagraph(initialContent = '') {
        this.currentParagraph = {
            id: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: initialContent,
            startTime: new Date().toISOString(),
            endTime: null,
            sources: [],
            wordCount: 0,
            characterCount: 0
        };
        
        console.log('Paragraph started:', this.currentParagraph.id);
        return this.currentParagraph;
    }
    
    /**
     * 문단 내용 업데이트
     * @param {string} content - 현재 문단 내용
     */
    updateParagraph(content) {
        if (!this.currentParagraph) {
            this.startParagraph(content);
        } else {
            this.currentParagraph.content = content;
            this.currentParagraph.wordCount = this.countWords(content);
            this.currentParagraph.characterCount = content.length;
        }
    }
    
    /**
     * 문단 작성 종료
     */
    endParagraph() {
        if (!this.currentParagraph) return null;
        
        this.currentParagraph.endTime = new Date().toISOString();
        
        // 직전 15분간의 활동을 출처로 연결
        const recentActivities = this.getRecentActivities(15);
        this.currentParagraph.sources = recentActivities;
        
        // 문단 정보 추가
        this.currentParagraph.duration = this.calculateDuration(
            this.currentParagraph.startTime,
            this.currentParagraph.endTime
        );
        
        this.paragraphs.push(this.currentParagraph);
        this.saveParagraphs();
        
        console.log('Paragraph ended:', this.currentParagraph.id, {
            wordCount: this.currentParagraph.wordCount,
            sources: this.currentParagraph.sources.length
        });
        
        const completedParagraph = this.currentParagraph;
        this.currentParagraph = null;
        
        return completedParagraph;
    }
    
    /**
     * 최근 활동 가져오기
     * @param {number} minutes - 몇 분 전까지의 활동을 가져올지
     * @returns {Array} 활동 배열
     */
    getRecentActivities(minutes = 15) {
        const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
        
        return this.activities.filter(activity => {
            const activityTime = new Date(activity.timestamp);
            return activityTime >= cutoffTime;
        });
    }
    
    /**
     * 특정 문단 가져오기
     * @param {string} paragraphId - 문단 ID
     * @returns {object|null} 문단 객체
     */
    getParagraph(paragraphId) {
        return this.paragraphs.find(p => p.id === paragraphId) || null;
    }
    
    /**
     * 모든 문단 가져오기
     * @returns {Array} 문단 배열
     */
    getAllParagraphs() {
        return this.paragraphs;
    }
    
    /**
     * 모든 활동 가져오기
     * @returns {Array} 활동 배열
     */
    getAllActivities() {
        return this.activities;
    }
    
    /**
     * 단어 수 계산
     * @param {string} text - 텍스트
     * @returns {number} 단어 수
     */
    countWords(text) {
        if (!text || text.trim() === '') return 0;
        return text.trim().split(/\s+/).length;
    }
    
    /**
     * 시간 차이 계산 (분 단위)
     * @param {string} startTime - 시작 시간
     * @param {string} endTime - 종료 시간
     * @returns {number} 분 단위 차이
     */
    calculateDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        return Math.round((end - start) / (1000 * 60));
    }
    
    /**
     * 활동 데이터 저장
     */
    saveActivities() {
        try {
            localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(this.activities));
        } catch (error) {
            console.error('Failed to save activities:', error);
        }
    }
    
    /**
     * 문단 데이터 저장
     */
    saveParagraphs() {
        try {
            localStorage.setItem(this.PARAGRAPHS_KEY, JSON.stringify(this.paragraphs));
        } catch (error) {
            console.error('Failed to save paragraphs:', error);
        }
    }
    
    /**
     * 저장된 데이터 로드
     */
    loadData() {
        try {
            const activitiesData = localStorage.getItem(this.ACTIVITIES_KEY);
            if (activitiesData) {
                this.activities = JSON.parse(activitiesData);
            }
            
            const paragraphsData = localStorage.getItem(this.PARAGRAPHS_KEY);
            if (paragraphsData) {
                this.paragraphs = JSON.parse(paragraphsData);
            }
            
            console.log(`Loaded ${this.activities.length} activities and ${this.paragraphs.length} paragraphs`);
        } catch (error) {
            console.error('Failed to load attribution data:', error);
        }
    }
    
    /**
     * 모든 데이터 삭제
     */
    clearAllData() {
        this.activities = [];
        this.paragraphs = [];
        this.currentParagraph = null;
        
        localStorage.removeItem(this.ACTIVITIES_KEY);
        localStorage.removeItem(this.PARAGRAPHS_KEY);
        
        console.log('All attribution data cleared');
    }
    
    /**
     * 통계 정보 가져오기
     * @returns {object} 통계 정보
     */
    getStatistics() {
        const totalParagraphs = this.paragraphs.length;
        const totalActivities = this.activities.length;
        
        const sourceTypes = {};
        this.activities.forEach(activity => {
            sourceTypes[activity.type] = (sourceTypes[activity.type] || 0) + 1;
        });
        
        const totalWords = this.paragraphs.reduce((sum, para) => sum + para.wordCount, 0);
        const totalCharacters = this.paragraphs.reduce((sum, para) => sum + para.characterCount, 0);
        
        return {
            totalParagraphs,
            totalActivities,
            totalWords,
            totalCharacters,
            sourceTypes,
            averageWordsPerParagraph: totalParagraphs > 0 ? Math.round(totalWords / totalParagraphs) : 0
        };
    }
}

// 전역 인스턴스 생성
window.AttributionTracker = AttributionTracker; 