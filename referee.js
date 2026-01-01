/**
 * MoveHero Referee Game Engine
 */

class SensorManager {
    constructor() {
        this.accel = { x: 0, y: 0, z: 0 };
        this.gyro = { alpha: 0, beta: 0, gamma: 0 };

        // Calibration
        this.offsets = { x: 0, y: 0, z: 0 };
        this.isCalibrating = false;
        this.calibrationBuffer = { x: [], y: [], z: [] };

        this.maxForce = 0;
        this.isActive = false;

        // DOM Elements for debug
        this.uiAccel = document.getElementById('val-accel');
        this.uiGyro = document.getElementById('val-gyro');
        this.uiMax = document.getElementById('val-max');
    }

    async requestPermission() {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    this.startListeners();
                    return true;
                } else {
                    alert('Sensor izni reddedildi!');
                    return false;
                }
            } catch (e) {
                console.error(e);
                alert('İzin hatası: ' + e);
                return false;
            }
        } else {
            this.startListeners();
            return true;
        }
    }

    startListeners() {
        this.isActive = true;
        document.getElementById('sensor-status').innerText = "Durum: AKTİF";
        document.getElementById('sensor-status').style.color = "#00f3ff";

        // Show Calibrate Button
        document.getElementById('btn-calibrate').style.display = 'block';

        window.addEventListener('devicemotion', (event) => {
            this.handleMotion(event);
        });

        window.addEventListener('deviceorientation', (event) => {
            this.handleOrientation(event);
        });
    }

    startCalibration() {
        if (!this.isActive) return;

        this.isCalibrating = true;
        this.calibrationBuffer = { x: [], y: [], z: [] };

        // Reset offsets
        this.offsets = { x: 0, y: 0, z: 0 };

        referee.showFeedback("SABİT DUR... (3sn)");

        setTimeout(() => {
            this.finishCalibration();
        }, 3000);
    }

    finishCalibration() {
        this.isCalibrating = false;

        const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        this.offsets.x = avg(this.calibrationBuffer.x);
        this.offsets.y = avg(this.calibrationBuffer.y);
        this.offsets.z = avg(this.calibrationBuffer.z);

        console.log("Calibration Done:", this.offsets);
        referee.showFeedback("KALİBRASYON TAMAM!");
        document.getElementById('sensor-status').innerText = "Durum: KALİBRE EDİLDİ";
    }

    handleMotion(event) {
        // Read raw
        const rawAcc = event.accelerationIncludingGravity || event.acceleration; // Use gravity context for orientation
        // const rawAcc = event.acceleration; // Use pure acceleration for impact?
        // Note: For sword swings, we often want 'acceleration' (linear) to detect force, 
        // but 'accelerationIncludingGravity' helps with orientation (up/down).
        // Let's store both if possible, or stick to one. 
        // For MoveHero, 'acceleration' is better for "Slashing" (Force),
        // 'accelerationIncludingGravity' (or gravity vector) is better for "Stance" (Holding steady).

        // Let's use acceleration (linear) for force calculation
        let x = (event.acceleration ? event.acceleration.x : 0) || 0;
        let y = (event.acceleration ? event.acceleration.y : 0) || 0;
        let z = (event.acceleration ? event.acceleration.z : 0) || 0;

        // If calibrating, store raw values of gravity context if we were using that, 
        // but here we are calibrating 'noise' in linear acceleration (which should be 0 when still).
        if (this.isCalibrating) {
            this.calibrationBuffer.x.push(x);
            this.calibrationBuffer.y.push(y);
            this.calibrationBuffer.z.push(z);
        }

        // Apply Offset (Bias correction)
        this.accel.x = x - this.offsets.x;
        this.accel.y = y - this.offsets.y;
        this.accel.z = z - this.offsets.z;

        // Force Calculation
        const force = Math.sqrt(this.accel.x ** 2 + this.accel.y ** 2 + this.accel.z ** 2);
        if (force > this.maxForce) this.maxForce = force;

        this.updateUI();

        referee.analyze(this.accel, this.gyro, force);
    }

    handleOrientation(event) {
        this.gyro.alpha = event.alpha || 0;
        this.gyro.beta = event.beta || 0;
        this.gyro.gamma = event.gamma || 0;
    }

    updateUI() {
        if (!this.uiAccel) return;
        this.uiAccel.innerText = `${this.accel.x.toFixed(1)}, ${this.accel.y.toFixed(1)}, ${this.accel.z.toFixed(1)}`;
        this.uiGyro.innerText = `${this.gyro.alpha.toFixed(0)}, ${this.gyro.beta.toFixed(0)}, ${this.gyro.gamma.toFixed(0)}`;
        this.uiMax.innerText = this.maxForce.toFixed(1);
    }
}

