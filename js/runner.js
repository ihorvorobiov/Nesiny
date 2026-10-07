/**
 * Upgraded Festive Horse Runner Mini-Game
 * - 100% Vector Canvas rendering for horse (guaranteed to never disappear)
 * - Jump buffering & air control (100% responsive jumping on all touch screens)
 * - Chill stumble mode (never resets progress)
 * - Sleep animation and safe transition
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
        this.targetDuration = 15;
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

        // Entities
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.stars = [];

        // Track & speed
        this.speed = 3.8;
        this.trackOffset = 0;
        this.lastSpawnTime = 0;
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

        // Tap on canvas or anywhere inside the runner card
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

        window.addEventListener('resize', () => {
            if (this.isRunning) this.resize();
        });
    }

    queueJump() {
        if (this.horse.isLayingDown) return;

        // Immediate jump if on ground
        if (!this.horse.isJumping) {
            this.executeJump();
        } else {
            // Buffer jump if near ground or allow subtle air-boost
            this.horse.jumpBufferTimer = 0.25;
            if (this.horse.vy > 2 && this.horse.y > this.groundY - 50) {
                // Generous near-ground jump
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

        this.horse.y = this.groundY;
        this.horse.vy = 0;
        this.horse.isJumping = false;
        this.horse.isLayingDown = false;
        this.horse.stumbleTimer = 0;
        this.horse.invulnerableTimer = 0;
        this.horse.jumpBufferTimer = 0;
        this.speed = 3.8;

        this.lastTime = performance.now();
        this.lastSpawnTime = 0;

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

        // Finish condition check
        if (this.collectedHorseshoes >= this.targetHorseshoes || this.elapsedTime >= this.targetDuration) {
            if (!this.finishFlag) {
                this.finishFlag = {
                    x: this.width + 60,
                    reached: false
                };
            }
            return;
        }

        const now = this.elapsedTime;
        if (now - this.lastSpawnTime > 1.8) {
            this.lastSpawnTime = now;
            const rand = Math.random();

            if (this.collectedHorseshoes < this.targetHorseshoes && (rand < 0.48 || this.obstacles.length >= 2)) {
                this.collectibles.push({
                    x: this.width + 25,
                    y: this.groundY - 35 - (Math.random() > 0.5 ? 20 : 0),
                    type: 'horseshoe',
                    size: 28
                });
            } else {
                const isCake = Math.random() > 0.5;
                this.obstacles.push({
                    x: this.width + 25,
                    y: this.groundY - (isCake ? 10 : 8),
                    type: isCake ? 'cake' : 'gift',
                    width: 28,
                    height: 28
                });
            }
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

        // Running track offset & leg animation
        if (!this.horse.isLayingDown) {
            this.trackOffset = (this.trackOffset + this.speed) % 36;
            this.horse.legAngle += 0.28;
        }

        // Timers
        if (this.horse.stumbleTimer > 0) this.horse.stumbleTimer -= dt;
        if (this.horse.invulnerableTimer > 0) this.horse.invulnerableTimer -= dt;
        if (this.horse.jumpBufferTimer > 0) this.horse.jumpBufferTimer -= dt;

        // Horse jump physics with safety bounds
        if (this.horse.isJumping) {
            this.horse.vy += this.horse.gravity;
            this.horse.y += this.horse.vy;

            // Landing check
            if (this.horse.y >= this.groundY) {
                this.horse.y = this.groundY;
                this.horse.vy = 0;
                this.horse.isJumping = false;
                this.spawnJumpPuff(this.horse.x + 18, this.groundY + 36);

                // Process buffered jump if requested right before landing
                if (this.horse.jumpBufferTimer > 0) {
                    this.executeJump();
                }
            }
        } else {
            this.horse.y = this.groundY;
            this.horse.vy = 0;
        }

        // Spawn items
        this.spawnEntities();

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            // Collision check
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
                    // Chill stumble: comical bump, sound, invulnerability, continue running!
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
        this.horse.isLayingDown = true;
        this.speed = 0;
        this.spawnSparkles(this.horse.x + 25, this.horse.y + 10, 24);

        if (window.soundController) {
            window.soundController.playSafeUnlock();
        }

        setTimeout(() => {
            this.stop();
            this.onFinish();
        }, 2100);
    }

    draw() {
        const ctx = this.ctx;
        ctx.save();
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Festive light gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY + 20);
        skyGrad.addColorStop(0, '#EDE9FE'); // Soft lilac-sky
        skyGrad.addColorStop(0.5, '#FEF3C7'); // Warm champagne
        skyGrad.addColorStop(1, '#FDE68A'); // Gentle golden horizon
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Twinkling golden sparkles
        this.stars.forEach(s => {
            ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0.2, s.alpha)})`;
            ctx.beginPath();
            ctx.arc(s.x % this.width, s.y, s.radius + 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Sun / Festive glowing orb
        const sunGrad = ctx.createRadialGradient(this.width - 45, 42, 4, this.width - 45, 42, 28);
        sunGrad.addColorStop(0, '#F59E0B');
        sunGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.4)');
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(this.width - 45, 42, 28, 0, Math.PI * 2);
        ctx.fill();

        // 4. Soft background hills
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

        // Golden curb line
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

        // 7. Draw Obstacles (Cakes & Gifts)
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

        // 9. Draw Horse (100% Vector Canvas Art - Guaranteed to never disappear)
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

    // 100% Canvas Vector Horse Drawing (Independent of OS fonts & emojis)
    drawVectorHorse(ctx) {
        ctx.save();
        ctx.translate(this.horse.x, this.horse.y);

        if (this.horse.stumbleTimer > 0) {
            ctx.translate(Math.sin(this.elapsedTime * 40) * 3, 0);
            ctx.fillStyle = '#38BDF8';
            // Sweat drop
            ctx.beginPath();
            ctx.arc(28, -25, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.horse.isLayingDown) {
            // Sleepy horse curled up on grass
            ctx.translate(0, 18);

            // Body
            ctx.fillStyle = '#B45309';
            ctx.beginPath();
            ctx.ellipse(20, 0, 24, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head resting
            ctx.beginPath();
            ctx.arc(36, -4, 11, 0, Math.PI * 2);
            ctx.fill();

            // Closed eye (smile arc)
            ctx.strokeStyle = '#451A03';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(38, -5, 4, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // Party cone hat
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.moveTo(34, -14);
            ctx.lineTo(44, -14);
            ctx.lineTo(39, -28);
            ctx.closePath();
            ctx.fill();

            // Floating ZZZ
            const zOff = (this.horse.sleepTimer * 16) % 22;
            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText('z', 48, -12 - zOff * 0.5);
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('Z', 54, -20 - zOff);
        } else {
            // Running or jumping horse
            const jumpTilt = this.horse.isJumping ? (this.horse.vy * 0.035) : 0;
            ctx.rotate(jumpTilt);

            const legPhase = Math.sin(this.horse.legAngle);

            // Back legs
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

            // Mane (Golden yellow)
            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(30, -14, 5, 0, Math.PI * 2);
            ctx.arc(26, -9, 5, 0, Math.PI * 2);
            ctx.arc(22, -4, 4, 0, Math.PI * 2);
            ctx.fill();

            // Cute Ear
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
            // Hat Pompom
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(36, -35, 3, 0, Math.PI * 2);
            ctx.fill();

            // Front legs (Front right & Rear right)
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 4;

            // Rear right leg
            ctx.beginPath();
            ctx.moveTo(12, 6);
            ctx.lineTo(12 + legPhase * 8, 24);
            ctx.stroke();

            // Front right leg
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

        // Cake base
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(0, 10, 26, 16, 4) : ctx.rect(0, 10, 26, 16);
        ctx.fill();

        // White cream frosting
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-1, 8, 28, 6, 3) : ctx.rect(-1, 8, 28, 6);
        ctx.fill();

        // Candle
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(11, -1, 4, 10);

        // Flame
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(13, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawGift(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Box
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(0, 6, 24, 20, 4) : ctx.rect(0, 6, 24, 20);
        ctx.fill();

        // Golden ribbon
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(10, 6, 4, 20);
        ctx.fillRect(0, 14, 24, 4);

        // Bow
        ctx.beginPath();
        ctx.arc(9, 4, 4, 0, Math.PI * 2);
        ctx.arc(15, 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawHorseshoe(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);

        // Golden glow
        const glow = ctx.createRadialGradient(14, 14, 4, 14, 14, 20);
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(14, 14, 20, 0, Math.PI * 2);
        ctx.fill();

        // Golden horseshoe arc
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
