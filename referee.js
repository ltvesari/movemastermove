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

        let x = (event.acceleration ? event.acceleration.x : 0) || 0;
        let y = (event.acceleration ? event.acceleration.y : 0) || 0;
        let z = (event.acceleration ? event.acceleration.z : 0) || 0;

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
    '20': { id: '20', name: "Iron Stance", type: 'STANCE', desc: 'Göğüs Hizasında Bekle (3sn)', trigger: 'stance_stable' },
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

        // If Stance Moves (20: Iron Stance, 21: Aegis), start evaluating
        if (moveId === '20' || moveId === '21') {
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
        if (this.targetMoveId === '20' || this.targetMoveId === '21') {
            this.checkStance(accel, gyro, force);
            return;
        }

        // 2. ACTION (Discrete Movements like Jump, Run)
        if (['22', '23', '24', '25'].includes(this.targetMoveId)) {
            this.checkAction(accel, gyro, force);
            return;
        }

        // 3. OFFENSIVE (Triggered by Force)
        // ACCESSIBILITY UPDATE: Lowered from 15 to 8 to allow "Casual" swings
        const SWING_THRESHOLD = 8;
        if (force > SWING_THRESHOLD) {
            this.classifyOffensive();
        }
    }
    // ... (skipping classifyOffensive for brevity, assuming tool merges correctly) ...
    startStanceEvaluation() {
        this.isEvaluatingStance = true;
        this.stanceStartTime = Date.now();
        this.stanceFailed = false;
        this.showFeedback("SABİT DUR... (3sn)");
        this.maxStabilityError = 0;
    }

    checkStance(accel, gyro, force) {
        if (!this.isEvaluatingStance) return;

        // Stability Score
        // Error = Gyro Rotation + Force Fluctuation
        // We want force to be roughly 0 (after gravity offset removal) or steady gravity
        // Since 'force' is based on accel-offsets, it should be close to 0 if still.

        let gyroError = Math.abs(gyro.alpha) + Math.abs(gyro.beta) + Math.abs(gyro.gamma);
        let forceError = force * 10; // Scale force to be comparable to degrees

        let currentError = gyroError + forceError;

        if (currentError > this.maxStabilityError) this.maxStabilityError = currentError;

        if (currentError > 100) {
            this.showFeedback("ÇOK HAREKETLİ!", "#ff5500");
            // Reset timer?
            this.stanceStartTime = Date.now();
            this.maxStabilityError = 0;
        }

        const duration = Date.now() - this.stanceStartTime;

        if (duration > 3000) {
            this.isEvaluatingStance = false;

            // Calculate Score
            let stabilityScore = Math.max(0, 100 - (this.maxStabilityError));

            // Trigger whatever the target was (20 or 21)
            this.triggerMove(this.targetMoveId, Math.floor(stabilityScore));
        }
    }

    classifyOffensive() {
        if (this.history.length < 5) return;

        // --- VECTOR ANALYSIS (Hybrid Approach) ---
        // Priority: Specific Vectors (Up/Thrust) -> General Vectors (Left/Right)

        let sumX = 0, sumY = 0;
        let maxX = 0, maxY = 0;
        let maxForce = 0;

        // Gyro Analysis for Vertical Separation
        const start = this.history[0].g;
        const end = this.history[this.history.length - 1].g;
        const deltaBeta = Math.abs(end.beta - start.beta); // Pitch Change (Vertical Swing)

        this.history.forEach(h => {
            sumX += h.a.x;
            sumY += h.a.y;

            if (Math.abs(h.a.x) > Math.abs(maxX)) maxX = h.a.x;
            if (h.a.y > maxY) maxY = h.a.y;
            if (h.f > maxForce) maxForce = h.f;
        });

        const avgX = sumX / this.history.length;
        const avgY = sumY / this.history.length;

        console.log(`VECTOR: avgX=${avgX.toFixed(1)}, avgY=${avgY.toFixed(1)}, dBeta=${deltaBeta.toFixed(0)}, Force=${maxForce.toFixed(1)}`);

        let detectedId = null;

        // --- TIER 1: COMPLEX / SPECIFIC MOVES ---

        // 3. RISING DRAGON (Left + Up)
        if (avgX < -1 && avgY > 2 && maxForce > 8) {
            console.log("-> MATCH: Rising Dragon (Up-Left)");
            detectedId = '3';
        }

        // 4. GALE UPPER (Right + Up)
        else if (avgX > 1 && avgY > 2 && maxForce > 8) {
            console.log("-> MATCH: Gale Upper (Up-Right)");
            detectedId = '4';
        }

        // 6. EXECUTIONER'S GAVEL (Vertical Chop)
        // High Force, Minimal X, High Pitch Rotation (Swing down)
        // Vector: Strong Y (Centrifugal)
        else if (maxForce > 10 && Math.abs(avgX) < 2.5 && deltaBeta > 30) {
            console.log("-> MATCH: Executioner (Chop Down)");
            detectedId = '6';
        }

        // 7. EARTHSHAKER (Vertical Drop / Squat)
        // User: "Lift up and bring down to ground".
        // Physics: Linear Downward Acceleration (Negative Y)
        // Distinction: Low Rotation (unlike Executioner)
        else if (maxForce > 8 && avgY < -2 && deltaBeta < 30) {
            console.log("-> MATCH: Earthshaker (Drop)");
            detectedId = '7';
        }

        // 8. HORIZON SWEEPER (Right -> Left, Flat)
        // Request: "Height unchanged, Right to Left accel"
        // Vector: Strong Left (Neg X), Minimal Y (Flat)
        else if (avgX < -2 && Math.abs(avgY) < 2 && maxForce > 8) {
            console.log("-> MATCH: Horizon Sweeper (Flat Left)");
            detectedId = '8';
        }

        // 9. BLADE HURRICANE (Left -> Right, Flat)
        // Request: "Height unchanged, Left to Right accel"
        // Vector: Strong Right (Pos X), Minimal Y (Flat)
        else if (avgX > 2 && Math.abs(avgY) < 2 && maxForce > 8) {
            console.log("-> MATCH: Blade Hurricane (Flat Right)");
            detectedId = '9';
        }

        // 5. HEARTSEEKER (Thrust)
        // High Force, Minimal X, Minimal Pitch Rotation (Stab)
        // Also ensure it's not a drop (AvgY should be positive or neutral, not strongly negative)
        else if (maxForce > 8 && Math.abs(avgX) < 2 && deltaBeta < 30 && avgY > -1) {
            console.log("-> MATCH: Heartseeker (Thrust)");
            detectedId = '5';
        }

        // --- TIER 2: BASIC SWINGS (Fallback) ---

        // 1. VANGUARD (Left)
        else if (avgX < -1 && maxForce > 8) {
            console.log("-> MATCH: Vanguard (Left)");
            detectedId = '1';
        }

        // 2. SINISTER (Right)
        else if (avgX > 1 && maxForce > 8) {
            console.log("-> MATCH: Sinister (Right)");
            detectedId = '2';
        }

        // --- SCORING & FEEDBACK ---
        if (detectedId) {
            let intensityScore = Math.min(((maxForce - 8) / 12) * 50, 50);
            let totalScore = Math.floor(50 + intensityScore);
            this.triggerMove(detectedId, totalScore);
        } else {
            if (maxForce > 12) {
                let hint = "NET BİR YÖN BELİRLE!";
                if (Math.abs(avgY) > 3 && deltaBeta > 20) hint = "DAHA DİK İNDİR!"; // Executioner fail?
                else if (this.targetMoveId === '5' && deltaBeta > 30) hint = "BİLEĞİNİ BÜKME! (Düz Sapla)";
                else if (avgX > 0) hint = "SOLA?";
                else if (avgX < 0) hint = "SAĞA?";

                this.triggerFail(hint);
            }
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
        const now = Date.now();
        if (moveId === '2' && this.lastMoveId === '1' && (now - this.lastMoveTime < 1500)) {
            finalMoveId = '41'; // Sigil
            score += 10;
            if (score > 100) score = 100;
        }

        this.lastMoveId = finalMoveId;
        this.lastMoveTime = now;
        this.lastTriggerTime = now;

        const finalName = MOVE_LIST[finalMoveId].name;
        console.log(`MOVE DETECTED: ${finalName} (Score: ${score}%)`);

        // If in Free Mode using internal feedback
        if (!this.onMoveDetected) {
            this.showFeedback(finalName);
        }

        // Notify Game Logic
        if (this.onMoveDetected) this.onMoveDetected(finalMoveId, score);
    }

    triggerFail(reason) {
        this.lastTriggerTime = Date.now(); // Put on cooldown to avoid spam
        console.log(`MOVE FAILED: ${reason}`);

        // Visual Feedback for failure
        this.showFeedback(reason, '#ff0055');

        if (this.onMoveFailed) this.onMoveFailed(reason);
    }

    showFeedback(msg, color = '#00f3ff') {
        this.feedbackUI.innerText = msg;
        this.feedbackUI.style.animation = 'none';
        this.feedbackUI.offsetHeight;
        this.feedbackUI.style.animation = 'pulse 0.2s';
        this.feedbackUI.style.color = color;
    }
}
MoveReferee.prototype.setTargetCallback = function (cb) { this.onMoveDetected = cb; };
MoveReferee.prototype.setFailureCallback = function (cb) { this.onMoveFailed = cb; };

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
                referee.showFeedback("YANLIŞ HAREKET!", "#ff5500");
                // The failure callback below handles detailed reasons usually, 
                // but if a wrong move is FULLY detected, we land here.
            }
        });

        // Listen for "Near Misses" or "Failures"
        referee.setFailureCallback((reason) => {
            // Only show if we haven't already succeeded (handled by referee cooldown mostly, but safe to check)
            // We rely on Referee's showFeedback which updates the UI directly.
            // But we might want to play a sound or shake screen here?
            console.log("Game Manager Report: Fail -> " + reason);
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

// --- RECORDER CLASS ---
class MoveRecorder {
    constructor() {
        this.isRecording = false;
        this.dataBuffer = [];
        this.currentMoveId = null;
    }

    start(moveId) {
        this.isRecording = true;
        this.currentMoveId = moveId;
        this.dataBuffer = [];
        console.log("Recording Started for:", moveId);
    }

    recordFrame(accel, gyro) {
        if (!this.isRecording) return;
        this.dataBuffer.push({
            t: Date.now(),
            a: { ...accel },
            g: { ...gyro }
        });
    }

    stop() {
        this.isRecording = false;
        console.log("Recording Stopped. Frames:", this.dataBuffer.length);
        this.download();
    }

    download() {
        const moveName = MOVE_LIST[this.currentMoveId].name.replace(/ /g, "_");
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.dataBuffer));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `move_data_${moveName}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

// --- APP MANAGER ---
class App {
    constructor() {
        this.mode = 'referee'; // referee | recorder
        this.recorder = new MoveRecorder();
    }

    setMode(newMode) {
        this.mode = newMode;

        // UI Toggling
        const refereePanel = document.getElementById('combat-display');
        const recorderPanel = document.getElementById('recorder-panel');

        if (newMode === 'recorder') {
            refereePanel.style.display = 'none';
            recorderPanel.style.display = 'block';
        } else {
            refereePanel.style.display = 'flex';
            recorderPanel.style.display = 'none';
        }
    }

    // Hook into Sensor Stream
    handleSensorData(accel, gyro, force) {
        // Always update UI Debug
        // sensorManager.updateUI(); // Done in sensor manager

        if (this.mode === 'referee') {
            referee.analyze(accel, gyro, force);
        } else if (this.mode === 'recorder') {
            this.recorder.recordFrame(accel, gyro);
        }
    }
}

// Init
// Init Global Objects (Attached to window for HTML access)
window.sensorManager = new SensorManager();
window.referee = new MoveReferee();
window.simulator = new Simulator();
window.gameManager = new GameManager();
window.app = new App();

// Hook Sensor Manager to App instead of Referee directly
SensorManager.prototype.startListeners = function () {
    this.isActive = true;
    document.getElementById('sensor-status').innerText = "Durum: AKTİF";
    document.getElementById('sensor-status').style.color = "#00f3ff";
    document.getElementById('btn-calibrate').style.display = 'block';

    window.addEventListener('devicemotion', (event) => {
        this.handleMotion(event);
    });
    window.addEventListener('deviceorientation', (event) => {
        this.handleOrientation(event);
    });
};

// Override HandleMotion to route via App
const originalHandleMotion = SensorManager.prototype.handleMotion;
SensorManager.prototype.handleMotion = function (event) {
    // ... Copy paste of logic or better: modify SensorManager class directly.
    // Let's monkey patch for now to avoid re-writing the big class right now.

    // RE-IMPLEMENTING handleMotion cleanly to fix "referee is not defined" scope issue if valid
    // Reuse existing logic but change the call at the end.

    // Read raw
    let x = (event.acceleration ? event.acceleration.x : 0) || 0;
    let y = (event.acceleration ? event.acceleration.y : 0) || 0;
    let z = (event.acceleration ? event.acceleration.z : 0) || 0;

    // Calibration
    if (this.isCalibrating) {
        this.calibrationBuffer.x.push(x);
        this.calibrationBuffer.y.push(y);
        this.calibrationBuffer.z.push(z);
    }

    this.accel.x = x - this.offsets.x;
    this.accel.y = y - this.offsets.y;
    this.accel.z = z - this.offsets.z;

    const force = Math.sqrt(this.accel.x ** 2 + this.accel.y ** 2 + this.accel.z ** 2);
    if (force > this.maxForce) this.maxForce = force;

    this.updateUI();

    // ROUTE TO APP instead of REFEREE directly
    app.handleSensorData(this.accel, this.gyro, force);
};

// Recorder Buttons
document.getElementById('btn-rec-start').addEventListener('click', () => {
    const moveId = document.getElementById('record-select').value;
    app.recorder.start(moveId);
    document.getElementById('btn-rec-start').style.display = 'none';
    document.getElementById('btn-rec-stop').style.display = 'block';
    document.getElementById('rec-status').innerText = "KAYIT YAPILIYOR... Hareketi 3 kez tekrarla.";
    document.getElementById('rec-status').style.color = "red";
});

document.getElementById('btn-rec-stop').addEventListener('click', () => {
    app.recorder.stop();
    document.getElementById('btn-rec-start').style.display = 'block';
    document.getElementById('btn-rec-stop').style.display = 'none';
    document.getElementById('rec-status').innerText = "Dosya İndirildi. Diğer harekete geç.";
    document.getElementById('rec-status').style.color = "lime";
});

// Mode Switchers
document.getElementById('btn-mode-referee').addEventListener('click', () => {
    app.setMode('referee');
    // Update button styles
    document.getElementById('btn-mode-referee').style.background = 'var(--primary)';
    document.getElementById('btn-mode-referee').style.color = 'black';
    document.getElementById('btn-mode-recorder').style.background = 'rgba(0, 0, 0, 0.5)';
    document.getElementById('btn-mode-recorder').style.color = 'var(--text-main)';
});

document.getElementById('btn-mode-recorder').addEventListener('click', () => {
    app.setMode('recorder');
    // Update button styles
    document.getElementById('btn-mode-recorder').style.background = 'var(--secondary)';
    document.getElementById('btn-mode-recorder').style.color = 'black';
    document.getElementById('btn-mode-referee').style.background = 'rgba(0, 0, 0, 0.5)';
    document.getElementById('btn-mode-referee').style.color = 'var(--text-main)';
});

document.getElementById('btn-connect').addEventListener('click', () => {
    sensorManager.requestPermission();
    document.getElementById('btn-connect').style.display = 'none';

    setTimeout(() => {
        gameManager.startRandomGame();
    }, 1000);
    sensorManager.startCalibration();
});
