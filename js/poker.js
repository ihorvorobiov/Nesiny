/**
 * Texas Hold'em Poker Module for Husband's Flow
 * Interactive steps: Pre-Flop -> Flop -> Turn -> River (All-in) -> Royal Flush Reveal
 */

class PokerGame {
    constructor() {
        this.currentStep = 0; // 0: Preflop, 1: Flop, 2: Turn, 3: River/Showdown
        this.container = document.getElementById('screen-poker-game');

        this.holeCardsEl = document.getElementById('poker-hole-cards');
        this.communityCardsEl = document.getElementById('poker-community-cards');
        this.statusTextEl = document.getElementById('poker-status-text');
        this.actionAreaEl = document.getElementById('poker-action-area');
        this.potValueEl = document.getElementById('poker-pot-value');
        this.resultModalEl = document.getElementById('poker-result-modal');
        this.tableEl = document.querySelector('.poker-table');

        // Card definitions
        this.holeCards = [
            { rank: 'A', suit: '♠', suitClass: 'spade', label: 'Туз пік' },
            { rank: 'K', suit: '♠', suitClass: 'spade', label: 'Король пік' }
        ];

        this.flopCards = [
            { rank: 'Q', suit: '♠', suitClass: 'spade', label: 'Дама пік' },
            { rank: 'J', suit: '♠', suitClass: 'spade', label: 'Валет пік' },
            { rank: '2', suit: '♦', suitClass: 'diamond', label: 'Двійка бубна' }
        ];

        this.turnCard = { rank: '7', suit: '♣', suitClass: 'club', label: 'Сімка треф' };
        this.riverCard = { rank: '10', suit: '♠', suitClass: 'spade', label: 'Десятка пік' };

        this.bindModalEvents();
    }

    renderCardHTML(card, isRevealed = true, isHighlight = false) {
        if (!isRevealed) {
            return `
                <div class="playing-card card-back">
                    <div class="card-pattern"></div>
                </div>
            `;
        }
        return `
            <div class="playing-card card-front ${card.suitClass} ${isHighlight ? 'royal-highlight' : ''}" data-rank="${card.rank}" data-suit="${card.suit}">
                <div class="card-corner top-left">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit">${card.suit}</span>
                </div>
                <div class="card-center">
                    <span class="card-suit-large">${card.suit}</span>
                </div>
                <div class="card-corner bottom-right">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit">${card.suit}</span>
                </div>
            </div>
        `;
    }

    safePlaySound(name) {
        if (!window.soundController) return;
        try {
            if (name === 'playCardFlip') {
                if (typeof window.soundController.playCardFlip === 'function') {
                    window.soundController.playCardFlip();
                } else if (typeof window.soundController.playDealCard === 'function') {
                    window.soundController.playDealCard();
                }
            } else if (typeof window.soundController[name] === 'function') {
                window.soundController[name]();
            }
        } catch (e) {}
    }

    init() {
        this.currentStep = 0;
        if (this.resultModalEl) {
            this.resultModalEl.classList.remove('active');
        }
        if (this.tableEl) {
            this.tableEl.classList.remove('table-slam-anim');
        }

        // Initial chips sound
        this.safePlaySound('playChips');

        this.showPreflop();
    }

    showPreflop() {
        this.currentStep = 0;
        if (this.potValueEl) this.potValueEl.textContent = '2,400 🟡';

        // Deal hole cards
        this.holeCardsEl.innerHTML = `
            ${this.renderCardHTML(this.holeCards[0])}
            ${this.renderCardHTML(this.holeCards[1])}
        `;

        // Empty / placeholder community cards
        this.communityCardsEl.innerHTML = `
            <div class="card-slot"></div>
            <div class="card-slot"></div>
            <div class="card-slot"></div>
            <div class="card-slot"></div>
            <div class="card-slot"></div>
        `;

        if (this.statusTextEl) {
            this.statusTextEl.innerHTML = `
                <span class="badge-tag">ПРЕФЛОП</span>
                <p class="status-desc">Кишенькові карти здано: <strong>A♠ K♠</strong> — преміальна рука! Попереду три загальні карти.</p>
            `;
        }

        if (this.actionAreaEl) {
            this.actionAreaEl.innerHTML = `
                <button id="btn-poker-flop" class="btn btn-primary btn-poker-step">
                    Дивитися Флоп 👁️
                </button>
            `;
            const flopBtn = document.getElementById('btn-poker-flop');
            if (flopBtn) {
                flopBtn.addEventListener('click', () => {
                    this.showFlop();
                });
            }
        }

        this.safePlaySound('playCardFlip');
    }

    showFlop() {
        this.currentStep = 1;
        if (this.potValueEl) this.potValueEl.textContent = '8,500 🟡';

        this.safePlaySound('playCardFlip');
        setTimeout(() => this.safePlaySound('playChips'), 150);

        this.communityCardsEl.innerHTML = `
            ${this.renderCardHTML(this.flopCards[0])}
            ${this.renderCardHTML(this.flopCards[1])}
            ${this.renderCardHTML(this.flopCards[2])}
            <div class="card-slot"></div>
            <div class="card-slot"></div>
        `;

        if (this.statusTextEl) {
            this.statusTextEl.innerHTML = `
                <span class="badge-tag badge-gold">ФЛОП</span>
                <p class="status-desc"><strong>Q♠ J♠</strong> на столі! Це ж майже легенда: залишилася лише десятка пік до абсолютного Роял-флешу!</p>
            `;
        }

        if (this.actionAreaEl) {
            this.actionAreaEl.innerHTML = `
                <button id="btn-poker-turn" class="btn btn-primary btn-poker-step">
                    Дивитися Тьорн 🃏
                </button>
            `;
            const turnBtn = document.getElementById('btn-poker-turn');
            if (turnBtn) {
                turnBtn.addEventListener('click', () => {
                    this.showTurn();
                });
            }
        }
    }

