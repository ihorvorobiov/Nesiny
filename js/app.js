/**
 * Main Application Controller & Router
 * Manages screen transitions, PIN verification, toasts, and confetti effects
 */

class AppRouter {
    constructor() {
        this.currentScreenId = null;
        this.runnerInstance = null;
        this.pokerInstance = null;

        this.init();
    }

    init() {
        this.bindGlobalEvents();
        this.bindSafePinInputs();
        this.bindFinalScreenActions();
        this.initSoundCheckModal();

        // Fallback if modal is not present
        const soundModal = document.getElementById('sound-check-modal');
        if (!soundModal) {
            const urlParams = new URLSearchParams(window.location.search);
            const player = (urlParams.get('player') || '').toLowerCase();
            const screenParam = (urlParams.get('screen') || urlParams.get('unlock') || '').toLowerCase();

            if (player === 'husband' || player === 'dima') {
                this.showScreen('screen-poker-game');
            } else if (screenParam === 'safe') {
                this.showScreen('screen-safe-lock');
            } else {
                this.showScreen('screen-sister-welcome');
            }
        }
    }

    showScreen(screenId) {
        const screens = document.querySelectorAll('.app-screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });

        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreenId = screenId;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Switch sound tracks based on screen:
        // Horse game -> upbeat arcade music
        // Poker -> spy mystery jazz
        // Other screens (Welcome, Safe, Finale) -> Happy Birthday to You
        if (window.soundController) {
            if (screenId === 'screen-horse-game') {
                window.soundController.playTrack('runner');
            } else if (screenId === 'screen-poker-game') {
                window.soundController.playTrack('poker');
            } else {
                window.soundController.playTrack('birthday');
            }
        }

        // Initialize screen-specific modules
        if (screenId === 'screen-horse-game') {
            this.initRunnerScreen();
        } else if (screenId === 'screen-poker-game') {
            this.initPokerScreen();
        } else if (screenId === 'screen-final-reveal') {
            this.triggerFinalCelebration();
        }
    }

    initRunnerScreen() {
        if (window.soundController) {
            window.soundController.playGameStart();
        }
        if (!this.runnerInstance) {
            this.runnerInstance = new window.HorseRunnerGame('runner-canvas', {
                onFinish: () => {
                    this.showScreen('screen-safe-lock');
                },
                onUpdateUI: (data) => {
                    const horseshoesEl = document.getElementById('runner-horseshoes-count');
                    const timerEl = document.getElementById('runner-time-left');
                    if (horseshoesEl) {
                        horseshoesEl.textContent = `${data.horseshoes} / ${data.targetHorseshoes}`;
                    }
                    if (timerEl) {
                        timerEl.textContent = `${data.timeLeft}s`;
                    }
                }
            });
        }
        this.runnerInstance.start();
    }

    initPokerScreen() {
        if (!this.pokerInstance) {
            this.pokerInstance = new window.PokerGame();
        }
        this.pokerInstance.init();
    }

    initSoundCheckModal() {
        const soundModal = document.getElementById('sound-check-modal');
        const testSlider = document.getElementById('sound-test-slider');
        const volumeVal = document.getElementById('sound-volume-val');
        const pingBtn = document.getElementById('btn-sound-test-ping');
        const allHeardBtn = document.getElementById('btn-sound-all-heard');

        // Check URL parameters for role / direct screen bypass
        const urlParams = new URLSearchParams(window.location.search);
        const player = (urlParams.get('player') || '').toLowerCase();
        const screenParam = (urlParams.get('screen') || urlParams.get('unlock') || '').toLowerCase();

        const isDima = (player === 'husband' || player === 'dima');
        const isSafe = (screenParam === 'safe');

        // Volume slider update
        if (testSlider && volumeVal) {
            testSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                volumeVal.textContent = `${val}%`;
            });
        }

        // Test chime button
        if (pingBtn) {
            pingBtn.addEventListener('click', () => {
                const volRatio = testSlider ? (parseInt(testSlider.value, 10) / 100) : 0.8;
                if (window.soundController) {
                    window.soundController.handleUserGesture();
                    window.soundController.playTestPing(volRatio);
                }
            });
        }

