/**
 * Upgraded Festive Horse Runner Mini-Game
 * - 3 Golden Horseshoes spawn randomly spaced across 3 distinct time windows
 * - Obstacles (cakes & gifts) spawn in between
 * - If player collects all 3 horseshoes -> Finish flag 🏁, sleepy horse 💤, safe unlocks!
 * - If player misses any horseshoe -> Retry overlay appears: "Зібрано лише X/3 підков. Спробуй ще раз!", game restarts
 * - Jump buffering & air control
 * - 100% Vector Canvas rendering for horse
 */

class HorseRunnerGame {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.container = document.querySelector('.runner-card') || this.canvas.parentElement;
        this.ctx = this.canvas.getContext('2d');
        this.onFinish = options.onFinish || (() => {});
        this.onUpdateUI = options.onUpdateUI || (() => {});

        this.width = 380;
        this.height = 240;
        this.dpr = window.devicePixelRatio || 1;

        this.isRunning = false;
        this.isFinished = false;
        this.animationFrameId = null;

        // Game parameters
        this.targetHorseshoes = 3;
        this.targetDuration = 24; // 24 seconds total run
        this.elapsedTime = 0;
        this.collectedHorseshoes = 0;

        // Ground level
        this.groundY = 175;

        // Horse state
        this.horse = {
            x: 65,
            y: this.groundY,
            vy: 0,
            gravity: 0.72,
            jumpStrength: -11.5,
            isJumping: false,
            width: 52,
            height: 48,
            legAngle: 0,
            stumbleTimer: 0,
            invulnerableTimer: 0,
            isLayingDown: false,
            sleepTimer: 0,
            jumpBufferTimer: 0
        };

        // Distinct random spawn time windows for each of the 3 horseshoes
        this.horseshoeSpawnTimes = [];
        this.spawnedHorseshoesCount = 0;

        // Entities
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.stars = [];

        // Track & speed
        this.speed = 3.8;
        this.trackOffset = 0;
        this.lastObstacleTime = 0;
        this.lastTime = performance.now();
        this.finishFlag = null;