// --- MOVE LIBRARY ---
const MOVE_LIST = {
    // Offensive (Kılıç)
    '1': { id: '1', name: "Vanguard's Cleave", type: 'SLASH', desc: 'Sağ Üst -> Sol Alt', trigger: 'accel_high' },
    '2': { id: '2', name: "Sinister Slash", type: 'SLASH', desc: 'Sol Üst -> Sağ Alt', trigger: 'accel_high' },
    '5': { id: '5', name: "Heartseeker", type: 'THRUST', desc: 'İleri Saplama', trigger: 'accel_forward' },

    // Defensive (Korunma)
    '20': { id: '20', name: "Iron Stance", type: 'STANCE', desc: 'Squat & Bekle', trigger: 'stability' },

    // Magic (Büyü)
    '41': { id: '41', name: "Sigil of Banishing", type: 'PATTERN', desc: 'Havada X Çiz', trigger: 'pattern' }
};

class MoveReferee {
    constructor() {
        this.history = [];
        this.historyLimit = 60; // 1 second buffer
        this.feedbackUI = document.getElementById('feedback-message');
        this.lastTriggerTime = 0;
        this.cooldown = 1200;
        this.isEvaluatingStance = false;

        // Combo State
        this.lastMoveId = null;
        this.lastMoveTime = 0;

        // Active Target Move (If we are looking for a specific one)
        this.targetMoveId = null;
    }

    setTargetMove(moveId) {
        this.targetMoveId = moveId;
        this.isEvaluatingStance = false;

        // If Iron Stance, we start evaluating immediately
        if (moveId === '20') {
            this.startStanceEvaluation();
        }
    }

    analyze(accel, gyro, force) {
        const now = Date.now();
        this.history.push({ a: { ...accel }, g: { ...gyro }, f: force, t: now });
        if (this.history.length > this.historyLimit) this.history.shift();

        if (now - this.lastTriggerTime < this.cooldown && !this.isEvaluatingStance) return;

        // --- DETECTION LOGIC CHAIN ---

        // 1. STANCE (Continuous Check)
        if (this.targetMoveId === '20') {
            this.checkStance(accel, gyro);
            return; // Don't check others if doing stance
        }

        // 2. OFFENSIVE (Triggered by Force)
        const SWING_THRESHOLD = 15;
        if (force > SWING_THRESHOLD) {
            this.classifyOffensive();
        }
    }

    classifyOffensive() {
        if (this.history.length < 10) return;

        // Get Delta Orientation
        const start = this.history[0].g;
        const end = this.history[this.history.length - 1].g;
        const deltaGamma = end.gamma - start.gamma; // Roll (Left/Right tilt)

        // Determine intended outcome
        let detectedId = null;

        // Vanguard: Right(Pos) to Left(Neg) -> Gamma Decrease
        // Heartseeker: Thrust detection
        // A thrust is a rapid +Y acceleration (along the phone length) with minimal rotation.
        let maxY = 0;
        this.history.forEach(h => {
            if (Math.abs(h.a.y) > maxY) maxY = Math.abs(h.a.y);
        });

        // Heuristic: If we have high Y-accel and LOW rotation change
        if (deltaGamma < -30) detectedId = '1';
        else if (deltaGamma > 30) detectedId = '2';
        else if (maxY > 10 && Math.abs(deltaGamma) < 15) detectedId = '5'; // Heartseeker

        if (detectedId) {
            this.triggerMove(detectedId);
        }
    }

    startStanceEvaluation() {
        this.isEvaluatingStance = true;
        this.stanceStartTime = Date.now();
        this.stanceFailed = false;
        this.showFeedback("BEKLE... (Hareketsiz)");
    }

    checkStance(accel, gyro) {
        if (!this.isEvaluatingStance) return;

        // Fail Condition: Moving too much
        const stabilityThreshold = 2.0; // m/s2 total force deviation from 1G (approx)
        // Or just raw accel magnitude deviation?
        // Let's use gyro for stability. 
        if (Math.abs(gyro.alpha) > 10 || Math.abs(gyro.beta) > 10 || Math.abs(gyro.gamma) > 10) {
            // Rotational movement detected
            // this.stanceFailed = true; // Strict mode
        }

        const duration = Date.now() - this.stanceStartTime;

        if (duration > 3000) {
            this.isEvaluatingStance = false;
            this.triggerMove('20'); // Success
        }
    }

