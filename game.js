
/**
 * MoveHero Dungeon - Game Logic
 */

// --- CONFIGURATION ---
const SENSITIVITY = {
    STEP_THRESHOLD: 12.0, // m/s^2 total force peak
    SWING_THRESHOLD: 25.0, // ~2.5g
    SHAKE_THRESHOLD: 18.0,
    JUMP_THRESHOLD: 13.0, // Lowered for better detection (approx 1.3g)
    STILL_TOLERANCE: 1.0 // Deviation allowed for "Freeze"
};

// --- AUDIO (Placeholder) ---
// const sfx = { step: new Audio('step.mp3'), swing: new Audio('swing.mp3') };

// LEVEL_1_STEPS is now loaded from action_editor.js

// --- SENSOR MANAGER ---
class SensorManager {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.isActive = false;

        this.accel = { x: 0, y: 0, z: 0 };
        this.lastAccel = { x: 0, y: 0, z: 0 };
        this.maxForce = 0;

        // Step detection vars
        this.lastStepTime = 0;
        this.isStepUp = false;

        // Swing vars
        this.isSwinging = false;
        this.lastSwingTime = 0;
        this.lastJumpTime = 0; // Separate timer for jumps

        // Shake vars
        this.shakeBuffer = [];
    }

    start() {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.bind();
                    } else {
                        alert("İzin reddedildi.");
                    }
                })
                .catch(console.error);
        } else {
            this.bind(); // Android/PC
        }
    }

    bind() {
        window.addEventListener('devicemotion', (e) => this.handleMotion(e));
        this.isActive = true;
        document.getElementById('sensor-overlay').style.display = 'none';
        game.start();
    }

    handleMotion(e) {
        // Prefer Linear Acceleration (No Gravity) for Jump/Shake
        const linear = e.acceleration;
        const gravity = e.accelerationIncludingGravity;

        // Fallback or Gravity-included for some calc
        const acc = gravity || linear;
        if (!acc) return;

        // Update values
        this.lastAccel = { ...this.accel };
        this.accel = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };

        const totalForce = Math.sqrt(this.accel.x ** 2 + this.accel.y ** 2 + this.accel.z ** 2);

        // Linear Force (If available, much better for jumps)
        let linearForce = 0;
        if (linear && linear.x !== null) {
            linearForce = Math.sqrt(linear.x ** 2 + linear.y ** 2 + linear.z ** 2);
        } else {
            // Estimate deviation from 9.8
            linearForce = Math.abs(totalForce - 9.8);
        }

        // Detect Events
        const events = {
            step: false,
            swing: false,
            jump: false,
            shake: false,
            force: totalForce,
            isStill: false
        };

        const now = Date.now();

        // 1. STEP (Peak detection)
        if (totalForce > SENSITIVITY.STEP_THRESHOLD && !this.isStepUp && (now - this.lastStepTime > 300)) {
            this.isStepUp = true;
            events.step = true;
            this.lastStepTime = now;
        } else if (totalForce < SENSITIVITY.STEP_THRESHOLD - 2) {
            this.isStepUp = false;
        }

        // 2. SWING / CHOP (High force spike)
        if (totalForce > SENSITIVITY.SWING_THRESHOLD && (now - this.lastSwingTime > 400)) {
            events.swing = true;
            this.lastSwingTime = now;
            // Navigator Vibrate
            if (navigator.vibrate) navigator.vibrate(50);
        }

        // 3. JUMP (Linear Force Detection)
        // Jump creates a sharp spike in linear acceleration (> 5-8 m/s^2)
        // Using 6.0 as a safe robust threshold ( approx 0.6g extra force)
        const JUMP_LINEAR_THRESHOLD = 6.0;

        if (linearForce > JUMP_LINEAR_THRESHOLD && (now - this.lastJumpTime > 4500)) {
            events.jump = true;
            this.lastJumpTime = now;
            console.log("Jump Detected (Linear)!", linearForce);
        }

        // 4. SHAKE (Rapid direction changes)
        if (totalForce > SENSITIVITY.SHAKE_THRESHOLD) {
            events.shake = true;
        }

        // 5. STILLNESS
        const delta = Math.abs(this.accel.x - this.lastAccel.x) +
            Math.abs(this.accel.y - this.lastAccel.y) +
            Math.abs(this.accel.z - this.lastAccel.z);

        if (delta < SENSITIVITY.STILL_TOLERANCE) {
            events.isStill = true;
        }

        this.onUpdate(events);
    }
}

