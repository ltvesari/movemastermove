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

const MOVE_LIST = {
    // --- OFFENSIVE (Kılıç) ---
    '1': { id: '1', name: "Vanguard's Cleave", type: 'SLASH', desc: 'Sağ Üst -> Sol Alt (Çapraz)', trigger: 'slash_diag_down_left' },
    '2': { id: '2', name: "Sinister Slash", type: 'SLASH', desc: 'Sol Üst -> Sağ Alt (Çapraz)', trigger: 'slash_diag_down_right' },
    '3': { id: '3', name: "Rising Dragon", type: 'SLASH', desc: 'Sağ Alt -> Sol Üst (Ters Çapraz)', trigger: 'slash_diag_up_left' },
    '4': { id: '4', name: "Gale Upper", type: 'SLASH', desc: 'Sol Alt -> Sağ Üst (Ters Çapraz)', trigger: 'slash_diag_up_right' },
    '5': { id: '5', name: "Heartseeker", type: 'THRUST', desc: 'İleri Saplama (Thrust)', trigger: 'thrust_forward' },
    '6': { id: '6', name: "Executioner’s Gavel", type: 'SLASH', desc: 'Dikey İniş (Chop)', trigger: 'slash_vertical_down' },
    '7': { id: '7', name: "Earthshaker", type: 'SLASH', desc: 'Dikey Çöküş (Squat Chop)', trigger: 'slash_vertical_drop' },
    '8': { id: '8', name: "Horizon Sweeper", type: 'SLASH', desc: 'Sağdan Sola (Yatay)', trigger: 'slash_horizontal_left' },
    '9': { id: '9', name: "Blade Hurricane", type: 'SLASH', desc: 'Soldan Sağa (Yatay)', trigger: 'slash_horizontal_right' },

    // --- DEFENSIVE (Korunma) ---
    '20': { id: '20', name: "Iron Stance", type: 'STANCE', desc: 'Squat & Bekle', trigger: 'stance_stable' },
    '21': { id: '21', name: "Aegis of Heavens", type: 'STANCE', desc: 'Baş Üstü Koruma & Squat', trigger: 'stance_high' },
    '22': { id: '22', name: "Valkyrie’s Ward", type: 'ACTION', desc: 'Korun & Zıpla', trigger: 'action_jump' },
    '23': { id: '23', name: "Relentless Pursuit", type: 'ACTION', desc: 'Olduğun Yerde Koş', trigger: 'action_run' },
    '24': { id: '24', name: "Dwarven Breaker", type: 'ACTION', desc: 'Kettlebell Swing', trigger: 'action_swing' },
    '25': { id: '25', name: "Shadow Step", type: 'ACTION', desc: 'Sağa/Sola Sıçra', trigger: 'action_dodge' },

    // --- MAGIC (Büyü) ---
    '41': { id: '41', name: "Sigil of Banishing", type: 'PATTERN', desc: 'Havada X Çiz', trigger: 'pattern_x' },
    '42': { id: '42', name: "Arcane Comet", type: 'PATTERN', desc: 'Daire Çiz + Fırlat', trigger: 'pattern_circle_throw' },
    '43': { id: '43', name: "Nova Eruption", type: 'PATTERN', desc: 'Çök & Patla', trigger: 'pattern_squat_explode' },
    '44': { id: '44', name: "Pentagram of Doom", type: 'PATTERN', desc: '5 Köşeli Yıldız', trigger: 'pattern_star' }
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
        const deltaBeta = end.beta - start.beta;    // Pitch (Up/Down tilt)

        // Calculate maximum linear acceleration on axes
        let maxX = 0, maxY = 0, maxZ = 0;
        this.history.forEach(h => {
            if (Math.abs(h.a.x) > maxX) maxX = Math.abs(h.a.x);
            if (Math.abs(h.a.y) > maxY) maxY = Math.abs(h.a.y);
            if (Math.abs(h.a.z) > maxZ) maxZ = Math.abs(h.a.z);
        });

        // --- HEURISTICS ---
        let detectedId = null;

        // 1. HORIZONTAL SLASHES (Dominant Gamma Change, minimal Beta)
        if (Math.abs(deltaGamma) > 30 && Math.abs(deltaBeta) < 20) {
            // Left to Right (Gamma Increasing)
            if (deltaGamma > 30) detectedId = '9'; // Blade Hurricane
            // Right to Left (Gamma Decreasing)
            else if (deltaGamma < -30) detectedId = '8'; // Horizon Sweeper
        }

        // 2. DIAGONAL SLASHES (Both Gamma and Beta change)
        else if (Math.abs(deltaGamma) > 20 && Math.abs(deltaBeta) > 15) {
            // Unify logic: 
            // Vanguard: Right-Up to Left-Down. Gamma decreases, Beta decreases (phone dips)? 
            // Let's assume standard "Phone is Sword" grip.

            if (deltaGamma < -20) {
                // Moving Left
                if (deltaBeta < 0) detectedId = '1'; // Down-Left (Vanguard)
                else detectedId = '3'; // Up-Left (Rising Dragon)
            } else {
                // Moving Right
                if (deltaBeta < 0) detectedId = '2'; // Down-Right (Sinister)
                else detectedId = '4'; // Up-Right (Gale Upper)
            }
        }

        // 3. VERTICAL SLASHES (Dominant Beta Change or High Y/Z Accel with no Rotation)
        else if (Math.abs(deltaBeta) > 30 && Math.abs(deltaGamma) < 20) {
            if (deltaBeta < -30) detectedId = '6'; // Executioner (Down)
            // Upward vertical is rare, maybe lift?
        }

        // 4. THRUST (Dominant Y-Accel, Low Rotation)
        else if (maxY > 10 && Math.abs(deltaGamma) < 15 && Math.abs(deltaBeta) < 15) {
            detectedId = '5'; // Heartseeker
        }

        // 5. EARTHSHAKER (Special Case: Drop)
        // Check for "Freefall" (close to 0G) followed by spike?
        // Or just strong downward Beta/Z?
        // Let's map it to Executioner for now if it's strong down, or separte if we detect Squat.

        // --- FALLBACK / OVERRIDE ---
        // If unspecified but high force, default to closest simple slash

        // --- SCORING LOGIC ---
        // Calculate score based on how "strong" and "clear" the move was.
        // Base Score: 50
        // + Force Bonus (up to 25)
        // + Angle Accuracy (up to 25)

        let score = 0;

        // 1. Force Score (Max 25 pts for force > 25m/s2)
        // Threshold was 15.
        // If MaxForce is 25 => 100% force score.
        let maxForce = 0;
        this.history.forEach(h => { if (h.f > maxForce) maxForce = h.f; });

        let forceScore = Math.min((maxForce / 25) * 100, 100);

        // 2. Angle Match Score
        // If we detected a move, it means we passed the threshold.
        // But how "deep" was the cut?
        // Vanguard Ideal: Delta Gamma = -60. If we got -30 (threshold), score is lower.

        // Calculate a generic "Motion Magnitude" score
        // We use the detected ID to check against ideal?
        // Or just map "Intensity" to score for now since we rely on heuristics?

        if (detectedId) {
            // For now, let's use a simpler heuristic for V1.1
            // Score = (Force % + Rotation Magnitude %) / 2

            let rotationMag = Math.abs(deltaGamma) + Math.abs(deltaBeta);
            // Ideal rotation sum ~ 60-90 degrees
            let rotationScore = Math.min((rotationMag / 60) * 100, 100);

            score = Math.floor((forceScore * 0.4) + (rotationScore * 0.6));
            this.triggerMove(detectedId, score);
        }
    }

    startStanceEvaluation() {
        this.isEvaluatingStance = true;
        this.stanceStartTime = Date.now();
        this.stanceFailed = false;
        this.showFeedback("BEKLE... (Hareketsiz)");
        this.maxStabilityError = 0;
    }

    checkStance(accel, gyro) {
        if (!this.isEvaluatingStance) return;

        // Stability Score
        // Ideal: 0 motion.
        // Error = Abs(Gyro)
        let currentError = Math.abs(gyro.alpha) + Math.abs(gyro.beta) + Math.abs(gyro.gamma);
        if (currentError > this.maxStabilityError) this.maxStabilityError = currentError;

        if (currentError > 50) { // Too much movement
            // Fail? Or just lower score?
        }

        const duration = Date.now() - this.stanceStartTime;

        if (duration > 3000) {
            this.isEvaluatingStance = false;

            // Calculate Score: Lower error = Higher Score
            // If MaxError < 10 => 100%. If MaxError > 50 => 0%.
            let stabilityScore = Math.max(0, 100 - (this.maxStabilityError * 2));

            this.triggerMove('20', Math.floor(stabilityScore));
        }
    }

    triggerMove(moveId, score = 0) {
        this.lastTriggerTime = Date.now();
        const move = MOVE_LIST[moveId];
        let finalMoveId = moveId;

        // --- COMBO / PATTERN LOGIC ---
        // Sigil (41) Upgrade
        const now = Date.now();
        if (moveId === '2' && this.lastMoveId === '1' && (now - this.lastMoveTime < 1500)) {
            finalMoveId = '41';
            // Combo Score = Average of this stroke and previous stroke?
            // For now just use current score
            score += 10; // Combo Bonus
            if (score > 100) score = 100;
        }

        this.lastMoveId = finalMoveId;
        this.lastMoveTime = now;
        this.lastTriggerTime = now;

        const finalName = MOVE_LIST[finalMoveId].name;
        console.log(`MOVE DETECTED: ${finalName} (Score: ${score}%)`);

        // Visual Feedback
        this.showFeedback(finalName);

        if (this.onMoveDetected) this.onMoveDetected(finalMoveId, score);
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

        // Reset Score Display
        const scoreDiv = document.getElementById('accuracy-display');
        if (scoreDiv) scoreDiv.style.opacity = '0';

        referee.setTargetMove(move.id);

        referee.setTargetCallback((detectedId, score) => {
            if (detectedId === this.currentTarget.id) {
                this.displayScore(score);

                let praise = "BAŞARILI";
                if (score > 85) praise = "MÜKEMMEL!";
                else if (score > 60) praise = "İYİ!";
                else praise = "OLDU GİBİ...";

                referee.showFeedback(praise);
                document.getElementById('feedback-message').style.color = score > 80 ? '#00ff00' : '#ffff00';

                setTimeout(() => this.nextRandomTurn(), 3000);
            } else {
                referee.showFeedback("YANLIŞ!");
                document.getElementById('feedback-message').style.color = '#ff0055';
            }
        });
    }

    displayScore(score) {
        const scoreDiv = document.getElementById('accuracy-display');
        const scoreVal = document.getElementById('score-val');

        if (!scoreVal) return;

        scoreVal.innerText = score + "%";

        // Color based on score
        if (score >= 80) scoreVal.style.color = "#00ff00"; // Green
        else if (score >= 50) scoreVal.style.color = "#ffff00"; // Yellow
        else scoreVal.style.color = "#ff5500"; // Orange

        if (scoreDiv) scoreDiv.style.opacity = '1';
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
