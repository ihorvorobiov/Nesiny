/**
 * Professional Polyphonic Web Audio Engine
 * Features 3 complete dynamic tracks with beats, bass, chords & melody:
 * 1. "birthday": Authentic celebratory "Happy Birthday to You" with waltz rhythm & chords (Screens 1, 3, 5)
 * 2. "runner": High-energy, positive, bouncy arcade music with drums & bass (Screen 2 Horse Game)
 * 3. "poker": Suspenseful, rhythmic spy / James Bond mystery jazz with walking bass (Screen 4 Poker)
 *
 * Fully compliant with iOS Safari, Chrome, and mobile Autoplay security policies.
 */

class SoundController {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
        this.isMuted = false;

        this.currentTrack = null; // 'birthday', 'runner', 'poker'
        this.schedulerTimer = null;
        this.currentStep = 0;
        this.nextStepTime = 0;

        // Noise buffer for drum snares & hats
        this.noiseBuffer = null;

        // Master gains
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Listen for direct user activation gestures on all standard mobile & desktop events
        this.handleUserGesture = this.handleUserGesture.bind(this);
        ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach(evt => {
            window.addEventListener(evt, this.handleUserGesture, { passive: true });
        });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();

                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(0.72, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);

                this.initNoiseBuffer();
            }
        }

        // Direct synchronous resume call essential for WebKit / Safari
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    initNoiseBuffer() {
        if (!this.ctx || this.noiseBuffer) return;
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    handleUserGesture() {
        this.ensureContext();
        if (!this.ctx) return;

        // Synchronous resume for iOS WebKit transient activation
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        if (!this.isUnlocked) {
            try {
                // iOS WebKit silent oscillator ping
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
                osc.connect(g);
                g.connect(this.ctx.destination);
                osc.start(0);
                osc.stop(this.ctx.currentTime + 0.01);
                this.isUnlocked = true;
            } catch (e) {}
        }

        // Start active track if scheduler not currently running
        if (!this.isMuted && this.currentTrack && !this.schedulerTimer) {
            this.startScheduler();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.ensureContext();

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        if (this.isMuted) {
            this.stopScheduler();
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }
            return false;
        } else {
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
            }
            if (this.currentTrack) {
                this.startScheduler();
            }
            return true;
        }
    }

    // ==========================================
    // Dynamic Track Switching
    // ==========================================
    playTrack(trackName) {
        if (this.currentTrack === trackName && this.schedulerTimer) return;
        this.currentTrack = trackName;
        this.currentStep = 0;

        if (this.isMuted) return;

        this.ensureContext();
        if (this.ctx) {
            if (this.ctx.state === 'running') {
                this.startScheduler();
            } else {
                this.ctx.resume().then(() => {
                    if (!this.isMuted && this.currentTrack) {
                        this.startScheduler();
                    }
                }).catch(() => {});
                // Pre-launch scheduler so it fires the moment context resumes
                this.startScheduler();
            }
        }
    }

    startScheduler() {
        this.stopScheduler();
        if (!this.ctx || this.isMuted || !this.currentTrack) return;

        this.nextStepTime = this.ctx.currentTime + 0.05;
        this.schedulerTimer = setInterval(() => this.scheduleLoop(), 25);
    }

    stopScheduler() {
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    scheduleLoop() {
        if (!this.ctx || this.isMuted || !this.currentTrack) return;

        // If context is suspended, advance nextStepTime and wait for resume
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
            this.nextStepTime = this.ctx.currentTime + 0.05;
            return;
        }

        // Avoid scheduling backlog if timer fell behind
        if (this.nextStepTime < this.ctx.currentTime) {
            this.nextStepTime = this.ctx.currentTime + 0.05;
        }

        // Lookahead window: schedule notes occurring in next 140ms
        while (this.nextStepTime < this.ctx.currentTime + 0.14) {
            this.dispatchTrackStep(this.currentTrack, this.currentStep, this.nextStepTime);
            this.advanceStep(this.currentTrack);
        }
    }

    advanceStep(track) {
        let stepDuration = 0.25;

        if (track === 'birthday') {
            stepDuration = 0.28; // ~107 bpm
            this.currentStep = (this.currentStep + 1) % 48;
        } else if (track === 'runner') {
            stepDuration = 0.18; // ~138 bpm
            this.currentStep = (this.currentStep + 1) % 32;
        } else if (track === 'poker') {
            stepDuration = 0.24; // ~125 bpm
            this.currentStep = (this.currentStep + 1) % 32;
        }

        this.nextStepTime += stepDuration;
    }

    dispatchTrackStep(track, step, time) {
        if (track === 'birthday') {
            this.stepBirthdayTrack(step, time);
        } else if (track === 'runner') {
            this.stepRunnerTrack(step, time);
        } else if (track === 'poker') {
            this.stepPokerTrack(step, time);
        }
    }

    // ==========================================
    // TRACK 1: "Happy Birthday to You" (Waltz & Polyphony)
    // ==========================================
    stepBirthdayTrack(step, time) {
        // 3/4 waltz measure = 6 eighth-note steps per measure
        const sub = step % 6;

        // Soft waltz rhythm: soft kick on beat 1, brushed cymbal on beats 2 & 3
        if (sub === 0) {
            this.playKick(time, 0.28);
            // Root bass note
            const bassNotes = [130.81, 130.81, 196.00, 130.81, 174.61, 130.81, 196.00, 130.81]; // C3, G3, F3
            const bIdx = Math.floor(step / 6) % bassNotes.length;
            this.playBass(time, bassNotes[bIdx], 0.6, 'triangle', 0.28);
        } else if (sub === 2 || sub === 4) {
            this.playHiHat(time, 0.1, false);
            // Soft chord accompaniment
            const chords = [
                [261.63, 329.63, 392.00], // C maj
                [246.94, 293.66, 392.00], // G maj
                [246.94, 293.66, 392.00], // G maj
                [261.63, 329.63, 392.00], // C maj
                [261.63, 349.23, 440.00], // F maj
                [261.63, 329.63, 392.00], // C maj
                [246.94, 293.66, 392.00], // G maj
                [261.63, 329.63, 392.00]  // C maj
            ];
            const cIdx = Math.floor(step / 6) % chords.length;
            this.playChord(time, chords[cIdx], 0.35, 0.1);
        }

        // Complete recognizable "Happy Birthday" melody map
        // Step map: 48 steps total (8 measures * 6 steps)
        const melodyMap = {
            // Measure 1: "Hap-py Birth-day"
            0: 392.00, 1: 392.00, 2: 440.00, 4: 392.00,
            // Measure 2: "to you"
            6: 523.25, 8: 493.88,
            // Measure 3: "Hap-py Birth-day"
            12: 392.00, 13: 392.00, 14: 440.00, 16: 392.00,
            // Measure 4: "to you"
            18: 587.33, 20: 523.25,
            // Measure 5: "Hap-py Birth-day"
            24: 392.00, 25: 392.00, 26: 783.99, 28: 659.25,
            // Measure 6: "dear A-lya"
            30: 523.25, 32: 493.88, 34: 440.00,
            // Measure 7: "Hap-py Birth-day"
            36: 698.46, 37: 698.46, 38: 659.25, 40: 523.25,
            // Measure 8: "to you!"
            42: 587.33, 44: 523.25
        };

        if (melodyMap[step]) {
            const freq = melodyMap[step];
            const dur = (step === 8 || step === 20 || step === 34 || step === 44) ? 0.85 : 0.44;
            this.playLeadNote(time, freq, dur, 'celesta', 0.35);
        }
    }

    // ==========================================
    // TRACK 2: "Runner" (Bouncy Positive Arcade Music)
    // ==========================================
    stepRunnerTrack(step, time) {
        // Fast 4/4 electro beat (16 steps = 1 bar, 32 steps total loop)
        const beatInBar = step % 4;

        // Drums: Four-on-the-floor kick, Snappy snare on 2 and 4, Hi-hats every 16th note
        if (beatInBar === 0) {
            this.playKick(time, 0.45);
        }
        if (beatInBar === 2) {
            this.playSnare(time, 0.32);
        }
        this.playHiHat(time, 0.14, beatInBar === 1 || beatInBar === 3);

        // Bouncing arcade bassline (funky 8-bit disco bass)
        const bassNotes = [
            130.81, 261.63, 130.81, 261.63, // C3, C4
            146.83, 293.66, 146.83, 293.66, // D3, D4
            164.81, 329.63, 164.81, 329.63, // E3, E4
            174.61, 349.23, 196.00, 392.00  // F3, F4, G3, G4
        ];
        const bFreq = bassNotes[step % bassNotes.length];
        this.playBass(time, bFreq, 0.14, 'sawtooth', 0.26);

        // Cheerful upbeat arcade melody
        const runnerMelody = {
            0: 523.25, 2: 659.25, 4: 783.99, 6: 1046.50,
            8: 880.00, 10: 783.99, 12: 659.25, 14: 783.99,
            16: 659.25, 18: 587.33, 20: 523.25, 22: 587.33,
            24: 659.25, 26: 783.99, 28: 1046.50, 30: 1174.66
        };

        if (runnerMelody[step]) {
            this.playLeadNote(time, runnerMelody[step], 0.22, 'arcade', 0.3);
        }
    }

    // ==========================================
    // TRACK 3: "Poker" (Spy / James Bond Mystery Jazz)
    // ==========================================
    stepPokerTrack(step, time) {
        // Spy Jazz groove: Moody kick, snappy rimshot, mystery swing ride cymbal
        const sub = step % 4;

        if (sub === 0) {
            this.playKick(time, 0.36);
        }
        if (sub === 2) {
            this.playSnare(time, 0.26); // Snappy spy rimshot
        }
        // Jazz ride cymbal swing
        if (sub === 0 || sub === 2 || sub === 3) {
            this.playHiHat(time, 0.12, sub === 3);
        }

        // Iconic walking spy chromatic bassline: E -> G -> A -> Bb -> A -> G
        const spyBass = [
            82.41, 82.41, 98.00, 98.00,    // E2, G2
            110.00, 110.00, 116.54, 116.54,// A2, Bb2 (tension!)
            110.00, 110.00, 98.00, 98.00,  // A2, G2
            82.41, 82.41, 73.42, 77.78     // E2, D2, Eb2
        ];
        const bassFreq = spyBass[step % spyBass.length];
        this.playBass(time, bassFreq, 0.28, 'triangle', 0.34);

        // Eerie spy chords & tension stabs (Em9, Em6)
        if (step === 0 || step === 16) {
            this.playChord(time, [329.63, 392.00, 493.88, 587.33], 0.65, 0.12); // Em9
        } else if (step === 8 || step === 24) {
            this.playChord(time, [329.63, 370.00, 440.00, 554.37], 0.55, 0.12); // Em6
        }

        // Dramatic James Bond spy brass motif
        const spyLead = {
            4: 659.25,   // E5
            7: 783.99,   // G5
            10: 739.99,  // F#5 (mystery!)
            14: 659.25,  // E5
            20: 830.61,  // G#5
            23: 783.99,  // G5
            26: 739.99,  // F#5
            29: 659.25   // E5
        };

        if (spyLead[step]) {
            this.playLeadNote(time, spyLead[step], 0.35, 'brass', 0.26);
        }
    }

    // ==========================================
    // Synthesizer Voice Generators
    // ==========================================
    playKick(time, gainVal = 0.35) {
        if (!this.ctx) return;
        try {
            const t = Math.max(time, this.ctx.currentTime + 0.005);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

            gain.gain.setValueAtTime(gainVal, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    playSnare(time, gainVal = 0.25) {
        if (!this.ctx || !this.noiseBuffer) return;
        try {
            const t = Math.max(time, this.ctx.currentTime + 0.005);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            noise.start(t);
            noise.stop(t + 0.15);

            // Drum body snap
            const body = this.ctx.createOscillator();
            const bodyGain = this.ctx.createGain();
            body.type = 'triangle';
            body.frequency.setValueAtTime(180, t);
            body.frequency.exponentialRampToValueAtTime(80, t + 0.08);

            bodyGain.gain.setValueAtTime(gainVal * 0.8, t);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            body.connect(bodyGain);
            bodyGain.connect(this.musicGain);

            body.start(t);
            body.stop(t + 0.08);
        } catch (e) {}
    }

    playHiHat(time, gainVal = 0.12, isOpen = false) {
        if (!this.ctx || !this.noiseBuffer) return;
        try {
            const t = Math.max(time, this.ctx.currentTime + 0.005);
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(6500, t);

            const dur = isOpen ? 0.12 : 0.04;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            noise.start(t);
            noise.stop(t + dur);
        } catch (e) {}
    }

    playBass(time, freq, duration, type = 'triangle', gainVal = 0.25) {
        if (!this.ctx) return;
        try {
            const t = Math.max(time, this.ctx.currentTime + 0.005);
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, t);
            filter.frequency.exponentialRampToValueAtTime(200, t + duration);

            gain.gain.setValueAtTime(gainVal, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    playLeadNote(time, freq, duration, timbre = 'celesta', gainVal = 0.32) {
        if (!this.ctx) return;
        try {
            const t = Math.max(time, this.ctx.currentTime + 0.005);

            if (timbre === 'celesta') {
                // Dual chime tone: warm bell + bright shimmer harmonic
                const osc1 = this.ctx.createOscillator();
                const gain1 = this.ctx.createGain();
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(freq, t);

                gain1.gain.setValueAtTime(0.001, t);
                gain1.gain.linearRampToValueAtTime(gainVal * 0.75, t + 0.02);
                gain1.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc1.connect(gain1);
                gain1.connect(this.musicGain);
                osc1.start(t);
                osc1.stop(t + duration);

                // Sparkling chime harmonic (octave)
                const osc2 = this.ctx.createOscillator();
                const gain2 = this.ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(freq * 2, t);

                gain2.gain.setValueAtTime(0.001, t);
                gain2.gain.linearRampToValueAtTime(gainVal * 0.35, t + 0.015);
                gain2.gain.exponentialRampToValueAtTime(0.0001, t + duration * 0.7);

                osc2.connect(gain2);
                gain2.connect(this.musicGain);
                osc2.start(t);
                osc2.stop(t + duration * 0.7);
            } else if (timbre === 'arcade') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(gainVal * 0.5, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(t);
                osc.stop(t + duration);
            } else if (timbre === 'brass') {
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1400, t);
                filter.frequency.exponentialRampToValueAtTime(600, t + duration);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(gainVal * 0.6, t + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);
                osc.start(t);
                osc.stop(t + duration);
            } else {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(gainVal, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(t);
                osc.stop(t + duration);
            }
        } catch (e) {}
    }

    playChord(time, freqs, duration, gainVal = 0.1) {
        if (!this.ctx) return;
        const t = Math.max(time, this.ctx.currentTime + 0.005);
        freqs.forEach(f => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(gainVal, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(gain);
                gain.connect(this.musicGain);

                osc.start(t);
                osc.stop(t + duration);
            } catch (e) {}
        });
    }

    // ==========================================
    // Interactive Sound Effects (SFX)
    // ==========================================
    playGameStart() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            this.playLeadNote(this.ctx.currentTime + idx * 0.06, f, 0.15, 'arcade', 0.35);
        });
    }

    playJump() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(580, now + 0.16);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    playCollect() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        [659.25, 830.61, 1046.50, 1318.51].forEach((f, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.05;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.14);
            } catch (e) {}
        });
    }

    playStumble() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    playDealCard() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    playCardFlip() {
        this.playDealCard();
    }

    playChips() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        [1200, 1600, 1400].forEach((f, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.04;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now);

                gain.gain.setValueAtTime(0.22, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.05);
            } catch (e) {}
        });
    }

    playTableSlam() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

            gain.gain.setValueAtTime(0.55, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {}

        this.playChips();
    }

    playPinClick() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(950, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {}
    }

    playBuzzer() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    playVictory() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const notes = [
            { f: 523.25, t: 0, d: 0.12 },     // C5
            { f: 659.25, t: 0.11, d: 0.12 },    // E5
            { f: 783.99, t: 0.22, d: 0.14 },    // G5
            { f: 1046.50, t: 0.36, d: 0.35 },   // C6
            { f: 880.00, t: 0.50, d: 0.18 },    // A5
            { f: 1046.50, t: 0.68, d: 0.6 }     // C6
        ];
        notes.forEach(n => {
            try {
                const now = this.ctx.currentTime + n.t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + n.d);
            } catch (e) {}
        });
    }

    playSafeUnlock() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            try {
                const now = this.ctx.currentTime + idx * 0.08;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now);

                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now);
                osc.stop(now + 0.4);
            } catch (e) {}
        });
    }

    playFanfare() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const melody = [
            { f: 523.25, t: 0, d: 0.16 },
            { f: 659.25, t: 0.14, d: 0.16 },
            { f: 783.99, t: 0.28, d: 0.22 },
            { f: 1046.50, t: 0.48, d: 0.7 }
        ];

        melody.forEach(n => {
            try {
                const now = this.ctx.currentTime + n.t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now);

                gain.gain.setValueAtTime(0.4, now);
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