// --- GAME MANAGER ---
class GameManager {
    constructor() {
        this.currentStepIdx = 0;
        this.progress = 0;
        this.isPaused = false;

        // Stealth Mode State
        this.dragonEyeOpen = false;
        this.stealthTimer = null;
        this.burnState = false;

        // Reaction Mode State
        this.reactionActive = false;
        this.reactionTimer = null;
        this.waitingForAction = null; // 'JUMP' or 'SHAKE'

        // UI Elements
        this.uiStory = document.getElementById('story-text');
        this.uiInstruction = document.getElementById('instruction-text');
        this.uiBar = document.getElementById('progress-bar');
        this.uiStage = document.getElementById('stage-indicator');
        this.uiNextBtn = document.getElementById('next-btn');
        this.uiIcon = document.getElementById('visual-icon');
        this.uiFeedback = document.getElementById('feedback-text');
    }

    start() {
        this.loadStep(0);
    }

    loadStep(idx) {
        if (idx >= LEVEL_1_STEPS.length) return;

        this.currentStepIdx = idx;
        const step = LEVEL_1_STEPS[idx];

        this.progress = 0;
        this.updateBar(0);
        this.isPaused = false;
        this.dragonEyeOpen = false;
        this.reactionActive = false;

        // Update Text
        this.uiStory.innerHTML = step.story;
        this.uiInstruction.innerText = step.instruction;

        // UI Indicator: "Bölüm 1 - Adım 1/11"
        this.uiStage.innerText = `Bölüm 1 - Adım ${idx + 1}/${LEVEL_1_STEPS.length}`;

        this.uiIcon.innerText = step.icon;
        this.uiFeedback.innerText = "";

        // Hide Next Btn
        this.uiNextBtn.classList.add('hidden');

        // Clean up timers
        if (this.stealthTimer) clearInterval(this.stealthTimer);
        if (this.reactionTimer) clearTimeout(this.reactionTimer);

        // Special Logic Init
        if (step.type === 'STEALTH') {
            this.startStealthLoop();
        }
        if (step.type === 'JUMP' || step.type === 'SHAKE') {
            this.startReactionLoop(step.type);
        }
    }

    update(events) {
        if (this.isPaused) return;

        // Store for async checks
        this.lastEvents = events;

        const step = LEVEL_1_STEPS[this.currentStepIdx];

        // --- STEP LOGIC ---

        // 1. STP / RUN
        if (step.type === 'STEP' && events.step) {
            this.addProgress(1, step.target);
            this.flashFeedback("ADIM!");
            if (window.soundManager) window.soundManager.playStep();
        }

        // 2. SWING / CHOP
        if ((step.type === 'SWING' || step.type === 'CHOP') && events.swing) {
            this.addProgress(1, step.target);
            this.flashFeedback("VURUŞ!");
            if (window.soundManager) window.soundManager.playSwing();
            // Vibration
            if (navigator.vibrate) navigator.vibrate(100);
        }

        // 3. STEALTH (Dragon)
        if (step.type === 'STEALTH') {
            if (this.stealthState === 'CHECK' || this.stealthState === 'WARN') {
                // Biz verifySquat ile kontrol ediyoruz, anlik hareket yanmaya sebep olabilir mi?
                // YANDIN logic'i verifySquat icine tasindi. 
                // Ancak cok bariz hareket varsa hemen yakalayabiliriz.
                // Simdilik sadece verifySquat'a guvenelim.
            } else if (this.stealthState === 'WALK') {
                // Can walk
                if (events.step) {
                    this.addProgress(1, step.target);
                    // Check triggers
                    this.checkStealthStep();
                    this.flashFeedback("SESSİZ ADIM...");
                    if (window.soundManager) window.soundManager.playStep();
                }
            } else if (this.stealthState === 'WAIT') {
                // Waiting for eye close... do nothing.
            }
        }

        // 4. REACTION (Jump / Shake)
        if (step.type === 'JUMP' || step.type === 'SHAKE') {
            // Only count if we asked for it
            if (this.reactionActive) {
                if (step.type === 'JUMP' && events.jump) {
                    if (window.soundManager) window.soundManager.playJump();
                    this.successReaction();
                }
                if (step.type === 'SHAKE' && events.shake) {
                    if (window.soundManager) window.soundManager.playShake();
                    this.successReaction();
                }
            }
        }
    }