    showTurn() {
        this.currentStep = 2;
        if (this.potValueEl) this.potValueEl.textContent = '25,000 🟡';

        this.safePlaySound('playCardFlip');
        setTimeout(() => this.safePlaySound('playChips'), 120);

        this.communityCardsEl.innerHTML = `
            ${this.renderCardHTML(this.flopCards[0])}
            ${this.renderCardHTML(this.flopCards[1])}
            ${this.renderCardHTML(this.flopCards[2])}
            ${this.renderCardHTML(this.turnCard)}
            <div class="card-slot"></div>
        `;

        if (this.statusTextEl) {
            this.statusTextEl.innerHTML = `
                <span class="badge-tag badge-amber">ТЬОРН</span>
                <p class="status-desc"><strong>7♣</strong> нічого не змінює — вся інтрига на останній карті. Ставки максимальні, час іти ва-банк заради Альони!</p>
            `;
        }

        if (this.actionAreaEl) {
            this.actionAreaEl.innerHTML = `
                <button id="btn-poker-allin" class="btn btn-allin btn-poker-step pulsating-allin">
                    ALL-IN 💥
                </button>
            `;
            const allinBtn = document.getElementById('btn-poker-allin');
            if (allinBtn) {
                allinBtn.addEventListener('click', () => {
                    this.showRiverAndShowdown();
                });
            }
        }
    }

    showRiverAndShowdown() {
        this.currentStep = 3;
        if (this.potValueEl) this.potValueEl.textContent = '100,000 🏆 (ALL-IN)';

        // Table slam sound & animation
        if (this.tableEl) {
            this.tableEl.classList.add('table-slam-anim');
        }
        this.safePlaySound('playTableSlam');

        // Deal 10 of spades on river
        this.communityCardsEl.innerHTML = `
            ${this.renderCardHTML(this.flopCards[0], true, true)}
            ${this.renderCardHTML(this.flopCards[1], true, true)}
            ${this.renderCardHTML(this.flopCards[2], true, false)}
            ${this.renderCardHTML(this.turnCard, true, false)}
            ${this.renderCardHTML(this.riverCard, true, true)}
        `;

        // Highlight hole cards as well
        this.holeCardsEl.innerHTML = `
            ${this.renderCardHTML(this.holeCards[0], true, true)}
            ${this.renderCardHTML(this.holeCards[1], true, true)}
        `;

        if (this.statusTextEl) {
            this.statusTextEl.innerHTML = `
                <div class="royal-flush-banner">
                    <span class="badge-tag badge-royal">РІВЕР</span>
                    <p class="status-desc victory-glow">Роял-флеш! Це фортуна! Банк повністю твій.</p>
                </div>
            `;
        }

        if (this.actionAreaEl) {
            this.actionAreaEl.innerHTML = `
                <button id="btn-poker-get-pin" class="btn btn-gold btn-poker-step pulsating-gold">
                    Забрати секретний PIN-код 🔑
                </button>
            `;
            const getPinBtn = document.getElementById('btn-poker-get-pin');
            if (getPinBtn) {
                getPinBtn.addEventListener('click', () => {
                    this.openResultModal();
                });
            }
        }

        // Victory fanfare and confetti
        setTimeout(() => this.safePlaySound('playFanfare'), 300);

        if (window.confetti) {
            window.confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        // Automatically open the PIN modal after 1.8 seconds if user didn't click
        setTimeout(() => {
            if (this.resultModalEl && !this.resultModalEl.classList.contains('active')) {
                this.openResultModal();
            }
        }, 1800);
    }

    openResultModal() {
        if (!this.resultModalEl) return;
        this.resultModalEl.classList.add('active');

        this.safePlaySound('playFanfare');

        if (window.confetti) {
            window.confetti({
                particleCount: 100,
                spread: 80,
                origin: { y: 0.5 }
            });
        }
    }

    bindModalEvents() {
        const copyPinBtn = document.getElementById('btn-poker-copy-pin');
        const telegramBtn = document.getElementById('btn-poker-tg-share');
        const toSafeBtn = document.getElementById('btn-poker-to-safe');

        if (copyPinBtn) {
            copyPinBtn.addEventListener('click', () => {
                navigator.clipboard.writeText('0810').then(() => {
                    if (window.showToast) window.showToast('ПІН-код 0810 скопійовано! 📋');
                }).catch(() => {
                    if (window.showToast) window.showToast('Код: 0810');
                });
            });
        }

        if (telegramBtn) {
            telegramBtn.addEventListener('click', () => {
                const baseUrl = window.location.href.split('?')[0].split('#')[0];
                const safeUrl = `${baseUrl}?screen=safe`;
                const message = encodeURIComponent(`Альона, я забрав банк у покері! 🏆\nТвій секретний PIN-код від сейфа: 0810 🔑\n\nВідкривай свій подарунок тут:\n${safeUrl}`);
                const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(safeUrl)}&text=${message}`;
                window.open(tgUrl, '_blank');
            });
        }

        if (toSafeBtn) {
            toSafeBtn.addEventListener('click', () => {
                if (window.appRouter) {
                    window.appRouter.showScreen('screen-safe-lock');
                }
            });
        }
    }
}

window.PokerGame = PokerGame;