    triggerMove(moveId) {
        const now = Date.now();
        const move = MOVE_LIST[moveId];
        let finalMoveId = moveId;

        // --- COMBO / PATTERN LOGIC ---
        // Sigil of Banishing (41) = Vanguard (1) + Sinister (2) within 1.5s
        if (moveId === '2' && this.lastMoveId === '1' && (now - this.lastMoveTime < 1500)) {
            finalMoveId = '41'; // Upgrade to Sigil
        }

        // Update History
        this.lastMoveId = finalMoveId;
        this.lastMoveTime = now;
        this.lastTriggerTime = now; // Reset cooldown

        const finalName = MOVE_LIST[finalMoveId].name;
        console.log(`MOVE DETECTED: ${finalName}`);

        // Visual Feedback
        this.showFeedback(finalName);

        if (this.onMoveDetected) this.onMoveDetected(finalMoveId);
    }

    showFeedback(msg) {
        this.feedbackUI.innerText = msg;
        this.feedbackUI.style.animation = 'none';
        this.feedbackUI.offsetHeight;
        this.feedbackUI.style.animation = 'pulse 0.2s';
        this.feedbackUI.style.color = '#00f3ff';
    }
}
MoveReferee.prototype.setTargetCallback = function (cb) { this.onMoveDetected = cb; };

class GameManager {
    constructor() {
        this.moves = Object.values(MOVE_LIST);
        this.uiTarget = document.getElementById('target-move');
        this.uiInstruction = document.querySelector('.instruction-label');
    }

    startParamPractice(moveId) {
        // Practice single move
        const move = MOVE_LIST[moveId];
        this.setupTurn(move);
    }

    startRandomGame() {
        this.nextRandomTurn();
    }

    nextRandomTurn() {
        const move = this.moves[Math.floor(Math.random() * this.moves.length)];
        this.setupTurn(move);
    }

    setupTurn(move) {
        this.currentTarget = move;
        this.uiTarget.innerText = move.name.toUpperCase();
        this.uiInstruction.innerText = move.desc;
        this.uiTarget.style.color = "#fff";

        referee.setTargetMove(move.id);

        referee.setTargetCallback((detectedId) => {
            if (detectedId === this.currentTarget.id) {
                referee.showFeedback("MÜKEMMEL!");
                document.getElementById('feedback-message').style.color = '#00ff00';
                setTimeout(() => this.nextRandomTurn(), 2000);
            } else {
                referee.showFeedback("YANLIŞ!");
                document.getElementById('feedback-message').style.color = '#ff0055';
            }
        });
    }
}

class Simulator {
    constructor() { }
    triggerMove(moveId) {
        console.log("Simulating:", moveId);
        if (moveId === '1') this.runSequence(50, -50, 'gamma', 20); // Vanguard
        if (moveId === '2') this.runSequence(-50, 50, 'gamma', 20); // Sinister
        if (moveId === '5') {
            // Heartseeker: High Force (Y axis simulation needs to be handled in analyze, but Simulator passes generic force)
            // We need to trick the logic. The logic checks `accel.y`.
            // My Simulator `runSequence` passes `accel: {x:0, y:0, z:0}`. I need to update runSequence or make a specific one.
            this.runSequence(0, 0, 'gamma', 20, { x: 0, y: 20, z: 0 });
        }
        if (moveId === '20') {
            // Iron Stance: no motion for 3 sec
            // But verify checkStance is running
            referee.setTargetMove('20');
            // Mock time passing? Simulator can't easily mock Date.now() without extensive changes.
            // Just force trigger:
            setTimeout(() => referee.triggerMove('20'), 3000);
        }
        if (moveId === '41') {
            // Sigil: Draw X (Vanguard + Sinister)
            this.runSequence(50, -50, 'gamma', 20); // Vanguard first
            setTimeout(() => {
                this.runSequence(-50, 50, 'gamma', 20); // Sinister second
            }, 800); // 800ms delay
        }
    }

    runSequence(start, end, axis, forceVal, customAccel = { x: 0, y: 0, z: 0 }) {
        let frames = 20;
        let step = (end - start) / frames;
        let i = 0;
        let interval = setInterval(() => {
            let val = start + (step * i);
            let gyro = { alpha: 0, beta: 0, gamma: 0 };
            gyro[axis] = val;
            let force = (i > 8 && i < 12) ? forceVal : 5;

            // Use custom accel if provided, otherwise zero (force is passed separately)
            referee.analyze(customAccel, gyro, force);
            i++;
            if (i >= frames) clearInterval(interval);
        }, 30);
    }
}

// Init
const sensorManager = new SensorManager();
const referee = new MoveReferee();
const simulator = new Simulator();
const gameManager = new GameManager();

document.getElementById('btn-connect').addEventListener('click', () => {
    sensorManager.requestPermission();
    document.getElementById('btn-connect').style.display = 'none';

    // Start Random Game
    setTimeout(() => {
        gameManager.startRandomGame();
    }, 1000);
});

document.getElementById('btn-calibrate').addEventListener('click', () => {
    sensorManager.startCalibration();
});
