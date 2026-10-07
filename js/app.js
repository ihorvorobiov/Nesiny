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

        // Check URL parameter for player role
        const urlParams = new URLSearchParams(window.location.search);
        const player = (urlParams.get('player') || '').toLowerCase();

        if (player === 'husband' || player === 'dima') {
            this.showScreen('screen-poker-game');
        } else {
            // Default: Alona / Sister greeting
            this.showScreen('screen-sister-welcome');
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

    bindGlobalEvents() {
        // Start Quest button (Sister Welcome -> Runner)
        const startQuestBtn = document.getElementById('btn-start-quest');
        if (startQuestBtn) {
            startQuestBtn.addEventListener('click', () => {
                this.showScreen('screen-horse-game');
            });
        }

        // Audio toggle button
        const soundToggleBtn = document.getElementById('btn-sound-toggle');
        const soundIcon = document.getElementById('sound-icon');
        const soundLabel = document.getElementById('sound-label');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                if (window.soundController) {
                    const isEnabled = window.soundController.toggleMute();
                    if (soundIcon) soundIcon.textContent = isEnabled ? '🎵' : '🔇';
                    if (soundLabel) soundLabel.textContent = isEnabled ? 'Музика: Увімкн.' : 'Без звуку';
                    soundToggleBtn.classList.toggle('muted', !isEnabled);
                }
            });
        }

        // Copy Dima Link button on Safe screen
        const copyHusbandLinkBtn = document.getElementById('btn-copy-husband-link');
        const copyLinkText = document.getElementById('copy-link-text');
        const telegramShareDimaBtn = document.getElementById('btn-telegram-share-dima');

        const getHusbandUrl = () => {
            const baseUrl = window.location.href.split('?')[0].split('#')[0];
            return `${baseUrl}?player=dima`;
        };

        const copyHusbandAction = () => {
            const husbandUrl = getHusbandUrl();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(husbandUrl).then(() => {
                    this.showToast('🔗 Посилання для Діми скопійовано! Надішли йому у месенджер');
                    if (copyLinkText) copyLinkText.textContent = 'Скопіювали лінк для Діми! ✅';
                    setTimeout(() => {
                        if (copyLinkText) copyLinkText.textContent = 'Скопіювати лінк для Діми 🔗';
                    }, 3500);
                }).catch(() => {
                    window.prompt('Скопіюй це посилання для Діми:', husbandUrl);
                });
            } else {
                window.prompt('Скопіюй це посилання для Діми:', husbandUrl);
            }
        };

        if (copyHusbandLinkBtn) {
            copyHusbandLinkBtn.addEventListener('click', copyHusbandAction);
        }

        if (telegramShareDimaBtn) {
            telegramShareDimaBtn.addEventListener('click', () => {
                const husbandUrl = getHusbandUrl();
                const msg = encodeURIComponent('Діма, твій хід! Я щойно подолала забіг і застрягла біля сейфа 🔒\nПереходь за посиланням, зірви банк у покері та отримай ключ деблокування! ♠️🏆');
                const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(husbandUrl)}&text=${msg}`;
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

        if (window.soundController) {
            window.soundController.playSafeUnlock();
        }

        this.showToast('✅ Код прийнято! Відкриваємо сейф...');

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
        }, 1600);
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
        const bookBtn = document.getElementById('btn-book-relax');
        const bookingModal = document.getElementById('booking-modal');
        const closeBookingBtn = document.getElementById('btn-close-booking-modal');

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

        if (bookBtn && bookingModal) {
            bookBtn.addEventListener('click', () => {
                bookingModal.classList.add('active');
            });
        }

        if (closeBookingBtn && bookingModal) {
            closeBookingBtn.addEventListener('click', () => {
                bookingModal.classList.remove('active');
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
