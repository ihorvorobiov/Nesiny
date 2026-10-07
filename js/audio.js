/**
 * Robust Web Audio API Sound & Festive Music Controller
 * Features:
 * - Full iOS Safari / WebKit unlock via silent buffer
 * - Procedural festive background music loop (gentle celesta/music-box melody)
 * - Safe procedural sound effects (jump, horseshoe, card flip, chips, table slam, safe unlock, fanfare)
 * - Mute/Unmute toggle
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

        // Auto-unlock on first user interaction anywhere
        this.handleUserUnlock = this.handleUserUnlock.bind(this);
        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
            window.addEventListener(evt, this.handleUserUnlock, { passive: true });
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
                this.musicGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);
            }
        }
    }

    unlock() {
        this.initContext();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        // iOS Safari unlock trick: play 1 sample of silence
        if (!this.isUnlocked) {
            try {
                const buffer = this.ctx.createBuffer(1, 1, 22050);
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(this.ctx.destination);
                source.start(0);
                this.isUnlocked = true;
            } catch (e) {
                // Ignore if not supported
            }
        }

        if (this.musicEnabled && !this.isBgmPlaying) {
            this.startBgm();
        }
    }

    handleUserUnlock() {
        this.unlock();
    }

    toggleMute() {
        this.musicEnabled = !this.musicEnabled;
        this.sfxEnabled = this.musicEnabled;

        if (this.musicEnabled) {
            this.unlock();
            this.startBgm();
            return true;
        } else {
            this.stopBgm();
            return false;
        }
    }

    // ==========================================
    // Festive Background Music (Celesta / Music Box)
    // ==========================================
    startBgm() {
        if (this.isBgmPlaying || !this.musicEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        this.isBgmPlaying = true;
        this.bgmNoteIndex = 0;

        // Celebratory melodic sequence (frequencies in Hz, duration in seconds)
        // Warm C major / G major uplifting festive motif
        const melody = [
            { f: 523.25, d: 0.28, pause: 0.35 }, // C5
            { f: 659.25, d: 0.28, pause: 0.35 }, // E5
            { f: 783.99, d: 0.38, pause: 0.45 }, // G5
            { f: 880.00, d: 0.28, pause: 0.35 }, // A5
            { f: 783.99, d: 0.45, pause: 0.55 }, // G5
            { f: 659.25, d: 0.28, pause: 0.35 }, // E5
            { f: 587.33, d: 0.38, pause: 0.45 }, // D5
            { f: 523.25, d: 0.55, pause: 0.70 }, // C5

            { f: 587.33, d: 0.28, pause: 0.35 }, // D5
            { f: 659.25, d: 0.28, pause: 0.35 }, // E5
            { f: 698.46, d: 0.38, pause: 0.45 }, // F5
            { f: 783.99, d: 0.45, pause: 0.55 }, // G5
            { f: 880.00, d: 0.35, pause: 0.40 }, // A5
            { f: 987.77, d: 0.35, pause: 0.40 }, // B5
            { f: 1046.50, d: 0.65, pause: 0.90 } // C6
        ];

        const playNextNote = () => {
            if (!this.isBgmPlaying || !this.musicEnabled) return;

            const item = melody[this.bgmNoteIndex];
            this.playMusicBoxNote(item.f, item.d);

            this.bgmNoteIndex = (this.bgmNoteIndex + 1) % melody.length;
            this.bgmTimer = setTimeout(playNextNote, item.pause * 1000);
        };

        playNextNote();
    }

    stopBgm() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    playMusicBoxNote(freq, duration) {
        if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Soft bell/celesta timbre (sine with slight overtone)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio policy protection
        }
    }

    // ==========================================
    // Sound Effects (SFX)
    // ==========================================
    playJump() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.16);

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {}
    }

    playCollect() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        const notes = [659.25, 830.61, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = this.ctx.currentTime + idx * 0.06;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + 0.25);
            } catch (e) {}
        });
    }

    playStumble() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.22);

            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch (e) {}
    }

    playCardFlip() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.09);
        } catch (e) {}
    }

    playChips() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        [1200, 1600, 1400].forEach((freq, idx) => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = this.ctx.currentTime + idx * 0.04;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + 0.05);
            } catch (e) {}
        });
    }

    playTableSlam() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.35);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.38);
        } catch (e) {}

        this.playChips();
    }

    playPinClick() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    playBuzzer() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.3);
        } catch (e) {}
    }

    playSafeUnlock() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, idx) => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = this.ctx.currentTime + idx * 0.09;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.22, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + 0.4);
            } catch (e) {}
        });
    }

    playFanfare() {
        if (!this.sfxEnabled) return;
        this.unlock();
        if (!this.ctx || this.ctx.state !== 'running') return;

        const melody = [
            { f: 523.25, t: 0, d: 0.16 },
            { f: 659.25, t: 0.14, d: 0.16 },
            { f: 783.99, t: 0.28, d: 0.22 },
            { f: 1046.50, t: 0.48, d: 0.65 }
        ];

        melody.forEach(n => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = this.ctx.currentTime + n.t;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, t);

                gain.gain.setValueAtTime(0.28, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + n.d);
            } catch (e) {}
        });
    }
}

window.soundController = new SoundController();
