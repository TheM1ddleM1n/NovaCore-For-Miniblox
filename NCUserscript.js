// ==UserScript==
// @name         NovaCore V3!
// @namespace    M1ddleM1n and Scripter on top!
// @version      3.4
// @description  NovaCore V3 with optimized performance, zero lag, improved memory management, consolidated code and a ping counter (for network)
// @author       Scripter, TheM1ddleM1n
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
        FPS_UPDATE_INTERVAL: 500,
        CPS_UPDATE_INTERVAL: 250,
        CPS_WINDOW: 1000,
        PING_UPDATE_INTERVAL: 1000,
        SAVE_DEBOUNCE: 1000,
        STATS_UPDATE_INTERVAL: 5000
    };

    const THEMES = {
        cyan: { name: 'Cyan (Default)', primary: '#00ffff', primaryRgb: '0, 255, 255', shadow: '#00ffff' },
        red: { name: 'Crimson Fire', primary: '#e74c3c', primaryRgb: '231, 76, 60', shadow: '#e74c3c' },
        gold: { name: 'Golden Glow', primary: '#f39c12', primaryRgb: '243, 156, 18', shadow: '#f39c12' },
        custom: { name: 'Custom', primary: '#00ffff', primaryRgb: '0, 255, 255', shadow: '#00ffff' }
    };

    const SETTINGS_KEY = 'novacore_settings';
    const DEFAULT_MENU_KEY = '\\';
    const CUSTOM_COLOR_KEY = 'novacore_custom_color';
    const SESSION_COUNT_KEY = 'novacore_session_count';
    const SCRIPT_VERSION = '3.4';
    const GITHUB_REPO = 'TheM1ddleM1n/NovaCoreForMiniblox';
    const LAST_UPDATE_CHECK_KEY = 'novacore_last_update_check';
    const UPDATE_CHECK_INTERVAL = 3600000;

    const circuitBreaker = {
        failures: new Map(),
        threshold: 5,
        resetTime: 120000,

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

    const stateData = {
        fpsShown: false, cpsShown: false, realTimeShown: false, pingShown: false, antiAfkEnabled: false,
        menuKey: DEFAULT_MENU_KEY, currentTheme: 'cyan',
        counters: { fps: null, cps: null, realTime: null, ping: null, antiAfk: null },
        intervals: { fps: null, cps: null, realTime: null, ping: null, antiAfk: null, statsUpdate: null },
        drag: {
            fps: { active: false, offsetX: 0, offsetY: 0 },
            cps: { active: false, offsetX: 0, offsetY: 0 },
            realTime: { active: false, offsetX: 0, offsetY: 0 },
            ping: { active: false, offsetX: 0, offsetY: 0 },
            antiAfk: { active: false, offsetX: 0, offsetY: 0 }
        },
        cpsClicks: [],
        rafId: null,
        cleanupFunctions: { fps: null, cps: null, realTime: null, ping: null, antiAfk: null },
        updateAvailable: false,
        latestVersion: null,
        antiAfkCountdown: 5,
        performanceLoopRunning: false,
        activeRAFFeatures: new Set(),
        eventListeners: new Map(),
        pingStats: {
            currentPing: 0,
            averagePing: 0,
            peakPing: 0,
            minPing: Infinity,
            pingHistory: []
        },
        sessionStats: {
            totalClicks: 0, totalKeys: 0, peakCPS: 0, peakFPS: 0, sessionCount: 0,
            startTime: null, clicksBySecond: [], fpsHistory: [], averageFPS: 0,
            averageCPS: 0, totalSessionTime: 0
        }
    };

    const cachedElements = {};
    let cpsClickListenerRef = null;

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
                pingShown: stateData.pingShown, menuKey: stateData.menuKey, currentTheme: stateData.currentTheme,
                positions: {
                    fps: stateData.counters.fps ? { left: stateData.counters.fps.style.left, top: stateData.counters.fps.style.top } : null,
                    cps: stateData.counters.cps ? { left: stateData.counters.cps.style.left, top: stateData.counters.cps.style.top } : null,
                    realTime: stateData.counters.realTime ? { left: stateData.counters.realTime.style.left, top: stateData.counters.realTime.style.top } : null,
                    ping: stateData.counters.ping ? { left: stateData.counters.ping.style.left, top: stateData.counters.ping.style.top } : null
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

.counter-tooltip { position: absolute; bottom: calc(100% + 8px); right: 0; background: black; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
.counter:hover .counter-tooltip { opacity: 1; }

.settings-section { border-top: 1px solid rgba(0, 255, 255, 0.3); padding-top: 24px; margin-top: 16px; }
.settings-label { font-size: 0.9rem; color: var(--nova-primary); margin-bottom: 10px; display: block; font-weight: 600; }

.theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
.theme-btn { background: rgba(0, 0, 0, 0.8); border: 2px solid; font-family: Segoe UI, sans-serif; font-weight: 600; font-size: 0.85rem; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
.theme-btn:hover { transform: translateY(-2px); }
.theme-btn.active { box-shadow: 0 0 15px currentColor; font-weight: 900; }

.theme-btn.cyan { border-color: #00ffff; color: #00ffff; }
.theme-btn.red { border-color: #e74c3c; color: #e74c3c; }
.theme-btn.gold { border-color: #f39c12; color: #f39c12; }

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

    // ============================================
    // CONSOLIDATED COUNTER FACTORY FUNCTION
    // ============================================

    function createCounterElement(config) {
        const {
            id,
            counterType,
            initialText,
            tooltip,
            position = { left: '50px', top: '50px' },
            isDraggable = true,
            onContextMenu = null
        } = config;

        const counter = document.createElement('div');
        counter.id = id;
        counter.className = 'counter';
        counter.style.left = position.left;
        counter.style.top = position.top;

        const textSpan = document.createElement('span');
        textSpan.className = 'counter-time-text';
        textSpan.textContent = initialText;
        counter.appendChild(textSpan);

        if (tooltip) {
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'counter-tooltip';
            tooltipEl.textContent = tooltip;
            counter.appendChild(tooltipEl);
        }

        document.body.appendChild(counter);

        if (isDraggable && counterType) {
            const dragCleanup = setupDragging(counter, counterType);
            state.cleanupFunctions[counterType] = dragCleanup;
        }

        if (onContextMenu) {
            counter.addEventListener('contextmenu', onContextMenu);
        }

        return counter;
    }

    function updateCounterText(counterType, text) {
        if (!state.counters[counterType]) return;

        const textSpan = state.counters[counterType].querySelector('.counter-time-text');
        if (textSpan) {
            textSpan.textContent = text;
        }
    }

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
                updateCounterText('fps', `FPS: ${fps}`);
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
        }, 32);

        addManagedListener(element, 'mousedown', onMouseDown, listenerId);
        addManagedListener(window, 'mouseup', onMouseUp, listenerId);
        addManagedListener(window, 'mousemove', onMouseMove, listenerId);

        return () => removeAllListeners(listenerId);
    }

    // FPS Counter
    function createFPSCounter() {
        const counter = createCounterElement({
            id: 'fps-counter',
            counterType: 'fps',
            initialText: 'FPS: 0',
            tooltip: 'Frames Per Second',
            position: { left: '50px', top: '80px' },
            isDraggable: true
        });
        state.counters.fps = counter;
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

    // CPS Counter
    function createCPSCounter() {
        const counter = createCounterElement({
            id: 'cps-counter',
            counterType: 'cps',
            initialText: 'CPS: 0',
            tooltip: 'Clicks Per Second',
            position: { left: '50px', top: '150px' },
            isDraggable: true
        });
        state.counters.cps = counter;

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

        const originalCleanup = state.cleanupFunctions.cps;
        state.cleanupFunctions.cps = () => {
            if (originalCleanup) originalCleanup();
            removeAllListeners('cps_clicks');
        };

        return counter;
    }

    function updateCPSCounter() {
        updateCounterText('cps', `CPS: ${state.cpsClicks.length}`);
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
        const counter = createCounterElement({
            id: 'real-time-counter',
            counterType: null,
            initialText: '00:00:00 AM',
            tooltip: 'Shows time without exiting fullscreen',
            position: { left: '50px', top: '50px' },
            isDraggable: false
        });
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
        updateCounterText('realTime', `${hours}:${minutes}:${seconds} ${ampm}`);
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

    // PING COUNTER - NEW FEATURE
    function createPingCounter() {
        const counter = createCounterElement({
            id: 'ping-counter',
            counterType: 'ping',
            initialText: 'PING: 0ms',
            tooltip: 'Network Latency',
            position: { left: '50px', top: '220px' },
            isDraggable: true
        });
        state.counters.ping = counter;
        return counter;
    }

    function measurePing() {
        return new Promise((resolve) => {
            const startTime = performance.now();

            // Try to fetch a tiny resource to measure latency
            fetch(window.location.origin + '/', {
                method: 'HEAD',
                cache: 'no-cache',
                mode: 'no-cors'
            })
            .then(() => {
                const ping = Math.round(performance.now() - startTime);
                resolve(ping);
            })
            .catch(() => {
                // Fallback if fetch fails
                resolve(0);
            });
        });
    }

    function updatePingCounter() {
        measurePing().then(ping => {
            state.pingStats.currentPing = ping;

            // Update statistics
            state.pingStats.pingHistory.push(ping);
            if (state.pingStats.pingHistory.length > 60) {
                state.pingStats.pingHistory.shift();
            }

            const sum = state.pingStats.pingHistory.reduce((a, b) => a + b, 0);
            state.pingStats.averagePing = Math.round(sum / state.pingStats.pingHistory.length);
            state.pingStats.peakPing = Math.max(...state.pingStats.pingHistory);
            state.pingStats.minPing = Math.min(...state.pingStats.pingHistory);

            updateCounterText('ping', `PING: ${ping}ms`);
        });
    }

    function startPingCounter() {
        if (!state.counters.ping) createPingCounter();
        updatePingCounter();
        state.intervals.ping = setInterval(updatePingCounter, TIMING.PING_UPDATE_INTERVAL);
    }

    function stopPingCounter() {
        if (state.cleanupFunctions.ping) {
            state.cleanupFunctions.ping();
            state.cleanupFunctions.ping = null;
        }
        if (state.counters.ping) {
            state.counters.ping.remove();
            state.counters.ping = null;
        }
        if (state.intervals.ping) {
            clearInterval(state.intervals.ping);
            state.intervals.ping = null;
        }
        state.pingStats.pingHistory = [];
    }

    // Anti-AFK Counter
    function createAntiAfkCounter() {
        const counter = createCounterElement({
            id: 'anti-afk-counter',
            counterType: 'antiAfk',
            initialText: '⚡ Jumping in 5s',
            tooltip: 'Anti-AFK - Auto jumps to prevent kick',
            position: { left: '50px', top: '290px' },
            isDraggable: true
        });
        state.counters.antiAfk = counter;
        return counter;
    }

    function pressSpace() {
        const down = new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true });
        const up = new KeyboardEvent("keyup", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true });
        window.dispatchEvent(down);
        setTimeout(() => window.dispatchEvent(up), 50);
    }

    function updateAntiAfkCounter() {
        updateCounterText('antiAfk', `⚡ Jumping in ${state.antiAfkCountdown}s`);
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

    // Update Checker
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

        const pingBtn = createButton('Ping Counter', () => {
            if (state.pingShown) {
                stopPingCounter();
                pingBtn.textContent = 'Ping Counter';
                state.pingShown = false;
            } else {
                startPingCounter();
                pingBtn.textContent = 'Hide Ping Counter';
                state.pingShown = true;
            }
        });
        menuContent.appendChild(pingBtn);

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
        <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(0, 255, 255, 0.2);">
            <strong style="color: var(--nova-primary); font-size: 1rem; display: block; margin-bottom: 6px;">✨ NovaCore v${SCRIPT_VERSION}</strong>
            <div style="font-size: 0.8rem; color: #666;">Premium Miniblox Enhancement</div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ffff;">👨‍💻 Original Creator</strong>
                <div style="color: #aaa;">@Scripter132132</div>
            </div>
            <div>
                <strong style="color: #f39c12;">🔧 Enhanced By</strong>
                <div style="color: #aaa;">@TheM1ddleM1n</div>
            </div>
        </div>

        <div style="font-size: 0.75rem; color: #555; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0, 255, 255, 0.15);">
            MIT License • Open Source • Made with 💎
        </div>
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
        cachedElements.pingBtn = pingBtn;
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

            if (settings.pingShown) {
                startPingCounter();
                state.pingShown = true;
                if (cachedElements.pingBtn) cachedElements.pingBtn.textContent = 'Hide Ping Counter';
                if (settings.positions?.ping && state.counters.ping) {
                    state.counters.ping.style.left = settings.positions.ping.left;
                    state.counters.ping.style.top = settings.positions.ping.top;
                }
            }
        } catch (e) {
            console.error('[NovaCore] Failed to restore settings:', e);
        }
    }

    function globalCleanup() {
        console.log('[NovaCore] Cleaning up resources...');
        stopFPSCounter();
        stopCPSCounter();
        stopRealTimeCounter();
        stopPingCounter();
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

    function init() {
        console.log(`[NovaCore] Initializing v${SCRIPT_VERSION} (With Ping)...`);

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
