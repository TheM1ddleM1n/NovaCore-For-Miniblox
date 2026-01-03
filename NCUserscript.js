// ==UserScript==
// @name         NovaCore V3 Enhanced (Optimized)
// @namespace    http://github.com/TheM1ddleM1n/
// @version      3.1
// @description  NovaCore V3 with optimized performance, zero lag, improved memory management
// @author       (Cant reveal who im), TheM1ddleM1n
// @match        https://miniblox.io/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TIMING = {
        INTRO_CHECK_APPEAR: 900,
        INTRO_BUTTON_EXIT: 3200,
        INTRO_TEXT_START: 4000,
        INTRO_CHECKMARK_APPEAR: 6300,
        INTRO_TOTAL_DURATION: 7000,
        INTRO_FADE_OUT: 1000,
        HINT_TEXT_DURATION: 4000,
        FPS_UPDATE_INTERVAL: 500, // Reduced from 1000 (update every 500ms instead)
        CPS_UPDATE_INTERVAL: 250, // Reduced from 100
        CPS_WINDOW: 1000,
        SAVE_DEBOUNCE: 1000, // Increased from 500 (save less frequently)
        STATS_UPDATE_INTERVAL: 5000 // Increased from 1000 (batch stats updates)
    };

    const THEMES = {
        cyan: { name: 'Cyan (Default)', primary: '#00ffff', primaryRgb: '0, 255, 255', shadow: '#00ffff' },
        purple: { name: 'Purple Dream', primary: '#9b59b6', primaryRgb: '155, 89, 182', shadow: '#9b59b6' },
        green: { name: 'Matrix Green', primary: '#2ecc71', primaryRgb: '46, 204, 113', shadow: '#2ecc71' },
        red: { name: 'Crimson Fire', primary: '#e74c3c', primaryRgb: '231, 76, 60', shadow: '#e74c3c' },
        blue: { name: 'Ocean Blue', primary: '#3498db', primaryRgb: '52, 152, 219', shadow: '#3498db' },
        gold: { name: 'Golden Glow', primary: '#f39c12', primaryRgb: '243, 156, 18', shadow: '#f39c12' },
        pink: { name: 'Bubblegum Pink', primary: '#ff69b4', primaryRgb: '255, 105, 180', shadow: '#ff69b4' },
        orange: { name: 'Sunset Orange', primary: '#ff6b35', primaryRgb: '255, 107, 53', shadow: '#ff6b35' },
        custom: { name: 'Custom', primary: '#00ffff', primaryRgb: '0, 255, 255', shadow: '#00ffff' }
    };

    const SETTINGS_KEY = 'novacore_settings';
    const DEFAULT_MENU_KEY = '\\';
    const SESSION_START_KEY = 'novacore_session_start';
    const SESSION_ID_KEY = 'novacore_session_id';
    const SESSION_STATS_KEY = 'novacore_session_stats';
    const SESSION_COUNT_KEY = 'novacore_session_count';
    const CUSTOM_COLOR_KEY = 'novacore_custom_color';
    const SCRIPT_VERSION = '3.1';
    const GITHUB_REPO = 'TheM1ddleM1n/NovaCoreForMiniblox';
    const LAST_UPDATE_CHECK_KEY = 'novacore_last_update_check';
    const UPDATE_CHECK_INTERVAL = 3600000;

    // Optimized circuit breaker
    const circuitBreaker = {
        failures: new Map(),
        threshold: 5, // Increased threshold to prevent false positives
        resetTime: 120000, // Doubled reset time

        record(context) {
            const count = (this.failures.get(context) || 0) + 1;
            this.failures.set(context, count);
            if (count >= this.threshold) {
                console.warn(`[NovaCore] Circuit breaker triggered for ${context}`);
                setTimeout(() => {
                    this.failures.delete(context);
                    console.log(`[NovaCore] Circuit breaker reset for ${context}`);
                }, this.resetTime);
                return true;
            }
            return false;
        },

        isOpen(context) {
            return (this.failures.get(context) || 0) >= this.threshold;
        }
    };

    // Optimized state with object pooling
    const stateData = {
        fpsShown: false, cpsShown: false, realTimeShown: false, sessionTimerShown: false,
        antiAfkEnabled: false, menuKey: DEFAULT_MENU_KEY, currentTheme: 'cyan',
        counters: { fps: null, cps: null, realTime: null, sessionTimer: null, antiAfk: null },
        intervals: { fps: null, cps: null, realTime: null, sessionTimer: null, antiAfk: null, statsUpdate: null },
        drag: {
            fps: { active: false, offsetX: 0, offsetY: 0 },
            cps: { active: false, offsetX: 0, offsetY: 0 },
            realTime: { active: false, offsetX: 0, offsetY: 0 },
            sessionTimer: { active: false, offsetX: 0, offsetY: 0 },
            antiAfk: { active: false, offsetX: 0, offsetY: 0 }
        },
        cpsClicks: [],
        rafId: null,
        sessionStartTime: null,
        cleanupFunctions: { fps: null, cps: null, realTime: null, sessionTimer: null, antiAfk: null },
        updateAvailable: false,
        latestVersion: null,
        antiAfkCountdown: 5,
        performanceLoopRunning: false,
        activeRAFFeatures: new Set(),
        eventListeners: new Map(),
        sessionStats: {
            totalClicks: 0, totalKeys: 0, peakCPS: 0, peakFPS: 0, sessionCount: 0,
            startTime: null, clicksBySecond: [], fpsHistory: [], averageFPS: 0,
            averageCPS: 0, totalSessionTime: 0
        }
    };

    const cachedElements = {};
    let cpsClickListenerRef = null;

    // Optimized safe execution
    function safeExecute(fn, fallbackValue = null, context = 'Unknown') {
        try {
            return fn();
        } catch (error) {
            console.error(`[NovaCore Error - ${context}]:`, error);
            if (circuitBreaker.record(context)) {
                return fallbackValue;
            }
            return fallbackValue;
        }
    }

    // Optimized throttle with frame-based timing
    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = performance.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }

    // Optimized debounce
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function saveSettings() {
        safeExecute(() => {
            const settings = {
                version: SCRIPT_VERSION,
                fpsShown: stateData.fpsShown, cpsShown: stateData.cpsShown, realTimeShown: stateData.realTimeShown,
                sessionTimerShown: stateData.sessionTimerShown, antiAfkEnabled: stateData.antiAfkEnabled,
                menuKey: stateData.menuKey, currentTheme: stateData.currentTheme,
                positions: {
                    fps: stateData.counters.fps ? { left: stateData.counters.fps.style.left, top: stateData.counters.fps.style.top } : null,
                    cps: stateData.counters.cps ? { left: stateData.counters.cps.style.left, top: stateData.counters.cps.style.top } : null,
                    realTime: stateData.counters.realTime ? { left: stateData.counters.realTime.style.left, top: stateData.counters.realTime.style.top } : null,
                    sessionTimer: stateData.counters.sessionTimer ? { left: stateData.counters.sessionTimer.style.left, top: stateData.counters.sessionTimer.style.top } : null,
                    antiAfk: stateData.counters.antiAfk ? { left: stateData.counters.antiAfk.style.left, top: stateData.counters.antiAfk.style.top } : null
                }
            };
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('[NovaCore] Storage quota exceeded');
                    localStorage.removeItem(LAST_UPDATE_CHECK_KEY);
                }
            }
        }, null, 'saveSettings');
    }

    const debouncedSave = debounce(saveSettings, TIMING.SAVE_DEBOUNCE);

    const state = new Proxy(stateData, {
        set(target, prop, value) {
            const oldValue = target[prop];
            target[prop] = value;
            if ((prop.includes('Shown') || prop === 'currentTheme') && oldValue !== value) {
                debouncedSave();
            }
            return true;
        }
    });

    function addManagedListener(element, event, handler, id) {
        element.addEventListener(event, handler, { passive: true });
        if (!state.eventListeners.has(id)) {
            state.eventListeners.set(id, []);
        }
        state.eventListeners.get(id).push({ element, event, handler });
    }

    function removeAllListeners(id) {
        const listeners = state.eventListeners.get(id);
        if (listeners) {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            state.eventListeners.delete(id);
        }
    }

    function loadCustomTheme() {
        const customColor = localStorage.getItem(CUSTOM_COLOR_KEY);
        if (customColor) {
            THEMES.custom.primary = customColor;
            THEMES.custom.shadow = customColor;
        }
    }

    function applyTheme(themeName) {
        const theme = THEMES[themeName] || THEMES.cyan;
        document.documentElement.style.setProperty('--nova-primary', theme.primary);
        document.documentElement.style.setProperty('--nova-shadow', theme.shadow);
        state.currentTheme = themeName;
    }

    function initSessionStats() {
        safeExecute(() => {
            const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0') + 1;
            state.sessionStats.sessionCount = sessionCount;
            state.sessionStats.startTime = Date.now();
            localStorage.setItem(SESSION_COUNT_KEY, sessionCount.toString());
            console.log(`[NovaCore] Session #${sessionCount} started`);
            state.intervals.statsUpdate = setInterval(updateStatsHistory, TIMING.STATS_UPDATE_INTERVAL);
        }, null, 'initSessionStats');
    }

    function updateStatsHistory() {
        safeExecute(() => {
            const now = Date.now();
            const sessionTime = Math.floor((now - state.sessionStats.startTime) / 1000);
            if (sessionTime > state.sessionStats.clicksBySecond.length) {
                state.sessionStats.clicksBySecond.push(state.cpsClicks.length);
                const sum = state.sessionStats.clicksBySecond.reduce((a, b) => a + b, 0);
                state.sessionStats.averageCPS = (sum / state.sessionStats.clicksBySecond.length).toFixed(1);
            }
            state.sessionStats.totalSessionTime = sessionTime;
        }, null, 'updateStatsHistory');
    }

    // Optimized styles
    const style = document.createElement('style');
    style.textContent = `
:root { --nova-primary: #00ffff; --nova-shadow: #00ffff; --nova-bg-dark: #000000; }
@keyframes slideDownInTop { 0% { opacity: 0; transform: translate(-50%, -70px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
@keyframes checkPopIn { 0% { opacity: 0; transform: scale(0) rotate(-45deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
@keyframes fadeScaleIn { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
@keyframes strokeDashoffsetAnim { 0% { stroke-dashoffset: 1000; opacity: 0; } 100% { stroke-dashoffset: 0; opacity: 1; } }
@keyframes checkmarkFadeScale { 0% { opacity: 0; transform: scale(0) rotate(-180deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
@keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes glowPulse { 0%, 100% { text-shadow: 0 0 8px var(--nova-shadow), 0 0 20px var(--nova-shadow); } 50% { text-shadow: 0 0 12px var(--nova-shadow), 0 0 30px var(--nova-shadow); } }
@keyframes counterSlideIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }

#nova-intro { position: fixed; inset: 0; background: var(--nova-bg-dark); z-index: 999999; user-select: none; }
.downloaded-btn { position: fixed; top: 10vh; left: 50%; transform: translateX(-50%); background: #111; border: 2px solid #e53935; color: white; padding: 12px 40px; border-radius: 30px; font-size: 1.3rem; z-index: 1000001; animation: slideDownInTop 0.8s ease forwards; }
.checkmark { color: #e53935; font-size: 1.4rem; opacity: 0; transform: scale(0); animation-fill-mode: forwards; }
.client-name-container { position: fixed; bottom: 10vh; left: 50%; transform: translateX(-50%); display: flex; gap: 20px; opacity: 0; animation-fill-mode: forwards; z-index: 1000000; }
.client-name-svg { width: 400px; height: 100px; filter: drop-shadow(0 0 10px rgba(255, 23, 68, 0.5)); }
svg text { font-family: Segoe UI, sans-serif; font-weight: 700; font-size: 72px; fill: white; stroke: #ff1744; stroke-width: 2px; animation: strokeDashoffsetAnim 2.5s forwards ease; }
.client-name-checkmark { font-size: 4.2rem; color: #ff1744; opacity: 0; transform: scale(0); animation-fill-mode: forwards; filter: drop-shadow(0 0 8px rgba(255, 23, 68, 0.8)); }

#nova-persistent-header { position: fixed; top: 10px; left: 10px; font-family: Segoe UI, sans-serif; font-weight: 900; font-size: 1.5rem; color: var(--nova-primary); text-shadow: 0 0 8px var(--nova-shadow), 0 0 20px var(--nova-shadow); user-select: none; z-index: 100000000; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; animation: glowPulse 3s ease-in-out infinite; }
#nova-persistent-header.visible { opacity: 1; }

#nova-menu-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px); z-index: 10000000; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 40px; opacity: 0; pointer-events: none; transition: opacity 0.35s ease; user-select: none; }
#nova-menu-overlay.show { opacity: 1; pointer-events: auto; }

#nova-menu-header { font-family: Segoe UI, sans-serif; font-size: 3rem; font-weight: 900; color: var(--nova-primary); text-shadow: 0 0 8px var(--nova-shadow), 0 0 20px var(--nova-shadow); margin-bottom: 30px; }

#nova-menu-content { width: 320px; background: rgba(17, 17, 17, 0.67); border-radius: 16px; padding: 24px; color: white; font-size: 1.1rem; box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); display: flex; flex-direction: column; gap: 24px; max-height: 80vh; overflow-y: auto; }

.nova-menu-btn { background: rgba(0, 0, 0, 0.8); border: 2px solid var(--nova-primary); color: var(--nova-primary); font-family: Segoe UI, sans-serif; font-weight: 700; padding: 16px 20px; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; user-select: none; }
.nova-menu-btn:hover { background: var(--nova-primary); color: #000; transform: translateY(-2px); }

#nova-hint-text { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: Consolas, monospace; color: var(--nova-primary); font-size: 1.25rem; text-shadow: 0 0 4px var(--nova-shadow), 0 0 10px var(--nova-shadow); user-select: none; opacity: 0; pointer-events: none; z-index: 9999999; }

.counter { position: fixed; background: rgba(0, 255, 255, 0.85); color: #000; font-family: Segoe UI, sans-serif; font-weight: 700; font-size: 1.25rem; padding: 8px 14px; border-radius: 12px; box-shadow: 0 0 8px rgba(0, 255, 255, 0.7); user-select: none; cursor: grab; z-index: 999999999; width: max-content; transition: all 0.2s ease; will-change: transform; animation: counterSlideIn 0.5s ease-out; }
.counter.dragging { cursor: grabbing; transform: scale(1.05); }
.counter:hover:not(.dragging) { transform: scale(1.02); }

#real-time-counter { position: fixed; bottom: 10px; right: 10px; background: rgba(0, 255, 255, 0.85); color: #000; font-family: Segoe UI, sans-serif; font-weight: 700; font-size: 22px; padding: 8px 14px; border-radius: 12px; z-index: 999999999; }

.counter-tooltip { position: absolute; bottom: calc(100% + 8px); right: 0; background: black; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
.counter:hover .counter-tooltip { opacity: 1; }

.settings-section { border-top: 1px solid rgba(0, 255, 255, 0.3); padding-top: 24px; margin-top: 16px; }
.settings-label { font-size: 0.9rem; color: var(--nova-primary); margin-bottom: 10px; display: block; font-weight: 600; }

.theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
.theme-btn { background: rgba(0, 0, 0, 0.8); border: 2px solid; font-family: Segoe UI, sans-serif; font-weight: 600; font-size: 0.85rem; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
.theme-btn:hover { transform: translateY(-2px); }
.theme-btn.active { box-shadow: 0 0 15px currentColor; font-weight: 900; }

.theme-btn.cyan { border-color: #00ffff; color: #00ffff; }
.theme-btn.purple { border-color: #9b59b6; color: #9b59b6; }
.theme-btn.green { border-color: #2ecc71; color: #2ecc71; }
.theme-btn.red { border-color: #e74c3c; color: #e74c3c; }
.theme-btn.blue { border-color: #3498db; color: #3498db; }
.theme-btn.gold { border-color: #f39c12; color: #f39c12; }
.theme-btn.pink { border-color: #ff69b4; color: #ff69b4; }
.theme-btn.orange { border-color: #ff6b35; color: #ff6b35; }

.update-notification { position: fixed; top: 80px; right: 20px; background: rgba(0, 0, 0, 0.95); border: 2px solid var(--nova-primary); border-radius: 12px; padding: 16px 20px; color: white; z-index: 100000001; max-width: 320px; animation: slideInRight 0.5s ease; }
.update-notification-header { margin-bottom: 12px; font-size: 1.1rem; font-weight: 700; color: var(--nova-primary); }
.update-notification-body { font-size: 0.95rem; line-height: 1.5; margin-bottom: 14px; color: #ddd; }
.update-notification-version { color: var(--nova-primary); font-weight: 700; }
.update-notification-buttons { display: flex; gap: 10px; }
.update-notification-btn { flex: 1; background: #000; border: 2px solid var(--nova-primary); color: var(--nova-primary); padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; font-family: Segoe UI, sans-serif; }
.update-notification-btn:hover { background: var(--nova-primary); color: #000; transform: translateY(-2px); }
.update-notification-btn.dismiss { border-color: #666; color: #999; }
.update-notification-btn.dismiss:hover { background: #666; color: white; }
.update-check-status { font-size: 0.85rem; color: #999; text-align: center; margin-top: 8px; font-style: italic; }
.update-now-btn { background: linear-gradient(135deg, #2ecc71, #27ae60) !important; border: 2px solid #2ecc71 !important; color: white !important; font-weight: 900 !important; }
.update-now-btn:hover { background: linear-gradient(135deg, #27ae60, #229954) !important; color: white !important; box-shadow: 0 4px 20px rgba(46, 204, 113, 0.6) !important; }

.keybind-input { width: 100%; background: rgba(0, 0, 0, 0.8); border: 2px solid var(--nova-primary); color: var(--nova-primary); font-family: Segoe UI, sans-serif; font-weight: 700; font-size: 1rem; padding: 8px 12px; border-radius: 8px; text-align: center; transition: all 0.3s ease; }
.keybind-input:focus { outline: none; box-shadow: 0 0 12px rgba(0, 255, 255, 0.6); background: rgba(0, 255, 255, 0.15); transform: scale(1.02); }

.color-picker-wrapper { margin-top: 12px; }
.color-picker-input { width: 100%; height: 50px; border: 2px solid var(--nova-primary); border-radius: 8px; cursor: pointer; background: rgba(0, 0, 0, 0.8); transition: all 0.3s ease; }
.color-picker-input:hover { box-shadow: 0 0 12px rgba(0, 255, 255, 0.6); transform: scale(1.02); }
`;
    document.head.appendChild(style);

    // Optimized unified performance loop
    function startPerformanceLoop() {
        if (state.performanceLoopRunning) return;
        state.performanceLoopRunning = true;
        let lastFpsUpdate = performance.now();
        let frameCount = 0;

        function loop(currentTime) {
            if (!state.performanceLoopRunning || state.activeRAFFeatures.size === 0) {
                state.performanceLoopRunning = false;
                state.rafId = null;
                return;
            }

            frameCount++;
            const elapsed = currentTime - lastFpsUpdate;
            if (elapsed >= TIMING.FPS_UPDATE_INTERVAL && state.counters.fps) {
                const fps = Math.round((frameCount * 1000) / elapsed);
                if (state.counters.fps.firstChild) {
                    state.counters.fps.firstChild.nodeValue = `FPS: ${fps}`;
                }
                if (fps > state.sessionStats.peakFPS) {
                    state.sessionStats.peakFPS = fps;
                }
                frameCount = 0;
                lastFpsUpdate = currentTime;
            }
            state.rafId = requestAnimationFrame(loop);
        }
        state.rafId = requestAnimationFrame(loop);
    }

    function stopPerformanceLoop() {
        state.activeRAFFeatures.delete('fps');
        if (state.activeRAFFeatures.size === 0 && state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
            state.performanceLoopRunning = false;
        }
    }

    // Intro
    function createIntro() {
        const overlay = document.createElement('div');
        overlay.id = 'nova-intro';

        const button = document.createElement('div');
        button.className = 'downloaded-btn';
        button.innerHTML = 'Client Downloaded<span class="checkmark">✔️</span>';
        overlay.appendChild(button);

        const clientNameContainer = document.createElement('div');
        clientNameContainer.className = 'client-name-container';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('viewBox', '0 0 400 100');
        svg.classList.add('client-name-svg');
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', '50%');
        text.setAttribute('y', '70%');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = 'NovaCore';
        svg.appendChild(text);
        clientNameContainer.appendChild(svg);
        clientNameContainer.innerHTML += '<span class="client-name-checkmark">✔️</span>';
        overlay.appendChild(clientNameContainer);
        document.body.appendChild(overlay);

        setTimeout(() => document.querySelector('.checkmark').style.animation = 'checkPopIn 0.6s forwards ease', TIMING.INTRO_CHECK_APPEAR);
        setTimeout(() => button.style.animation = 'slideUpOutTop 0.8s ease forwards', TIMING.INTRO_BUTTON_EXIT);
        setTimeout(() => {
            text.style.animation = 'strokeDashoffsetAnim 2.5s forwards ease';
            clientNameContainer.style.opacity = '1';
            clientNameContainer.style.animation = 'fadeScaleIn 0.8s ease forwards';
        }, TIMING.INTRO_TEXT_START);
        setTimeout(() => document.querySelector('.client-name-checkmark').style.animation = 'checkmarkFadeScale 0.5s forwards ease', TIMING.INTRO_CHECKMARK_APPEAR);

        return overlay;
    }

    function createPersistentHeader() {
        const header = document.createElement('div');
        header.id = 'nova-persistent-header';
        header.textContent = 'Novacore💎';
        document.body.appendChild(header);
        cachedElements.header = header;
        return header;
    }

    function createHintText() {
        const hint = document.createElement('div');
        hint.id = 'nova-hint-text';
        hint.textContent = `Press ${state.menuKey} To Open Menu!`;
        document.body.appendChild(hint);
        cachedElements.hint = hint;
        return hint;
    }

    // Dragging with optimized throttling
    function setupDragging(element, counterType) {
        const dragState = state.drag[counterType];
        const listenerId = `drag_${counterType}`;

        const onMouseDown = (e) => {
            dragState.active = true;
            dragState.offsetX = e.clientX - element.getBoundingClientRect().left;
            dragState.offsetY = e.clientY - element.getBoundingClientRect().top;
            element.classList.add('dragging');
        };

        const onMouseUp = () => {
            if (dragState.active) {
                dragState.active = false;
                element.classList.remove('dragging');
                debouncedSave();
            }
        };

        const onMouseMove = throttle((e) => {
            if (dragState.active) {
                const newX = Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10, e.clientX - dragState.offsetX));
                const newY = Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10, e.clientY - dragState.offsetY));
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
            }
        }, 32); // Throttle to 30fps for dragging

        addManagedListener(element, 'mousedown', onMouseDown, listenerId);
        addManagedListener(window, 'mouseup', onMouseUp, listenerId);
        addManagedListener(window, 'mousemove', onMouseMove, listenerId);

        return () => removeAllListeners(listenerId);
    }

    // FPS Counter
    function createFPSCounter() {
        const counter = document.createElement('div');
        counter.id = 'fps-counter';
        counter.className = 'counter';
        counter.style.left = '50px';
        counter.style.top = '80px';
        counter.textContent = 'FPS: 0';
        const tooltip = document.createElement('div');
        tooltip.className = 'counter-tooltip';
        tooltip.textContent = 'Frames Per Second';
        counter.appendChild(tooltip);
        document.body.appendChild(counter);
        state.counters.fps = counter;
        state.cleanupFunctions.fps = setupDragging(counter, 'fps');
        return counter;
    }

    function startFPSCounter() {
        if (!state.counters.fps) createFPSCounter();
        state.activeRAFFeatures.add('fps');
        if (!state.performanceLoopRunning) startPerformanceLoop();
    }

    function stopFPSCounter() {
        state.fpsShown = false;
        if (state.cleanupFunctions.fps) {
            state.cleanupFunctions.fps();
            state.cleanupFunctions.fps = null;
        }
        if (state.counters.fps) {
            state.counters.fps.remove();
            state.counters.fps = null;
        }
        stopPerformanceLoop();
    }

    // CPS Counter with optimized click tracking
    function createCPSCounter() {
        const counter = document.createElement('div');
        counter.id = 'cps-counter';
        counter.className = 'counter';
        counter.style.left = '50px';
        counter.style.top = '150px';
        counter.textContent = 'CPS: 0';
        const tooltip = document.createElement('div');
        tooltip.className = 'counter-tooltip';
        tooltip.textContent = 'Clicks Per Second';
        counter.appendChild(tooltip);
        document.body.appendChild(counter);
        state.counters.cps = counter;

        const dragCleanup = setupDragging(counter, 'cps');

        cpsClickListenerRef = (e) => {
            if (e.button === 0) {
                const now = performance.now();
                state.cpsClicks.push(now);
                state.sessionStats.totalClicks++;

                const cutoff = now - TIMING.CPS_WINDOW;
                while (state.cpsClicks.length > 0 && state.cpsClicks[0] < cutoff) {
                    state.cpsClicks.shift();
                }

                if (state.cpsClicks.length > state.sessionStats.peakCPS) {
                    state.sessionStats.peakCPS = state.cpsClicks.length;
                }
            }
        };

        addManagedListener(window, 'mousedown', cpsClickListenerRef, 'cps_clicks');

        state.cleanupFunctions.cps = () => {
            dragCleanup();
            removeAllListeners('cps_clicks');
        };

        return counter;
    }

    function updateCPSCounter() {
        if (state.counters.cps && state.counters.cps.firstChild) {
            state.counters.cps.firstChild.nodeValue = `CPS: ${state.cpsClicks.length}`;
        }
    }

    function startCPSCounter() {
        if (!state.counters.cps) createCPSCounter();
        state.cpsClicks = [];
        state.intervals.cps = setInterval(() => {
            const cutoff = performance.now() - TIMING.CPS_WINDOW;
            while (state.cpsClicks.length > 0 && state.cpsClicks[0] < cutoff) {
                state.cpsClicks.shift();
            }
            updateCPSCounter();
        }, TIMING.CPS_UPDATE_INTERVAL);
    }

    function stopCPSCounter() {
        if (state.cleanupFunctions.cps) {
            state.cleanupFunctions.cps();
            state.cleanupFunctions.cps = null;
        }
        if (state.counters.cps) {
            state.counters.cps.remove();
            state.counters.cps = null;
        }
        if (state.intervals.cps) {
            clearInterval(state.intervals.cps);
            state.intervals.cps = null;
        }
        state.cpsClicks = [];
    }

    // Real Time Counter
    function createRealTimeCounter() {
        const counter = document.createElement('div');
        counter.id = 'real-time-counter';
        counter.className = 'counter';
        const timeText = document.createElement('span');
        timeText.className = 'counter-time-text';
        counter.appendChild(timeText);
        const tooltip = document.createElement('div');
        tooltip.className = 'counter-tooltip';
        tooltip.textContent = "Shows time without exiting fullscreen";
        counter.appendChild(tooltip);
        document.body.appendChild(counter);
        state.counters.realTime = counter;
        return counter;
    }

    function updateRealTime() {
        if (!state.counters.realTime) return;
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeText = state.counters.realTime.querySelector('.counter-time-text');
        if (timeText) {
            timeText.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
        }
    }

    function startRealTimeCounter() {
        if (!state.counters.realTime) createRealTimeCounter();
        updateRealTime();
        state.intervals.realTime = setInterval(updateRealTime, 1000);
    }

    function stopRealTimeCounter() {
        if (state.counters.realTime) {
            state.counters.realTime.remove();
            state.counters.realTime = null;
        }
        if (state.intervals.realTime) {
            clearInterval(state.intervals.realTime);
            state.intervals.realTime = null;
        }
    }

    // Session Timer
    function getSessionStartTime() {
        const currentSessionId = Date.now() + '_' + Math.random();
        const savedSessionId = sessionStorage.getItem(SESSION_ID_KEY);

        if (!savedSessionId || savedSessionId !== currentSessionId) {
            sessionStorage.setItem(SESSION_ID_KEY, currentSessionId);
            const now = Date.now();
            localStorage.setItem(SESSION_START_KEY, now.toString());
            return now;
        }

        const saved = localStorage.getItem(SESSION_START_KEY);
        if (saved) {
            return parseInt(saved, 10);
        }

        const now = Date.now();
        localStorage.setItem(SESSION_START_KEY, now.toString());
        return now;
    }

    function resetSessionTimer() {
        const now = Date.now();
        localStorage.setItem(SESSION_START_KEY, now.toString());
        state.sessionStartTime = now;
        updateSessionTimer();
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    function createSessionTimerCounter() {
        const counter = document.createElement('div');
        counter.id = 'session-timer-counter';
        counter.className = 'counter';
        counter.style.left = '50px';
        counter.style.top = '220px';
        const timeText = document.createElement('span');
        timeText.className = 'counter-time-text';
        counter.appendChild(timeText);
        const tooltip = document.createElement('div');
        tooltip.className = 'counter-tooltip';
        tooltip.textContent = 'Session Time - Right click to reset';
        counter.appendChild(tooltip);
        counter.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('Reset session timer?')) resetSessionTimer();
        });
        document.body.appendChild(counter);
        state.counters.sessionTimer = counter;
        state.cleanupFunctions.sessionTimer = setupDragging(counter, 'sessionTimer');
        return counter;
    }

    function updateSessionTimer() {
        if (!state.counters.sessionTimer) return;
        const elapsed = Date.now() - state.sessionStartTime;
        const timeText = state.counters.sessionTimer.querySelector('.counter-time-text');
        if (timeText) {
            timeText.textContent = `⏱️ ${formatTime(elapsed)}`;
        }
    }

    function startSessionTimer() {
        if (!state.counters.sessionTimer) createSessionTimerCounter();
        state.sessionStartTime = getSessionStartTime();
        updateSessionTimer();
        state.intervals.sessionTimer = setInterval(updateSessionTimer, 1000);
    }

    function stopSessionTimer() {
        if (state.cleanupFunctions.sessionTimer) {
            state.cleanupFunctions.sessionTimer();
            state.cleanupFunctions.sessionTimer = null;
        }
        if (state.counters.sessionTimer) {
            state.counters.sessionTimer.remove();
            state.counters.sessionTimer = null;
        }
        if (state.intervals.sessionTimer) {
            clearInterval(state.intervals.sessionTimer);
            state.intervals.sessionTimer = null;
        }
    }

    // Update checker
    function compareVersions(v1, v2) {
        const parse = (v) => v.split('.').map(n => parseInt(n) || 0);
        const parts1 = parse(v1);
        const parts2 = parse(v2);
        const maxLen = Math.max(parts1.length, parts2.length);
        while (parts1.length < maxLen) parts1.push(0);
        while (parts2.length < maxLen) parts2.push(0);
        for (let i = 0; i < maxLen; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    function showUpdateNotification(latestVersion) {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-notification-header">🎉 Update Available!</div>
            <div class="update-notification-body">
                A new version of NovaCore is available!<br>
                Current: <span class="update-notification-version">v${SCRIPT_VERSION}</span><br>
                Latest: <span class="update-notification-version">v${latestVersion}</span>
            </div>
            <div class="update-notification-buttons">
                <button class="update-notification-btn" id="update-btn">View on GitHub</button>
                <button class="update-notification-btn dismiss" id="dismiss-btn">Later</button>
            </div>
        `;
        document.body.appendChild(notification);
        document.getElementById('update-btn').addEventListener('click', () => {
            window.open(`https://github.com/${GITHUB_REPO}/blob/main/NCUserscript.js`, '_blank');
            notification.remove();
        });
        document.getElementById('dismiss-btn').addEventListener('click', () => notification.remove());
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 30000);
    }

    async function checkForUpdates(manual = false) {
        const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK_KEY);
        const now = Date.now();
        if (!manual && lastCheck && (now - parseInt(lastCheck)) < UPDATE_CHECK_INTERVAL) {
            return;
        }
        console.log('[NovaCore] Checking for updates...');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/NCUserscript.js`, {
                cache: 'no-cache',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const scriptContent = await response.text();
            const versionMatch = scriptContent.match(/@version\s+([\d.]+)/);
            if (versionMatch) {
                const latestVersion = versionMatch[1];
                state.latestVersion = latestVersion;
                localStorage.setItem(LAST_UPDATE_CHECK_KEY, now.toString());
                const comparison = compareVersions(latestVersion, SCRIPT_VERSION);
                if (comparison > 0) {
                    console.log(`[NovaCore] Update available: v${latestVersion}`);
                    state.updateAvailable = true;
                    showUpdateNotification(latestVersion);
                    if (cachedElements.checkUpdateBtn) {
                        cachedElements.checkUpdateBtn.textContent = '🎉 Update Available!';
                        cachedElements.checkUpdateBtn.classList.add('update-now-btn');
                        cachedElements.checkUpdateBtn.onclick = () => {
                            window.open(`https://github.com/${GITHUB_REPO}/blob/main/NCUserscript.js`, '_blank');
                        };
                    }
                    if (manual && cachedElements.updateStatus) {
                        cachedElements.updateStatus.textContent = `✨ v${latestVersion} available!`;
                        cachedElements.updateStatus.style.color = '#2ecc71';
                    }
                } else {
                    console.log('[NovaCore] You are on the latest version');
                    state.updateAvailable = false;
                    if (manual && cachedElements.updateStatus) {
                        cachedElements.updateStatus.textContent = '✓ Latest version installed!';
                        cachedElements.updateStatus.style.color = '#2ecc71';
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[NovaCore] Update check timed out');
                if (manual) alert('Update check timed out. Please try again.');
            } else {
                console.error('[NovaCore] Update check failed:', error);
                if (manual && cachedElements.updateStatus) {
                    cachedElements.updateStatus.textContent = '✗ Check failed (offline?)';
                    cachedElements.updateStatus.style.color = '#e74c3c';
                }
            }
        }
    }

    function hexToRgb(hex) {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        return `${r}, ${g}, ${b}`;
    }

    // Anti-AFK
    function createAntiAfkCounter() {
        const counter = document.createElement('div');
        counter.id = 'anti-afk-counter';
        counter.className = 'counter';
        counter.style.left = '50px';
        counter.style.top = '290px';
        const timeText = document.createElement('span');
        timeText.className = 'counter-time-text';
        counter.appendChild(timeText);
        const tooltip = document.createElement('div');
        tooltip.className = 'counter-tooltip';
        tooltip.textContent = 'Anti-AFK - Auto jumps to prevent kick';
        counter.appendChild(tooltip);
        document.body.appendChild(counter);
        state.counters.antiAfk = counter;
        state.cleanupFunctions.antiAfk = setupDragging(counter, 'antiAfk');
        return counter;
    }

    function pressSpace() {
        const down = new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true });
        const up = new KeyboardEvent("keyup", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true });
        window.dispatchEvent(down);
        setTimeout(() => window.dispatchEvent(up), 50);
    }

    function updateAntiAfkCounter() {
        if (!state.counters.antiAfk) return;
        const timeText = state.counters.antiAfk.querySelector('.counter-time-text');
        if (timeText) {
            timeText.textContent = `⚡ Jumping in ${state.antiAfkCountdown}s`;
        }
    }

    function startAntiAfk() {
        if (!state.counters.antiAfk) createAntiAfkCounter();
        state.antiAfkCountdown = 5;
        updateAntiAfkCounter();
        state.intervals.antiAfk = setInterval(() => {
            state.antiAfkCountdown--;
            updateAntiAfkCounter();
            if (state.antiAfkCountdown <= 0) {
                pressSpace();
                state.antiAfkCountdown = 5;
            }
        }, 1000);
    }

    function stopAntiAfk() {
        if (state.cleanupFunctions.antiAfk) {
            state.cleanupFunctions.antiAfk();
            state.cleanupFunctions.antiAfk = null;
        }
        if (state.counters.antiAfk) {
            state.counters.antiAfk.remove();
            state.counters.antiAfk = null;
        }
        if (state.intervals.antiAfk) {
            clearInterval(state.intervals.antiAfk);
            state.intervals.antiAfk = null;
        }
    }

    // Menu
    function createMenu() {
        const menuOverlay = document.createElement('div');
        menuOverlay.id = 'nova-menu-overlay';

        const menuHeader = document.createElement('div');
        menuHeader.id = 'nova-menu-header';
        menuHeader.textContent = 'Novacore💎';
        menuOverlay.appendChild(menuHeader);

        const menuContent = document.createElement('div');
        menuContent.id = 'nova-menu-content';

        const focusableElements = [];

        const createButton = (text, onClick) => {
            const btn = document.createElement('button');
            btn.className = 'nova-menu-btn';
            btn.textContent = text;
            btn.addEventListener('click', onClick);
            focusableElements.push(btn);
            return btn;
        };

        const fpsBtn = createButton('FPS Counter', () => {
            if (state.fpsShown) {
                state.fpsShown = false;
                stopFPSCounter();
                fpsBtn.textContent = 'FPS Counter';
            } else {
                state.fpsShown = true;
                startFPSCounter();
                fpsBtn.textContent = 'Hide FPS Counter';
            }
        });
        menuContent.appendChild(fpsBtn);

        const cpsBtn = createButton('CPS Counter', () => {
            if (state.cpsShown) {
                stopCPSCounter();
                cpsBtn.textContent = 'CPS Counter';
                state.cpsShown = false;
            } else {
                startCPSCounter();
                cpsBtn.textContent = 'Hide CPS Counter';
                state.cpsShown = true;
            }
        });
        menuContent.appendChild(cpsBtn);

        const realTimeBtn = createButton('Real Time', () => {
            if (state.realTimeShown) {
                stopRealTimeCounter();
                realTimeBtn.textContent = 'Real Time';
                state.realTimeShown = false;
            } else {
                startRealTimeCounter();
                realTimeBtn.textContent = 'Hide Real Time';
                state.realTimeShown = true;
            }
        });
        menuContent.appendChild(realTimeBtn);

        const antiAfkBtn = createButton('Anti-AFK', () => {
            if (state.antiAfkEnabled) {
                stopAntiAfk();
                antiAfkBtn.textContent = 'Anti-AFK';
                state.antiAfkEnabled = false;
            } else {
                startAntiAfk();
                antiAfkBtn.textContent = 'Disable Anti-AFK';
                state.antiAfkEnabled = true;
            }
        });
        menuContent.appendChild(antiAfkBtn);

        const fullscreenBtn = createButton('Auto Fullscreen', () => {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    alert(`Error trying to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
        menuContent.appendChild(fullscreenBtn);

        // Theme section
        const themeSection = document.createElement('div');
        themeSection.className = 'settings-section';
        const themeLabel = document.createElement('label');
        themeLabel.className = 'settings-label';
        themeLabel.textContent = 'Theme:';
        themeSection.appendChild(themeLabel);

        const themeGrid = document.createElement('div');
        themeGrid.className = 'theme-grid';

        Object.keys(THEMES).forEach(themeKey => {
            const theme = THEMES[themeKey];
            const themeBtn = document.createElement('button');
            themeBtn.className = `theme-btn ${themeKey}`;
            themeBtn.textContent = theme.name.replace(' (Default)', '');

            if (state.currentTheme === themeKey) {
                themeBtn.classList.add('active');
            }

            themeBtn.addEventListener('click', () => {
                document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
                themeBtn.classList.add('active');
                applyTheme(themeKey);
            });

            focusableElements.push(themeBtn);
            themeGrid.appendChild(themeBtn);
        });

        themeSection.appendChild(themeGrid);
        menuContent.appendChild(themeSection);

        // Custom Color Picker
        const colorPickerSection = document.createElement('div');
        colorPickerSection.className = 'settings-section';

        const colorPickerLabel = document.createElement('label');
        colorPickerLabel.className = 'settings-label';
        colorPickerLabel.textContent = 'Custom Theme Color:';
        colorPickerSection.appendChild(colorPickerLabel);

        const colorPickerWrapper = document.createElement('div');
        colorPickerWrapper.className = 'color-picker-wrapper';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'color-picker-input';
        colorInput.value = THEMES.custom.primary;

        colorInput.addEventListener('change', (e) => {
            const color = e.target.value;
            localStorage.setItem(CUSTOM_COLOR_KEY, color);
            THEMES.custom.primary = color;
            THEMES.custom.shadow = color;
            applyTheme('custom');
            document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.theme-btn.custom')?.classList.add('active');
        });

        focusableElements.push(colorInput);
        colorPickerWrapper.appendChild(colorInput);
        colorPickerSection.appendChild(colorPickerWrapper);
        menuContent.appendChild(colorPickerSection);

        // Keybind section
        const settingsSection = document.createElement('div');
        settingsSection.className = 'settings-section';

        const keybindLabel = document.createElement('label');
        keybindLabel.className = 'settings-label';
        keybindLabel.textContent = 'Menu Keybind:';
        settingsSection.appendChild(keybindLabel);

        const keybindInput = document.createElement('input');
        keybindInput.type = 'text';
        keybindInput.className = 'keybind-input';
        keybindInput.value = state.menuKey;
        keybindInput.readOnly = true;
        keybindInput.placeholder = 'Press a key...';

        keybindInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            if (e.key === 'Escape') {
                keybindInput.value = state.menuKey;
                keybindInput.blur();
                return;
            }
            state.menuKey = e.key;
            keybindInput.value = e.key;
            if (cachedElements.hint) {
                cachedElements.hint.textContent = `Press ${state.menuKey} To Open Menu!`;
            }
            keybindInput.blur();
        });

        focusableElements.push(keybindInput);
        settingsSection.appendChild(keybindInput);
        menuContent.appendChild(settingsSection);

        // Update checker section
        const updateSection = document.createElement('div');
        updateSection.className = 'settings-section';

        const updateLabel = document.createElement('label');
        updateLabel.className = 'settings-label';
        updateLabel.textContent = 'Updates:';
        updateSection.appendChild(updateLabel);

        const checkUpdateBtn = createButton('Check for Updates', () => {
            checkUpdateBtn.textContent = 'Checking...';
            checkUpdateBtn.disabled = true;
            checkForUpdates(true).finally(() => {
                setTimeout(() => {
                    if (!state.updateAvailable) {
                        checkUpdateBtn.textContent = 'Check for Updates';
                    }
                    checkUpdateBtn.disabled = false;
                }, 2000);
            });
        });
        updateSection.appendChild(checkUpdateBtn);
        cachedElements.checkUpdateBtn = checkUpdateBtn;

        const updateStatus = document.createElement('div');
        updateStatus.className = 'update-check-status';
        updateStatus.textContent = `Current version: v${SCRIPT_VERSION}`;
        updateSection.appendChild(updateStatus);
        cachedElements.updateStatus = updateStatus;

        menuContent.appendChild(updateSection);
        const creditsSection = document.createElement('div');
        creditsSection.className = 'settings-section';
        creditsSection.innerHTML = `
            <div style="text-align: center; font-size: 0.85rem; color: #999;">
                <div><strong style="color: var(--nova-primary);">NovaCore v${SCRIPT_VERSION}</strong></div>
                <div>Original by <strong>@Scripter132132</strong></div>
                <div>Enhanced by <strong>@TheM1ddleM1n</strong></div>
            </div>
        `;
        menuContent.appendChild(creditsSection);

        menuOverlay.appendChild(menuContent);
        document.body.appendChild(menuOverlay);

        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) {
                closeMenu();
            }
        });

        cachedElements.menu = menuOverlay;
        cachedElements.fpsBtn = fpsBtn;
        cachedElements.cpsBtn = cpsBtn;
        cachedElements.realTimeBtn = realTimeBtn;
        cachedElements.antiAfkBtn = antiAfkBtn;
        cachedElements.fullscreenBtn = fullscreenBtn;
        cachedElements.focusableElements = focusableElements;

        return menuOverlay;
    }

    function openMenu() {
        if (cachedElements.menu) {
            cachedElements.menu.classList.add('show');
            if (cachedElements.header) {
                cachedElements.header.classList.remove('visible');
            }
        }
    }

    function closeMenu() {
        if (cachedElements.menu) {
            cachedElements.menu.classList.remove('show');
            if (cachedElements.header) {
                cachedElements.header.classList.add('visible');
            }
        }
    }

    function toggleMenu() {
        if (cachedElements.menu && cachedElements.menu.classList.contains('show')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // Keyboard handler
    function setupKeyboardHandler() {
        window.addEventListener('keydown', (e) => {
            if (e.key === state.menuKey) {
                e.preventDefault();
                toggleMenu();
            } else if (e.key === 'Escape' && cachedElements.menu && cachedElements.menu.classList.contains('show')) {
                e.preventDefault();
                closeMenu();
            }
        });
    }

    // Restore saved state
    function restoreSavedState() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (!saved) return;
            const settings = JSON.parse(saved);

            if (settings.menuKey) {
                state.menuKey = settings.menuKey;
                if (cachedElements.hint) {
                    cachedElements.hint.textContent = `Press ${state.menuKey} To Open Menu!`;
                }
            }

            if (settings.currentTheme) {
                applyTheme(settings.currentTheme);
            }

            if (settings.fpsShown) {
                startFPSCounter();
                state.fpsShown = true;
                if (cachedElements.fpsBtn) cachedElements.fpsBtn.textContent = 'Hide FPS Counter';
                if (settings.positions?.fps && state.counters.fps) {
                    state.counters.fps.style.left = settings.positions.fps.left;
                    state.counters.fps.style.top = settings.positions.fps.top;
                }
            }

            if (settings.cpsShown) {
                startCPSCounter();
                state.cpsShown = true;
                if (cachedElements.cpsBtn) cachedElements.cpsBtn.textContent = 'Hide CPS Counter';
            }

            if (settings.realTimeShown) {
                startRealTimeCounter();
                state.realTimeShown = true;
                if (cachedElements.realTimeBtn) cachedElements.realTimeBtn.textContent = 'Hide Real Time';
            }

            if (settings.antiAfkEnabled) {
                startAntiAfk();
                state.antiAfkEnabled = true;
                if (cachedElements.antiAfkBtn) cachedElements.antiAfkBtn.textContent = 'Disable Anti-AFK';
            }
        } catch (e) {
            console.error('[NovaCore] Failed to restore settings:', e);
        }
    }

    // Global cleanup
    function globalCleanup() {
        console.log('[NovaCore] Cleaning up resources...');
        stopFPSCounter();
        stopCPSCounter();
        stopRealTimeCounter();
        stopSessionTimer();
        stopAntiAfk();

        Object.values(state.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });

        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
        }

        stopPerformanceLoop();
        console.log('[NovaCore] Cleanup complete');
    }

    window.addEventListener('beforeunload', globalCleanup);

    // Initialize
    function init() {
        console.log(`[NovaCore] Initializing v${SCRIPT_VERSION} (Optimized)...`);

        loadCustomTheme();
        initSessionStats();

        const intro = createIntro();
        const header = createPersistentHeader();
        const hint = createHintText();
        const menu = createMenu();

        setupKeyboardHandler();

        setTimeout(() => {
            intro.style.animation = 'fadeOut 1s ease forwards';
            setTimeout(() => {
                intro.remove();
                header.classList.add('visible');
                hint.style.opacity = '1';

                setTimeout(() => {
                    hint.style.opacity = '0';
                }, TIMING.HINT_TEXT_DURATION);

                restoreSavedState();
                console.log('[NovaCore] Initialization complete');
            }, TIMING.INTRO_FADE_OUT);
        }, TIMING.INTRO_TOTAL_DURATION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
