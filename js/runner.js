/**
 * Festive Horse Runner Mini-Game
 * Canvas-based mobile-friendly runner
 * Goal: Collect 3 golden horseshoes OR survive 15 seconds.
 * Chill mode: Stumbling on obstacles does not reset progress!
 */

class HorseRunnerGame {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.onFinish = options.onFinish || (() => {});
        this.onUpdateUI = options.onUpdateUI || (() => {});

        this.width = 400;
        this.height = 250;
        this.dpr = window.devicePixelRatio || 1;

        this.isRunning = false;
        this.isFinished = false;
        this.animationFrameId = null;

        // Game parameters
        this.targetHorseshoes = 3;
        this.targetDuration = 15; // 15 seconds
        this.elapsedTime = 0;
        this.collectedHorseshoes = 0;

        // Ground level
        this.groundY = 195;

        // Horse state
        this.horse = {
            x: 65,
            y: this.groundY,
            baseY: this.groundY,
            vy: 0,
            gravity: 0.72,
            jumpStrength: -11.5,
            isJumping: false,
            width: 48,
            height: 44,
            legAngle: 0,
            stumbleTimer: 0,
            invulnerableTimer: 0,
            isLayingDown: false,
            sleepTimer: 0
        };

        // Entities
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.stars = [];
        this.decorations = [];

        // Track & speed
        this.speed = 3.6;
        this.trackOffset = 0;
        this.lastSpawnTime = 0;
        this.lastTime = 0;
        this.finishFlag = null;