    addProgress(amount, target) {
        if (this.progress >= target) return;

        this.progress += amount;
        const pct = (this.progress / target) * 100;
        this.updateBar(pct);

        if (this.progress >= target) {
            this.stepComplete();
        }
    }

    updateBar(pct) {
        this.uiBar.style.width = `${pct}%`;
    }

    stepComplete() {
        this.isPaused = true;

        if (window.soundManager) window.soundManager.playComplete();

        // Vibrate long
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        // Show Next Button
        this.uiNextBtn.classList.remove('hidden');
        this.uiFeedback.innerText = "ADIM TAMAMLANDI!";
    }

    nextStage() { // Wrapper for button click
        // Stop loops
        if (this.stealthTimer) clearInterval(this.stealthTimer);

        if (this.currentStepIdx < LEVEL_1_STEPS.length - 1) {
            this.loadStep(this.currentStepIdx + 1);
        } else {
            // End
            if (window.soundManager) window.soundManager.playWin();
            alert("Bölüm 1 Tamamlandı!");
        }
    }

    // --- SUB-LOGIC: STEALTH ---
    startStealthLoop() {
        // Init Stealth State
        this.stealthSteps = 0;
        this.nextEyeTrigger = 5 + Math.floor(Math.random() * 6); // 5-10 adim
        this.stealthState = 'WALK'; // WALK, CHECK, WARN, WAIT

        console.log("Stealth Init: Target " + this.nextEyeTrigger);
    }

    checkStealthStep() {
        if (this.stealthState !== 'WALK') return;

        this.stealthSteps++;
        console.log(`Stealth: ${this.stealthSteps}/${this.nextEyeTrigger}`);

        if (this.stealthSteps >= this.nextEyeTrigger) {
            this.openDragonEye();
        }
    }

    openDragonEye() {
        if (this.isPaused) return;

        this.stealthState = 'CHECK';
        this.dragonEyeOpen = true;

        // UI Update
        this.uiIcon.innerText = '👁️';
        this.uiIcon.classList.add('eye-open');
        this.uiFeedback.innerText = "GÖZLER AÇILDI! ÇÖK!";
        this.uiFeedback.style.color = "red";
        document.body.style.backgroundColor = "#440000"; // Red Tint

        // Vibrate warning
        if (navigator.vibrate) navigator.vibrate(500);

        // 1. Kontrol (2 saniye sonra)
        setTimeout(() => {
            if (this.currentStepIdx !== 3) return; // Safety
            this.verifySquat(1);
        }, 2000);
    }

    verifySquat(attempt) {
        // Kontrol Anı: Hareket var mı?
        // SensorManager son durumu events.isStill olarak gonderiyor ama anlik.
        // Biz burada son 500ms datasina bakamiyoruz ama anlik 'isStill' yeterli varsayalim.
        // Eger SensorManager surekli guncelleniyorsa, game loop icindeki son duruma bakmamiz lazim.
        // Ancak bu fonksiyon async timeout. O yuzden flag lazim.
        // HACK: SensorManager isStill degerini global veya instance prop olarak saklayalim.

        // Simdilik 'lastEvents' uzerinden bakalim (GameManager.update icinde saklanan)
        const isSafe = this.lastEvents && this.lastEvents.isStill;

        if (isSafe) {
            this.stealthSuccess();
        } else {
            if (attempt === 1) {
                // WARN - 2 Saniye daha ver
                this.stealthState = 'WARN';
                this.uiFeedback.innerText = "DAHA FAZLA ÇÖK!";
                this.uiFeedback.style.color = "orange";
                if (window.soundManager) window.soundManager.playStealthWarn();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

                setTimeout(() => {
                    if (this.currentStepIdx !== 3) return;
                    this.verifySquat(2);
                }, 2000);
            } else {
                // FAIL
                this.triggerBurn();
            }
        }
    }