        this.initStars();
        this.resize();
        this.bindEvents();
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 25; i++) {
            this.stars.push({
                x: Math.random() * 400,
                y: Math.random() * 90,
                radius: Math.random() * 1.5 + 0.5,
                twinkleSpeed: Math.random() * 0.04 + 0.02,
                alpha: Math.random()
            });
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width > 50 ? rect.width : 380;
        this.height = 240;
        this.dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    bindEvents() {
        const triggerJump = (e) => {
            if (!this.isRunning || this.isFinished) return;
            if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;

            if (e.cancelable && e.type !== 'keydown') {
                e.preventDefault();
            }
            this.queueJump();
        };

        this.canvas.addEventListener('pointerdown', triggerJump, { passive: false });
        if (this.container) {
            this.container.addEventListener('pointerdown', (e) => {
                if (e.target.closest('#btn-runner-jump') || e.target.closest('#runner-canvas')) {
                    triggerJump(e);
                }
            }, { passive: false });
        }
        window.addEventListener('keydown', triggerJump);

        const jumpBtn = document.getElementById('btn-runner-jump');
        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.queueJump();
            }, { passive: false });
            jumpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.queueJump();
            });
        }

        const retryBtn = document.getElementById('btn-runner-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const retryModal = document.getElementById('runner-retry-modal');
                if (retryModal) retryModal.classList.remove('active');
                this.start();
            });
        }

        window.addEventListener('resize', () => {
            if (this.isRunning) this.resize();
        });
    }

    queueJump() {
        if (this.horse.isLayingDown) return;

        if (!this.horse.isJumping) {
            this.executeJump();
        } else {
            this.horse.jumpBufferTimer = 0.25;
            if (this.horse.vy > 2 && this.horse.y > this.groundY - 50) {
                this.executeJump();
            }
        }
    }

    executeJump() {
        this.horse.isJumping = true;
        this.horse.vy = this.horse.jumpStrength;
        this.horse.jumpBufferTimer = 0;

        if (window.soundController) {
            window.soundController.playJump();
        }
        this.spawnJumpPuff(this.horse.x + 18, this.groundY + 36);
    }

    start() {
        this.resize();
        this.isRunning = true;
        this.isFinished = false;
        this.elapsedTime = 0;
        this.collectedHorseshoes = 0;
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.finishFlag = null;

        // Hide retry modal if visible
        const retryModal = document.getElementById('runner-retry-modal');
        if (retryModal) retryModal.classList.remove('active');

        // Randomly plan 3 horseshoe spawn moments in separate windows
        // Window 1: 4.5s - 7.0s
        // Window 2: 11.0s - 14.5s
        // Window 3: 18.0s - 21.0s
        this.horseshoeSpawnTimes = [
            4.5 + Math.random() * 2.5,
            11.0 + Math.random() * 3.5,
            18.0 + Math.random() * 3.0
        ];
        this.spawnedHorseshoesCount = 0;

        this.horse.y = this.groundY;
        this.horse.vy = 0;
        this.horse.isJumping = false;
        this.horse.isLayingDown = false;
        this.horse.isVictorious = false;
        this.horse.stumbleTimer = 0;
        this.horse.invulnerableTimer = 0;
        this.horse.jumpBufferTimer = 0;
        this.speed = 3.8;

        this.lastTime = performance.now();
        this.lastObstacleTime = 0;

        this.onUpdateUI({
            horseshoes: this.collectedHorseshoes,
            targetHorseshoes: this.targetHorseshoes,
            timeLeft: Math.ceil(this.targetDuration - this.elapsedTime)
        });

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.loop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    spawnJumpPuff(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 2 - 1,
                vy: (Math.random() - 0.5) * 1.5,
                radius: Math.random() * 3 + 2,
                color: 'rgba(251, 191, 36, 0.7)',
                life: 0.3
            });
        }
    }

    spawnSparkles(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 1,
                radius: Math.random() * 3 + 2,
                color: Math.random() > 0.5 ? '#FBBF24' : '#F59E0B',
                life: 0.55
            });
        }
    }

    spawnEntities() {
        if (this.finishFlag) return;

        const now = this.elapsedTime;

        // Check if it's time for one of the 3 randomly scheduled horseshoes
        if (this.spawnedHorseshoesCount < 3 && now >= this.horseshoeSpawnTimes[this.spawnedHorseshoesCount]) {
            this.collectibles.push({
                x: this.width + 25,
                y: this.groundY - 32 - (Math.random() > 0.5 ? 20 : 0),
                type: 'horseshoe',
                size: 28
            });
            this.spawnedHorseshoesCount++;
            this.lastObstacleTime = now;
            return;
        }

        // Spawn obstacles periodically, but not on top of horseshoes
        if (now - this.lastObstacleTime > 2.2 && now < this.targetDuration - 2.5) {
            this.lastObstacleTime = now;
            const isCake = Math.random() > 0.5;
            this.obstacles.push({
                x: this.width + 25,
                y: this.groundY - (isCake ? 10 : 8),
                type: isCake ? 'cake' : 'gift',
                width: 28,
                height: 28
            });
        }

        // Finish condition: time reached
        if (now >= this.targetDuration) {
            if (this.collectedHorseshoes >= this.targetHorseshoes) {
                // SUCCESS: Spawn finish flag!
                if (!this.finishFlag) {
                    this.finishFlag = {
                        x: this.width + 60,
                        reached: false
                    };
                }
            } else {
                // FAILED TO COLLECT 3: Must retry!
                this.handleMissedRun();
            }
        }
    }

    handleMissedRun() {
        this.stop();
        if (window.soundController) {
            window.soundController.playStumble();
        }

        const retryModal = document.getElementById('runner-retry-modal');
        const retryCountEl = document.getElementById('retry-horseshoe-count');
        if (retryCountEl) {
            retryCountEl.textContent = `${this.collectedHorseshoes} / 3`;
        }
        if (retryModal) {
            retryModal.classList.add('active');
        }
    }

    update(dt) {
        if (!this.isFinished) {
            this.elapsedTime += dt;
            const remaining = Math.max(0, Math.ceil(this.targetDuration - this.elapsedTime));
            this.onUpdateUI({
                horseshoes: this.collectedHorseshoes,
                targetHorseshoes: this.targetHorseshoes,
                timeLeft: remaining
            });
        }

        // Star twinkle
        this.stars.forEach(s => {
            s.alpha += s.twinkleSpeed;
            if (s.alpha > 1 || s.alpha < 0.2) s.twinkleSpeed = -s.twinkleSpeed;
        });

        // Track movement
        if (!this.horse.isLayingDown) {
            this.trackOffset = (this.trackOffset + this.speed) % 36;
            this.horse.legAngle += 0.28;
        }

        // Timers
        if (this.horse.stumbleTimer > 0) this.horse.stumbleTimer -= dt;
        if (this.horse.invulnerableTimer > 0) this.horse.invulnerableTimer -= dt;
        if (this.horse.jumpBufferTimer > 0) this.horse.jumpBufferTimer -= dt;

        // Horse jump physics
        if (this.horse.isJumping) {
            this.horse.vy += this.horse.gravity;
            this.horse.y += this.horse.vy;

            if (this.horse.y >= this.groundY) {
                this.horse.y = this.groundY;
                this.horse.vy = 0;
                this.horse.isJumping = false;
                this.spawnJumpPuff(this.horse.x + 18, this.groundY + 36);

                if (this.horse.jumpBufferTimer > 0) {
                    this.executeJump();
                }
            }
        } else {
            this.horse.y = this.groundY;
            this.horse.vy = 0;
        }

        // Entities
        this.spawnEntities();

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            if (this.horse.invulnerableTimer <= 0 && !this.horse.isLayingDown) {
                const horseBox = {
                    x: this.horse.x + 8,
                    y: this.horse.y - 12,
                    w: this.horse.width - 16,
                    h: this.horse.height
                };
                if (
                    obs.x < horseBox.x + horseBox.w &&
                    obs.x + obs.width > horseBox.x &&
                    obs.y < horseBox.y + horseBox.h &&
                    obs.y + obs.height > horseBox.y
                ) {
                    this.horse.stumbleTimer = 0.65;
                    this.horse.invulnerableTimer = 1.2;
                    if (window.soundController) {
                        window.soundController.playStumble();
                    }
                    this.spawnSparkles(obs.x + 12, obs.y + 12, 8);
                }
            }

            if (obs.x < -45) {
                this.obstacles.splice(i, 1);
            }
        }

        // Move collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const col = this.collectibles[i];
            col.x -= this.speed;

            const horseBox = {
                x: this.horse.x + 4,
                y: this.horse.y - 25,
                w: this.horse.width + 10,
                h: this.horse.height + 20
            };

            if (
                col.x < horseBox.x + horseBox.w &&
                col.x + col.size > horseBox.x &&
                col.y < horseBox.y + horseBox.h &&
                col.y + col.size > horseBox.y
            ) {
                this.collectedHorseshoes = Math.min(this.targetHorseshoes, this.collectedHorseshoes + 1);
                if (window.soundController) {
                    window.soundController.playCollect();
                }
                this.spawnSparkles(col.x + 12, col.y + 12, 16);
                this.collectibles.splice(i, 1);
                continue;
            }

            if (col.x < -45) {
                this.collectibles.splice(i, 1);
            }
        }

        // Finish flag
        if (this.finishFlag) {
            this.finishFlag.x -= this.speed * 0.9;
            if (this.finishFlag.x <= this.horse.x + 50 && !this.finishFlag.reached) {
                this.finishFlag.reached = true;
                this.finishRun();
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        if (this.horse.isLayingDown) {
            this.horse.sleepTimer += dt;
        }
    }

    finishRun() {
        this.isFinished = true;
        this.horse.isVictorious = true;
        this.horse.isLayingDown = false;
        this.horse.vy = 0;
        this.horse.y = this.groundY;
        this.speed = 0;
        this.spawnSparkles(this.horse.x + 25, this.horse.y + 10, 36);

        if (window.soundController) {
            window.soundController.playVictory();
        }

        setTimeout(() => {
            this.stop();
            this.onFinish();
        }, 2500);
    }

    draw() {
        const ctx = this.ctx;
        ctx.save();
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY + 20);
        skyGrad.addColorStop(0, '#EDE9FE');
        skyGrad.addColorStop(0.5, '#FEF3C7');
        skyGrad.addColorStop(1, '#FDE68A');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Twinkling sparkles
        this.stars.forEach(s => {
            ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0.2, s.alpha)})`;
            ctx.beginPath();
            ctx.arc(s.x % this.width, s.y, s.radius + 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Sun orb
        const sunGrad = ctx.createRadialGradient(this.width - 45, 42, 4, this.width - 45, 42, 28);
        sunGrad.addColorStop(0, '#F59E0B');
        sunGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.4)');
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(this.width - 45, 42, 28, 0, Math.PI * 2);
        ctx.fill();

        // 4. Background hills
        ctx.fillStyle = '#DDD6FE';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.quadraticCurveTo(90, 130, 190, this.groundY);
        ctx.quadraticCurveTo(290, 120, this.width, this.groundY);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.fill();

        // 5. Emerald running track & grass
        const groundGrad = ctx.createLinearGradient(0, this.groundY + 15, 0, this.height);
        groundGrad.addColorStop(0, '#10B981');
        groundGrad.addColorStop(1, '#059669');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, this.groundY + 16, this.width, this.height - (this.groundY + 16));

        // Animated grass stripes
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 3;
        for (let x = -this.trackOffset; x < this.width + 40; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, this.groundY + 18);
            ctx.lineTo(x + 10, this.groundY + 32);
            ctx.stroke();
        }

        // Golden curb
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(0, this.groundY + 14, this.width, 3);

        // 6. Draw Finish Flag
        if (this.finishFlag) {
            const fx = this.finishFlag.x;
            ctx.fillStyle = '#475569';
            ctx.fillRect(fx, this.groundY - 45, 4, 65);
            ctx.font = '26px sans-serif';
            ctx.fillText('🏁', fx - 4, this.groundY - 24);
        }

        // 7. Draw Obstacles
        this.obstacles.forEach(obs => {
            if (obs.type === 'cake') {
                this.drawCake(ctx, obs.x, obs.y);
            } else {
                this.drawGift(ctx, obs.x, obs.y);
            }
        });

        // 8. Draw Collectibles (Horseshoes)
        this.collectibles.forEach(col => {
            this.drawHorseshoe(ctx, col.x, col.y, col.size);
        });

        // 9. Draw Horse
        this.drawVectorHorse(ctx);

        // 10. Draw Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    drawVectorHorse(ctx) {
        ctx.save();
        ctx.translate(this.horse.x, this.horse.y);

        if (this.horse.stumbleTimer > 0) {
            ctx.translate(Math.sin(this.elapsedTime * 40) * 3, 0);
            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(28, -25, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.horse.isVictorious) {
            // Standing proud, joyful champion horse!
            ctx.translate(0, 0);

            // 4 straight sturdy legs
            ctx.strokeStyle = '#92400E';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(8, 6); ctx.lineTo(8, 24);
            ctx.moveTo(14, 6); ctx.lineTo(14, 24);
            ctx.moveTo(26, 6); ctx.lineTo(26, 24);
            ctx.moveTo(32, 6); ctx.lineTo(32, 24);
            ctx.stroke();

            // Body
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(4, -8, 32, 18, 9) : ctx.ellipse(20, 0, 16, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tail waving proudly
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(4, -2);
            ctx.quadraticCurveTo(-10, -8, -6, 4);
            ctx.stroke();

            // Neck & Head held high
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.moveTo(26, -4);
            ctx.lineTo(36, -20);
            ctx.lineTo(46, -14);
            ctx.lineTo(34, 4);
            ctx.closePath();
            ctx.fill();

            // Muzzle smiling
            ctx.beginPath();
            ctx.arc(43, -13, 7, 0, Math.PI * 2);
            ctx.fill();

            // Mane (Golden yellow)
            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(31, -16, 5, 0, Math.PI * 2);
            ctx.arc(27, -10, 5, 0, Math.PI * 2);
            ctx.fill();

            // Big happy eye
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(39, -15, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(39.5, -15, 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Big celebratory party cone hat with sparkles
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.moveTo(33, -24);
            ctx.lineTo(41, -22);
            ctx.lineTo(37, -38);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(37, -39, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Winner gold medal ribbon around neck
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(34, -2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(34, -2, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Speech bubble: "Ура! 🏆"
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(14, -56, 62, 22, 8) : ctx.rect(14, -56, 62, 22);
            ctx.fill();
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#92400E';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('Ура! 🏆✨', 20, -41);
        } else {
            const jumpTilt = this.horse.isJumping ? (this.horse.vy * 0.035) : 0;
            ctx.rotate(jumpTilt);

            const legPhase = Math.sin(this.horse.legAngle);

            ctx.strokeStyle = '#92400E';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            // Rear left leg
            ctx.beginPath();
            ctx.moveTo(8, 6);
            ctx.lineTo(8 - legPhase * 8, 24);
            ctx.stroke();

            // Front left leg
            ctx.beginPath();
            ctx.moveTo(28, 6);
            ctx.lineTo(28 + legPhase * 8, 24);
            ctx.stroke();

            // Body
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(4, -8, 32, 18, 9) : ctx.ellipse(20, 0, 16, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tail
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(4, -2);
            ctx.quadraticCurveTo(-8, -4 + legPhase * 4, -4, 8);
            ctx.stroke();

            // Neck & Head
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.moveTo(26, -4);
            ctx.lineTo(36, -18);
            ctx.lineTo(45, -12);
            ctx.lineTo(34, 4);
            ctx.closePath();
            ctx.fill();

            // Muzzle
            ctx.beginPath();
            ctx.arc(42, -12, 7, 0, Math.PI * 2);
            ctx.fill();

            // Mane
            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(30, -14, 5, 0, Math.PI * 2);
            ctx.arc(26, -9, 5, 0, Math.PI * 2);
            ctx.arc(22, -4, 4, 0, Math.PI * 2);
            ctx.fill();

            // Ear
            ctx.fillStyle = '#92400E';
            ctx.beginPath();
            ctx.moveTo(33, -18);
            ctx.lineTo(36, -26);
            ctx.lineTo(39, -18);
            ctx.fill();

            // Eye
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(38, -14, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(38.5, -14, 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Party Cone Hat
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.moveTo(32, -22);
            ctx.lineTo(40, -20);
            ctx.lineTo(36, -34);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(36, -35, 3, 0, Math.PI * 2);
            ctx.fill();

            // Legs right side
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 4;

            ctx.beginPath();
            ctx.moveTo(12, 6);
            ctx.lineTo(12 + legPhase * 8, 24);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(24, 6);
            ctx.lineTo(24 - legPhase * 8, 24);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawCake(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(0, 10, 26, 16, 4) : ctx.rect(0, 10, 26, 16);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-1, 8, 28, 6, 3) : ctx.rect(-1, 8, 28, 6);
        ctx.fill();

        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(11, -1, 4, 10);

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(13, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawGift(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(0, 6, 24, 20, 4) : ctx.rect(0, 6, 24, 20);
        ctx.fill();

        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(10, 6, 4, 20);
        ctx.fillRect(0, 14, 24, 4);

        ctx.beginPath();
        ctx.arc(9, 4, 4, 0, Math.PI * 2);
        ctx.arc(15, 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawHorseshoe(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);

        const glow = ctx.createRadialGradient(14, 14, 4, 14, 14, 20);
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(14, 14, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(14, 14, 9, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();

        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(14, 14, 9, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();

        ctx.restore();
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
}

window.HorseRunnerGame = HorseRunnerGame;