        this.initStars();
        this.resize();
        this.bindEvents();
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 28; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * 95,
                radius: Math.random() * 1.5 + 0.5,
                twinkleSpeed: Math.random() * 0.05 + 0.02,
                alpha: Math.random()
            });
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width || 380;
        this.height = 250;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    bindEvents() {
        const triggerJump = (e) => {
            if (!this.isRunning || this.isFinished) return;
            if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
            if (e.cancelable && e.type !== 'keydown') e.preventDefault();
            this.jump();
        };

        this.canvas.addEventListener('pointerdown', triggerJump);
        window.addEventListener('keydown', triggerJump);

        const jumpBtn = document.getElementById('btn-runner-jump');
        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.jump();
            });
        }

        window.addEventListener('resize', () => {
            this.resize();
        });
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

    jump() {
        if (!this.horse.isJumping && !this.horse.isLayingDown) {
            this.horse.isJumping = true;
            this.horse.vy = this.horse.jumpStrength;
            if (window.soundController) {
                window.soundController.playJump();
            }
            this.spawnJumpPuff(this.horse.x + 15, this.groundY + 35);
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
                alpha: 1,
                life: 0.35
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
                radius: Math.random() * 3.5 + 2,
                color: Math.random() > 0.5 ? '#FBBF24' : '#F59E0B',
                alpha: 1,
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
        if (now - this.lastSpawnTime > 1.85) {
            this.lastSpawnTime = now;
            const rand = Math.random();

            // Prioritize horseshoe if below target
            if (this.collectedHorseshoes < this.targetHorseshoes && (rand < 0.45 || this.obstacles.length >= 2)) {
                this.collectibles.push({
                    x: this.width + 20,
                    y: this.groundY - 35 - (Math.random() > 0.5 ? 25 : 0),
                    type: 'horseshoe',
                    size: 26,
                    sparkleTimer: 0
                });
            } else {
                const isCake = Math.random() > 0.45;
                this.obstacles.push({
                    x: this.width + 20,
                    y: this.groundY - (isCake ? 10 : 8),
                    type: isCake ? 'cake' : 'gift',
                    width: isCake ? 28 : 26,
                    height: isCake ? 28 : 26
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

        // Running track offset
        if (!this.horse.isLayingDown) {
            this.trackOffset = (this.trackOffset + this.speed) % 40;
            this.horse.legAngle += 0.25;
        }

        // Timers
        if (this.horse.stumbleTimer > 0) this.horse.stumbleTimer -= dt;
        if (this.horse.invulnerableTimer > 0) this.horse.invulnerableTimer -= dt;

        // Horse jump physics
        if (this.horse.isJumping) {
            this.horse.vy += this.horse.gravity;
            this.horse.y += this.horse.vy;

            if (this.horse.y >= this.groundY) {
                this.horse.y = this.groundY;
                this.horse.vy = 0;
                this.horse.isJumping = false;
                this.spawnJumpPuff(this.horse.x + 15, this.groundY + 36);
            }
        }

        // Spawn items
        this.spawnEntities();

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            // Collision check with horse
            if (this.horse.invulnerableTimer <= 0 && !this.horse.isLayingDown) {
                const horseBox = {
                    x: this.horse.x + 6,
                    y: this.horse.y - 10,
                    w: this.horse.width - 12,
                    h: this.horse.height - 5
                };
                if (
                    obs.x < horseBox.x + horseBox.w &&
                    obs.x + obs.width > horseBox.x &&
                    obs.y < horseBox.y + horseBox.h &&
                    obs.y + obs.height > horseBox.y
                ) {
                    // Chill collision!
                    this.horse.stumbleTimer = 0.65;
                    this.horse.invulnerableTimer = 1.2;
                    if (window.soundController) {
                        window.soundController.playStumble();
                    }
                    this.spawnSparkles(obs.x + 10, obs.y + 10, 8);
                }
            }

            if (obs.x < -40) {
                this.obstacles.splice(i, 1);
            }
        }

        // Move collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const col = this.collectibles[i];
            col.x -= this.speed;

            const horseBox = {
                x: this.horse.x + 4,
                y: this.horse.y - 20,
                w: this.horse.width,
                h: this.horse.height + 15
            };

            if (
                col.x < horseBox.x + horseBox.w &&
                col.x + col.size > horseBox.x &&
                col.y < horseBox.y + horseBox.h &&
                col.y + col.size > horseBox.y
            ) {
                // Collected!
                this.collectedHorseshoes = Math.min(this.targetHorseshoes, this.collectedHorseshoes + 1);
                if (window.soundController) {
                    window.soundController.playCollect();
                }
                this.spawnSparkles(col.x + 10, col.y + 10, 16);
                this.collectibles.splice(i, 1);
                continue;
            }

            if (col.x < -40) {
                this.collectibles.splice(i, 1);
            }
        }

        // Finish flag movement
        if (this.finishFlag) {
            this.finishFlag.x -= this.speed * 0.9;
            if (this.finishFlag.x <= this.horse.x + 50 && !this.finishFlag.reached) {
                this.finishFlag.reached = true;
                this.finishRun();
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / 0.5);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Sleep timer after finish
        if (this.horse.isLayingDown) {
            this.horse.sleepTimer += dt;
        }
    }

    finishRun() {
        this.isFinished = true;
        this.horse.isLayingDown = true;
        this.speed = 0;
        this.spawnSparkles(this.horse.x + 20, this.horse.y + 10, 24);

        if (window.soundController) {
            window.soundController.playSafeUnlock();
        }

        // Wait a short moment for the cute sleepy animation, then transition
        setTimeout(() => {
            this.stop();
            this.onFinish();
        }, 2200);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Sky & Backdrop gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGrad.addColorStop(0, '#1E1B4B'); // Twilight deep indigo
        skyGrad.addColorStop(0.7, '#312E81');
        skyGrad.addColorStop(1, '#4338CA');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Stars
        this.stars.forEach(s => {
            ctx.fillStyle = `rgba(253, 224, 71, ${Math.max(0.1, s.alpha)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Moon / Festive Golden Light in sky
        const moonGrad = ctx.createRadialGradient(this.width - 45, 45, 5, this.width - 45, 45, 30);
        moonGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        moonGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.4)');
        moonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(this.width - 45, 45, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '22px sans-serif';
        ctx.fillText('🌙', this.width - 55, 45);

        // 4. Background hills
        ctx.fillStyle = '#2E1065';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY + 10);
        ctx.quadraticCurveTo(80, 140, 180, this.groundY + 10);
        ctx.quadraticCurveTo(280, 130, this.width, this.groundY + 10);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.fill();

        // 5. Ground / Grass
        const groundGrad = ctx.createLinearGradient(0, this.groundY + 15, 0, this.height);
        groundGrad.addColorStop(0, '#065F46'); // Emerald track
        groundGrad.addColorStop(1, '#022C22');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, this.groundY + 20, this.width, this.height - (this.groundY + 20));

        // Animated ground pattern / stripes
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 3;
        for (let x = -this.trackOffset; x < this.width + 40; x += 35) {
            ctx.beginPath();
            ctx.moveTo(x, this.groundY + 22);
            ctx.lineTo(x + 12, this.groundY + 36);
            ctx.stroke();
        }

        // Golden curb border
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(0, this.groundY + 18, this.width, 3);

        // 6. Draw Finish Flag
        if (this.finishFlag) {
            const fx = this.finishFlag.x;
            ctx.fillStyle = '#E2E8F0';
            ctx.fillRect(fx, this.groundY - 45, 4, 65); // pole
            // Checkered flag
            ctx.font = '28px sans-serif';
            ctx.fillText('🏁', fx - 4, this.groundY - 26);
        }

        // 7. Draw Obstacles (Cakes & Gifts)
        this.obstacles.forEach(obs => {
            ctx.font = `${obs.width}px sans-serif`;
            if (obs.type === 'cake') {
                ctx.fillText('🎂', obs.x, obs.y + obs.height);
            } else {
                ctx.fillText('🎁', obs.x, obs.y + obs.height);
            }
        });

        // 8. Draw Collectibles (Horseshoes)
        this.collectibles.forEach(col => {
            // Golden halo glow
            const glow = ctx.createRadialGradient(col.x + 12, col.y + 12, 4, col.x + 12, col.y + 12, 20);
            glow.addColorStop(0, 'rgba(251, 191, 36, 0.8)');
            glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(col.x + 12, col.y + 12, 18, 0, Math.PI * 2);
            ctx.fill();

            // Floating bobbing effect
            const bob = Math.sin(this.elapsedTime * 6) * 3;
            ctx.font = '24px sans-serif';
            ctx.fillText('🧲', col.x, col.y + col.size + bob);
        });

        // 9. Draw Horse
        this.drawHorse(ctx);

        // 10. Draw Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
    }

    drawHorse(ctx) {
        ctx.save();
        ctx.translate(this.horse.x, this.horse.y);

        // Chill stumble effect
        if (this.horse.stumbleTimer > 0) {
            ctx.translate(Math.sin(this.elapsedTime * 40) * 4, 0);
            // Sweat drop icon
            ctx.font = '16px sans-serif';
            ctx.fillText('💦', 15, -28);
        }

        if (this.horse.isLayingDown) {
            // Sleepy horse lying down on grass
            ctx.translate(0, 16);
            ctx.rotate(0.15);
            ctx.font = '36px sans-serif';
            ctx.fillText('🐴', 0, 0);

            // Party hat
            ctx.font = '18px sans-serif';
            ctx.fillText('🥳', 18, -12);

            // Floating ZZZ
            const zzzOffset = (this.horse.sleepTimer * 15) % 20;
            ctx.fillStyle = '#FDE047';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('z', 28, -15 - zzzOffset * 0.6);
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('Z', 36, -24 - zzzOffset);
        } else {
            // Running or jumping horse
            const jumpTilt = this.horse.isJumping ? (this.horse.vy * 0.03) : 0;
            ctx.rotate(jumpTilt);

            // Horse emoji / sprite
            ctx.font = '40px sans-serif';
            ctx.fillText('🐴', 0, 16);

            // Festive party hat on horse head
            ctx.font = '18px sans-serif';
            ctx.fillText('🎉', 24, -12);

            // Little running dust/kick when running on ground
            if (!this.horse.isJumping && Math.sin(this.horse.legAngle) > 0.8) {
                ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
                ctx.beginPath();
                ctx.arc(-4, 18, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

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
