// Audio Controller using Web Audio API (procedural sounds, zero external audio assets)
class SoundController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initOnInteraction = this.initOnInteraction.bind(this);
        window.addEventListener('click', this.initOnInteraction, { once: true });
        window.addEventListener('touchstart', this.initOnInteraction, { once: true });
    }

    initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    initOnInteraction() {
        this.initContext();
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playTone(freq, type = 'sine', duration = 0.1, startTime = 0, gainVal = 0.15) {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    // Horse jump sound (gentle swoosh / bounce)
    playJump() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    // Horseshoe collected chime (magical arpeggio)
    playCollect() {
        if (!this.enabled) return;
        const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'triangle', 0.22, idx * 0.05, 0.18);
        });
    }

    // Horse stumble chill boing sound
    playStumble() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    // Card deal / flip swoosh
    playCardFlip() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        // White noise burst for card rustle
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start();

        // Subtle low thump
        this.playTone(180, 'sine', 0.05, 0.01, 0.1);
    }

    // Poker chips clicking sound
    playChips() {
        if (!this.enabled) return;
        this.playTone(1200, 'sine', 0.04, 0, 0.12);
        this.playTone(1800, 'triangle', 0.04, 0.03, 0.1);
        this.playTone(1400, 'sine', 0.05, 0.06, 0.08);
    }

    // Heavy table slam / All-in impact
    playTableSlam() {
        if (!this.enabled) return;
        this.initContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);

        this.playChips();
    }

    // Safe mechanical key / tumbler click
    playPinClick() {
        if (!this.enabled) return;
        this.playTone(850, 'sine', 0.04, 0, 0.1);
    }

    // Wrong code buzzer
    playBuzzer() {
        if (!this.enabled) return;
        this.playTone(160, 'sawtooth', 0.25, 0, 0.15);
        this.playTone(140, 'sawtooth', 0.25, 0.08, 0.15);
    }

    // Safe unlocked & open chime
    playSafeUnlock() {
        if (!this.enabled) return;
        this.playTone(523.25, 'triangle', 0.15, 0, 0.2); // C5
        this.playTone(659.25, 'triangle', 0.15, 0.1, 0.2); // E5
        this.playTone(783.99, 'triangle', 0.2, 0.2, 0.22); // G5
        this.playTone(1046.50, 'triangle', 0.4, 0.3, 0.25); // C6
    }

    // Victory fanfare (Royal flush & Final reveal)
    playFanfare() {
        if (!this.enabled) return;
        const notes = [
            { f: 523.25, d: 0.15, t: 0 },    // C5
            { f: 659.25, d: 0.15, t: 0.14 }, // E5
            { f: 783.99, d: 0.15, t: 0.28 }, // G5
            { f: 1046.50, d: 0.5, t: 0.42 }  // C6
        ];
        notes.forEach(n => {
            this.playTone(n.f, 'triangle', n.d, n.t, 0.25);
        });
    }
}

window.soundController = new SoundController();