        // Confirmation button: unlocks audio and enters appropriate flow
        if (allHeardBtn) {
            allHeardBtn.addEventListener('click', () => {
                if (window.soundController) {
                    window.soundController.handleUserGesture();
                }

                if (soundModal) {
                    soundModal.classList.remove('active');
                }

                if (isDima) {
                    // Dima's flow starts directly at poker
                    this.showScreen('screen-poker-game');
                } else if (isSafe) {
                    // Direct link to safe bypass
                    this.showScreen('screen-safe-lock');
                } else {
                    // Alona's flow: run pseudo loading animation 0 to 36
                    this.runPseudoLoader(() => {
                        this.showScreen('screen-sister-welcome');
                    });
                }
            });
        }
    }

    runPseudoLoader(onComplete) {
        const loader = document.getElementById('pseudo-loader-overlay');
        const numEl = document.getElementById('pseudo-loader-number');
        const fillEl = document.getElementById('loader-bar-fill');
        const hintEl = document.getElementById('loader-status-hint');

        if (!loader) {
            if (onComplete) onComplete();
            return;
        }

        loader.classList.add('active');

        let current = 0;
        const target = 38;
        const totalDuration = 1800; // 1.8 seconds
        const intervalTime = Math.floor(totalDuration / target);

        const hints = [
            { max: 10, text: 'Підготовка святкового настрою... 🎈' },
            { max: 20, text: 'Калібрування сюрпризів... ✨' },
            { max: 32, text: 'Підключення святкової музики... 🎶' },
            { max: 38, text: 'Святковий протокол активовано! 🎂' }
        ];

        const timer = setInterval(() => {
            current++;
            if (numEl) numEl.textContent = current;
            if (fillEl) fillEl.style.width = `${Math.round((current / target) * 100)}%`;

            const matchedHint = hints.find(h => current <= h.max);
            if (matchedHint && hintEl) {
                hintEl.textContent = matchedHint.text;
            }

            if (current >= target) {
                clearInterval(timer);
                if (window.soundController && typeof window.soundController.playVictory === 'function') {
                    window.soundController.playVictory();
                }

                setTimeout(() => {
                    loader.classList.remove('active');
                    if (onComplete) onComplete();
                }, 400);
            }
        }, intervalTime);
    }

    bindGlobalEvents() {
        // Start Quest button (Sister Welcome -> Runner)
        const startQuestBtn = document.getElementById('btn-start-quest');
        if (startQuestBtn) {
            startQuestBtn.addEventListener('click', () => {
                if (window.soundController) {
                    window.soundController.handleUserGesture();
                }
                this.showScreen('screen-horse-game');
            });
        }

        // Welcome screen direct music trigger button
        const musicWelcomeBtn = document.getElementById('btn-music-pill-welcome');
        const musicWelcomeText = document.getElementById('music-welcome-text');
        if (musicWelcomeBtn) {
            musicWelcomeBtn.addEventListener('click', () => {
                if (window.soundController) {
                    window.soundController.handleUserGesture();
                    window.soundController.playTrack('birthday');
                    if (musicWelcomeText) {
                        musicWelcomeText.textContent = '🎶 Грає святкова мелодія! ✨';
                    }
                    musicWelcomeBtn.classList.add('playing');
                }
            });
        }

        // Runner Retry button (Modal)
        const runnerRetryBtn = document.getElementById('btn-runner-retry');
        if (runnerRetryBtn) {
            runnerRetryBtn.addEventListener('click', () => {
                const modal = document.getElementById('runner-retry-modal');
                if (modal) modal.classList.remove('active');
                if (this.runnerInstance) {
                    this.runnerInstance.start();
                }
            });
        }

        // Audio toggle button in header
        const soundToggleBtn = document.getElementById('btn-sound-toggle');
        const soundIcon = document.getElementById('sound-icon');
        const soundLabel = document.getElementById('sound-label');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                if (window.soundController) {
                    window.soundController.handleUserGesture();
                    const isEnabled = window.soundController.toggleMute();
                    if (soundIcon) soundIcon.textContent = isEnabled ? '🎵' : '🔇';
                    if (soundLabel) soundLabel.textContent = isEnabled ? 'Музика: Увімкн.' : 'Без звуку';
                    soundToggleBtn.classList.toggle('muted', !isEnabled);
                }
            });
        }

        // Telegram Share for Alona -> Dima on Safe Screen
        const telegramShareDimaBtn = document.getElementById('btn-telegram-share-dima');
        if (telegramShareDimaBtn) {
            telegramShareDimaBtn.addEventListener('click', () => {
                const baseUrl = window.location.href.split('?')[0].split('#')[0];
                const husbandUrl = `${baseUrl}?player=dima`;
                const text = `Діма, твій хід! Я щойно пройшла свій святковий рівень, але для відкриття подарунка потрібна командна робота 🎁\nТвоя місія — здобути секретний PIN-код для розблокування сюрпризу! 🚀`;
                const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(husbandUrl)}&text=${encodeURIComponent(text)}`;
                window.open(tgUrl, '_blank');
            });
        }
    }

    bindSafePinInputs() {
        const inputs = Array.from(document.querySelectorAll('.pin-input'));
        const safeContainer = document.getElementById('safe-container');
        const safeErrorMsg = document.getElementById('safe-error-msg');

        if (!inputs.length) return;

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val ? val[val.length - 1] : '';

                if (window.soundController && val) {
                    window.soundController.playPinClick();
                }

                if (e.target.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }

                this.checkPinCompletion(inputs, safeContainer, safeErrorMsg);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            // Handle Paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
                const cleanDigits = pasteData.replace(/[^0-9]/g, '').slice(0, 4);

                if (cleanDigits.length > 0) {
                    cleanDigits.split('').forEach((digit, i) => {
                        if (inputs[i]) inputs[i].value = digit;
                    });
                    const nextIndex = Math.min(cleanDigits.length, inputs.length - 1);
                    inputs[nextIndex].focus();
                    this.checkPinCompletion(inputs, safeContainer, safeErrorMsg);
                }
            });
        });
    }

    checkPinCompletion(inputs, safeContainer, safeErrorMsg) {
        const pin = inputs.map(i => i.value).join('');
        if (pin.length === 4) {
            if (pin === '0810') {
                this.handleSuccessfulUnlock(safeContainer, inputs);
            } else {
                this.handleFailedUnlock(safeContainer, inputs, safeErrorMsg);
            }
        }
    }

    handleSuccessfulUnlock(safeContainer, inputs) {
        if (safeContainer) {
            safeContainer.classList.add('safe-unlocked');
        }
        inputs.forEach(i => {
            i.classList.add('pin-success');
            i.disabled = true;
        });

        const hubIcon = document.getElementById('hub-lock-icon');
        if (hubIcon) hubIcon.textContent = '🔓';

        if (window.soundController) {
            window.soundController.playSafeUnlock();
        }

        this.showToast('✅ Код 0810 прийнято! Сейф відчиняється...');

        // Confetti burst
        if (window.confetti) {
            window.confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.55 }
            });
        }

        setTimeout(() => {
            this.showScreen('screen-final-reveal');
        }, 2200);
    }

    handleFailedUnlock(safeContainer, inputs, safeErrorMsg) {
        if (safeContainer) {
            safeContainer.classList.add('shake-error');
            setTimeout(() => safeContainer.classList.remove('shake-error'), 600);
        }
        inputs.forEach(i => {
            i.classList.add('pin-error');
        });

        if (window.soundController) {
            window.soundController.playBuzzer();
        }

        if (safeErrorMsg) {
            safeErrorMsg.textContent = '❌ Невірний код. Запитай другу частину шифру в чоловіка!';
            safeErrorMsg.style.display = 'block';
        }

        setTimeout(() => {
            inputs.forEach(i => {
                i.value = '';
                i.classList.remove('pin-error');
            });
            inputs[0].focus();
        }, 900);
    }

    triggerFinalCelebration() {
        if (window.soundController) {
            window.soundController.playFanfare();
        }

        // Magnificent multi-stage confetti
        if (window.confetti) {
            const duration = 3.5 * 1000;
            const end = Date.now() + duration;

            (function frame() {
                window.confetti({
                    particleCount: 4,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.7 }
                });
                window.confetti({
                    particleCount: 4,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.7 }
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            })();
        }
    }

    bindFinalScreenActions() {
        const copyCertBtn = document.getElementById('btn-copy-certificate-code');
        const certCodeEl = document.getElementById('certificate-code-text');

        if (copyCertBtn && certCodeEl) {
            copyCertBtn.addEventListener('click', () => {
                const code = certCodeEl.textContent.trim();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        this.showToast('✨ Промокод скопійовано! 🧖');
                    }).catch(() => {
                        this.showToast(`Промокод: ${code}`);
                    });
                } else {
                    window.prompt('Промокод для спа:', code);
                }
            });
        }
    }

    showToast(message, duration = 3200) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

// Global toast helper
window.showToast = function(msg) {
    if (window.appRouter) {
        window.appRouter.showToast(msg);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.appRouter = new AppRouter();
});
