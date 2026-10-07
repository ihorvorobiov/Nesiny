/**
 * Bulletproof Web Audio API Controller
 * - Plays authentic, cheerful "Happy Birthday to You" melody with chords
 * - iOS Safari / WebKit compliant (unlocks on touchend / click)
 * - Sound effects for horse jump, horseshoe pickup, stumble, poker cards, table slam, safe unlock, fanfare
 */

class SoundController {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
        this.musicEnabled = true;
        this.sfxEnabled = true;

        this.bgmTimer = null;
        this.bgmNoteIndex = 0;
        this.isBgmPlaying = false;

        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // "Happy Birthday to You" notes (freq in Hz, duration, delay to next note)
        this.birthdayMelody = [
            // "Hap-py Birth-day to you"
            { f: 392.00, d: 0.32, next: 0.38 }, // G4
            { f: 392.00, d: 0.20, next: 0.24 }, // G4
            { f: 440.00, d: 0.52, next: 0.58 }, // A4
            { f: 392.00, d: 0.52, next: 0.58 }, // G4
            { f: 523.25, d: 0.52, next: 0.58 }, // C5
            { f: 493.88, d: 0.95, next: 1.15 }, // B4

            // "Hap-py Birth-day to you"
            { f: 392.00, d: 0.32, next: 0.38 }, // G4
            { f: 392.00, d: 0.20, next: 0.24 }, // G4
            { f: 440.00, d: 0.52, next: 0.58 }, // A4
            { f: 392.00, d: 0.52, next: 0.58 }, // G4
            { f: 587.33, d: 0.52, next: 0.58 }, // D5
            { f: 523.25, d: 0.95, next: 1.15 }, // C5

            // "Hap-py Birth-day dear A-lya"
            { f: 392.00, d: 0.32, next: 0.38 }, // G4
            { f: 392.00, d: 0.20, next: 0.24 }, // G4
            { f: 783.99, d: 0.52, next: 0.58 }, // G5
            { f: 659.25, d: 0.52, next: 0.58 }, // E5
            { f: 523.25, d: 0.52, next: 0.58 }, // C5
            { f: 493.88, d: 0.52, next: 0.58 }, // B4
            { f: 440.00, d: 0.95, next: 1.15 }, // A4

            // "Hap-py Birth-day to you!"
            { f: 698.46, d: 0.32, next: 0.38 }, // F5
            { f: 698.46, d: 0.20, next: 0.24 }, // F5
            { f: 659.25, d: 0.52, next: 0.58 }, // E5
            { f: 523.25, d: 0.52, next: 0.58 }, // C5
            { f: 587.33, d: 0.52, next: 0.58 }, // D5
            { f: 523.25, d: 1.20, next: 1.80 }  // C5 (pause before repeat)
        ];

        // Global unlock listeners for iOS and desktop
        this.unlockUserAction = this.unlockUserAction.bind(this);
        ['click', 'touchend', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
            window.addEventListener(evt, this.unlockUserAction, { passive: true });
        });
    }

    initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();

                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);
            }
        }
    }

    async unlockUserAction() {
        this.initContext();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {}
        }

        if (!this.isUnlocked) {
            try {
                // Play silent pip to unlock iOS WebKit audio hardware
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
                osc.connect(g);
                g.connect(this.ctx.destination);
                osc.start(this.ctx.currentTime);
                osc.stop(this.ctx.currentTime + 0.02);
                this.isUnlocked = true;
            } catch (e) {}
        }

        if (this.musicEnabled && !this.isBgmPlaying) {
            this.startBgm();
        }
    }

    toggleMute() {
        this.musicEnabled = !this.musicEnabled;
        this.sfxEnabled = this.musicEnabled;

        if (this.musicEnabled) {
            this.unlockUserAction();
            this.startBgm();
            return true;
        } else {
            this.stopBgm();
            return false;
        }
    }

    // ==========================================
    // "Happy Birthday to You" Background Music
    // ==========================================
    startBgm() {
        if (this.isBgmPlaying || !this.musicEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        this.isBgmPlaying = true;
        this.bgmNoteIndex = 0;

        const loopStep = () => {
            if (!this.isBgmPlaying || !this.musicEnabled) return;

            const item = this.birthdayMelody[this.bgmNoteIndex];
            this.playBirthdayTone(item.f, item.d);

            this.bgmNoteIndex = (this.bgmNoteIndex + 1) % this.birthdayMelody.length;
            this.bgmTimer = setTimeout(loopStep, item.next * 1000);
        };

        loopStep();
    }

    stopBgm() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    playBirthdayTone(freq, duration) {
        if (!this.musicEnabled || !this.ctx) return;

        try {
            const now = this.ctx.currentTime;

            // Voice 1: Soft warm bell / celesta
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(freq, now);

            gain1.gain.setValueAtTime(0.001, now);
            gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc1.connect(gain1);
            gain1.connect(this.musicGain);
            osc1.start(now);
            osc1.stop(now + duration);

            // Voice 2: Gentle sine harmonic (sparkle)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, now); // 1 octave higher

            gain2.gain.setValueAtTime(0.001, now);
            gain2.gain.linearRampToValueAtTime(0.06, now + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

            osc2.connect(gain2);
            gain2.connect(this.musicGain);
            osc2.start(now);
            osc2.stop(now + duration);
        } catch (e) {}
    }

    // ==========================================
    // Sound Effects (SFX)
    // ==========================================
    playJump() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    playCollect() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        const chord = [659.25, 830.61, 1046.50, 1318.51];
        chord.forEach((freq, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.05;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.24, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.25);
            } catch (e) {}
        });
    }

    playStumble() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    playCardFlip() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    playChips() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        [1200, 1600, 1400].forEach((freq, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.04;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.05);
            } catch (e) {}
        });
    }

    playTableSlam() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {}

        this.playChips();
    }

    playPinClick() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(950, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {}
    }

    playBuzzer() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);

            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    playSafeUnlock() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.08;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.24, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.4);
            } catch (e) {}
        });
    }

    playFanfare() {
        if (!this.sfxEnabled) return;
        this.unlockUserAction();
        if (!this.ctx) return;

        const notes = [
            { f: 523.25, t: 0, d: 0.16 },
            { f: 659.25, t: 0.14, d: 0.16 },
            { f: 783.99, t: 0.28, d: 0.22 },
            { f: 1046.50, t: 0.48, d: 0.7 }
        ];

        notes.forEach(n => {
            try {
                const now = this.ctx.currentTime + n.t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now);

                gain.gain.setValueAtTime(0.32, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + n.d);
            } catch (e) {}
        });
    }
}

window.soundController = new SoundController();