    stealthSuccess() {
        this.stealthState = 'WAIT';
        this.uiFeedback.innerText = "GÜVENDESİN...";
        this.uiFeedback.style.color = "#00ff00";
        this.uiIcon.innerText = '✅';

        // Green Light
        document.body.style.backgroundColor = "#003300";

        // 5 Saniye Bekle
        setTimeout(() => {
            if (this.currentStepIdx !== 3) return;
            this.closeDragonEye();
        }, 5000);
    }

    closeDragonEye() {
        this.dragonEyeOpen = false;
        this.stealthState = 'WALK';

        // Reset Logic
        this.stealthSteps = 0;
        this.nextEyeTrigger = 5 + Math.floor(Math.random() * 6);

        // UI Reset
        this.uiIcon.innerText = '🤫';
        this.uiIcon.classList.remove('eye-open');
        this.uiFeedback.innerText = "Devam et...";
        this.uiFeedback.style.color = "var(--primary)";
        document.body.style.backgroundColor = "var(--bg)"; // Reset BG
    }

    triggerBurn() {
        if (this.burnState) return;
        this.burnState = true;
        this.uiFeedback.innerText = "BAŞARAMADIN! (YANDIN)";
        document.body.style.backgroundColor = "red";

        if (window.soundManager) window.soundManager.playFail();

        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);

        // Reset burn flag after a bit and Retry? 
        // Or just continue loop for prototype? Let's reset to walk.
        setTimeout(() => {
            this.burnState = false;
            this.closeDragonEye(); // Recover
        }, 3000);
    }

    // --- SUB-LOGIC: REACTION (JUMP/SHAKE) ---
    startReactionLoop(type) {
        const interval = type === 'SHAKE' ? 8000 : 8000; // 8s loop

        const loop = () => {
            // Wait 8s then trigger
            this.reactionTimer = setTimeout(() => {
                this.triggerReactionPrompt(type);
            }, interval);
        }
        loop();
        this.reactionLoopFn = loop;
    }

    triggerReactionPrompt(type) {
        if (this.isPaused) return;

        this.reactionActive = true;
        const prompt = type === 'JUMP' ? "ZIPLA!" : "SALLA!";
        this.uiIcon.innerText = type === 'JUMP' ? '⬆️' : '📳';
        this.uiFeedback.innerText = prompt;
        this.uiFeedback.style.fontSize = "40px";

        // Timeout to fail
        // JUMP: 4s delay allowed
        // SHAKE: 1s delay allowed
        const timeWindow = type === 'SHAKE' ? 1000 : 4000;

        setTimeout(() => {
            if (this.reactionActive) {
                // Time expired without action
                this.reactionActive = false;
                this.uiFeedback.innerText = "GEÇ KALDIN!";
                this.uiFeedback.style.fontSize = "24px";
                if (navigator.vibrate) navigator.vibrate(300);

                // Continue loop
                this.reactionLoopFn();
            }
        }, timeWindow);
    }

    successReaction() {
        this.reactionActive = false;
        this.uiFeedback.innerText = "HARİKA!";
        this.uiFeedback.style.fontSize = "24px";
        this.uiFeedback.style.color = "#00ff00";

        // Add progress
        const step = LEVEL_1_STEPS[this.currentStepIdx];
        this.addProgress(1, step.target);

        // Clear message after 2s
        setTimeout(() => {
            this.uiFeedback.innerText = "Bekle...";
            this.uiFeedback.style.color = "var(--primary)";
        }, 2000);

        // Continue loop
        this.reactionLoopFn();
    }

    flashFeedback(msg) {
        const old = this.uiFeedback.innerText;
        this.uiFeedback.innerText = msg;
        setTimeout(() => {
            if (this.uiFeedback.innerText === msg) this.uiFeedback.innerText = "";
        }, 500);
    }
}

// --- INITIALIZATION ---
const game = new GameManager();

// Button Listeners
document.getElementById('start-btn').addEventListener('click', () => {
    // Sensor Init
    const sm = new SensorManager((e) => game.update(e));
    sm.start();
});

document.getElementById('next-btn').addEventListener('click', () => {
    game.nextStage();
});
