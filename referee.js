/**
 * MoveHero Referee Game Engine
 * V3.0 - Force-Weighted Vector Analysis
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
        const rawAcc = event.accelerationIncludingGravity || event.acceleration;

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

    // SWAPPED 3 & 4 (Corrected)
    '3': { id: '3', name: "Rising Dragon", type: 'SLASH', desc: 'Sol Alt -> Sağ Üst (Aparkat)', trigger: 'slash_diag_up_right' },
    '4': { id: '4', name: "Gale Upper", type: 'SLASH', desc: 'Sağ Alt -> Sol Üst (Ters Aparkat)', trigger: 'slash_diag_up_left' },

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

        // 2. ACTION (Discrete Movements)
        if (['22', '23', '24', '25'].includes(this.targetMoveId)) {
            this.checkAction(accel, gyro, force);
            return;
        }

        // 3. OFFENSIVE (Triggered by Force)
        const SWING_THRESHOLD = 8;
        if (force > SWING_THRESHOLD) {
            this.classifyOffensive();
        }
    }

    classifyOffensive() {
        if (this.history.length < 5) return;

        // --- VECTOR ANALYSIS V2: FORCE-WEIGHTED ---
        // Problem: Simple average (avgX) is affected by slow "wind-up" movements.
        // Solution: Weighted Average by Force^2. Peaks dominate the vector.

        let weightedSumX = 0;
        let weightedSumY = 0;
        let totalWeight = 0;

        let maxForce = 0;
        let maxX = 0;

        // Gyro Analysis (Rotation)
        const start = this.history[0].g;
        const end = this.history[this.history.length - 1].g;
        const deltaBeta = Math.abs(end.beta - start.beta);

        this.history.forEach(h => {
            // WEIGHTING: Force squared emphasizes peaks significantly more.
            // Ignore low force noise (< 4)
            if (h.f > 4) {
                let weight = h.f * h.f; // Squared weighting
                weightedSumX += h.a.x * weight;
                weightedSumY += h.a.y * weight;
                totalWeight += weight;
            }

            if (h.f > maxForce) maxForce = h.f;
            if (Math.abs(h.a.x) > Math.abs(maxX)) maxX = h.a.x;
        });

        // Dominant Vector
        const domX = totalWeight > 0 ? weightedSumX / totalWeight : 0;
        const domY = totalWeight > 0 ? weightedSumY / totalWeight : 0;

        console.log(`V2: domX=${domX.toFixed(1)}, domY=${domY.toFixed(1)}, Force=${maxForce.toFixed(1)}, dBeta=${deltaBeta.toFixed(0)}`);

        let detectedId = null;

        // --- TIER 1: COMPLEX / SPECIFIC MOVES ---

        // 3. RISING DRAGON (Left-Down -> Right-Up) = Right + Up
        // domX > 0.5 (Right bias), domY > 1.5 (Strong Up bias)
        if (domX > 0.5 && domY > 1.5 && maxForce > 8) {
            console.log("-> MATCH: Rising Dragon (Up-Right)");
            detectedId = '3';
        }

        // 4. GALE UPPER (Right-Down -> Left-Up) = Left + Up
        // domX < -0.5 (Left bias), domY > 1.5 (Strong Up bias)
        else if (domX < -0.5 && domY > 1.5 && maxForce > 8) {
            console.log("-> MATCH: Gale Upper (Up-Left)");
            detectedId = '4';
        }

        // 6. EXECUTIONER'S GAVEL (Vertical Chop)
        // Strong Pitch Rotation + Minimal X
        else if (maxForce > 10 && Math.abs(domX) < 2.0 && deltaBeta > 30) {
            console.log("-> MATCH: Executioner (Chop Down)");
            detectedId = '6';
        }

        // 7. EARTHSHAKER (Vertical Drop)
        // Pure Drop = Negative Y.
        else if (maxForce > 8 && domY < -1.5 && deltaBeta < 30) {
            console.log("-> MATCH: Earthshaker (Drop)");
            detectedId = '7';
        }

        // 8. HORIZON SWEEPER (Right -> Left, Flat)
        // Strong Left (Neg X), Flat Y
        else if (domX < -1.5 && Math.abs(domY) < 1.5 && maxForce > 8) {
            console.log("-> MATCH: Horizon Sweeper (Flat Left)");
            detectedId = '8';
        }

        // 9. BLADE HURRICANE (Left -> Right, Flat)
        // Strong Right (Pos X), Flat Y
        else if (domX > 1.5 && Math.abs(domY) < 1.5 && maxForce > 8) {
            console.log("-> MATCH: Blade Hurricane (Flat Right)");
            detectedId = '9';
        }

        // 5. HEARTSEEKER (Thrust)
        // Thrust is weird: It has positive Y accel but minimal X and minimal Beta.
        else if (maxForce > 8 && Math.abs(domX) < 1.5 && deltaBeta < 25 && domY > 0) {
            console.log("-> MATCH: Heartseeker (Thrust)");
            detectedId = '5';
        }

        // --- TIER 2: BASIC SWINGS (Fallback) ---

        // 1. VANGUARD (Left)
        // Fallback for messy left swings
        else if (domX < -0.8 && maxForce > 8) {
            console.log("-> MATCH: Vanguard (Left)");
            detectedId = '1';
        }

        // 2. SINISTER (Right)
        // Fallback for messy right swings
        else if (domX > 0.8 && maxForce > 8) {
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
                let hint = "YÖN BELİRSİZ!";
                if (Math.abs(domY) > 2 && deltaBeta > 20) hint = "ÇOK DİKEY!";
                else if (this.targetMoveId === '5') hint = "DAHA DÜZ SAPLA!";
                else if (domX > 0) hint = "SOLA VURMAYI DENE"; // If it was right
                else if (domX < 0) hint = "SAĞA VURMAYI DENE";
                else if (deltaBeta > 40) hint = "BİLEĞİNİ ÇOK BÜKTÜN";

                this.triggerFail(hint + ` X:${domX.toFixed(1)} Y:${domY.toFixed(1)}`);
            }
        }
    }

    startStanceEvaluation() {
        this.isEvaluatingStance = true;
        this.stanceStartTime = Date.now();
        this.stanceFailed = false;
        this.showFeedback("SABİT DUR... (3sn)");
        this.maxStabilityError = 0;
    }

    checkStance(accel, gyro, force) {
        if (!this.isEvaluatingStance) return;

        let gyroError = Math.abs(gyro.alpha) + Math.abs(gyro.beta) + Math.abs(gyro.gamma);
        let forceError = force * 10;

        let currentError = gyroError + forceError;

        if (currentError > this.maxStabilityError) this.maxStabilityError = currentError;

        if (currentError > 100) {
            this.showFeedback("ÇOK HAREKETLİ!", "#ff5500");
            this.stanceStartTime = Date.now();
            this.maxStabilityError = 0;
        }

        const duration = Date.now() - this.stanceStartTime;

        if (duration > 3000) {
            this.isEvaluatingStance = false;
            let stabilityScore = Math.max(0, 100 - (this.maxStabilityError));
            this.triggerMove(this.targetMoveId, Math.floor(stabilityScore));
        }
    }

    checkAction(accel, gyro, force) {
        // Move 22: Valkyrie's Ward (JUMP)
        if (this.targetMoveId === '22') {
            if (accel.y < -5) {
                console.log("-> ACTION MATCH: Jump (Freefall Detected)");
                this.triggerMove('22', 100);
            }
        }
    }

    triggerMove(moveId, score = 0) {
        this.lastTriggerTime = Date.now();
        const move = MOVE_LIST[moveId];
        let finalMoveId = moveId;
        const now = Date.now();
        this.lastMoveId = finalMoveId;
        this.lastMoveTime = now;

        const finalName = MOVE_LIST[finalMoveId].name;
        console.log(`MOVE DETECTED: ${finalName} (Score: ${score}%)`);

        if (!this.onMoveDetected) {
            this.showFeedback(finalName);
        }

        if (this.onMoveDetected) this.onMoveDetected(finalMoveId, score);
    }

    triggerFail(reason) {
        this.lastTriggerTime = Date.now();
        console.log(`MOVE FAILED: ${reason}`);
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
            }
        });

        referee.setFailureCallback((reason) => {
            console.log("Game Manager Report: Fail -> " + reason);
        });
    }

    displayScore(score) {
        const scoreDiv = document.getElementById('accuracy-display');
        const scoreVal = document.getElementById('score-val');

        if (!scoreVal) return;

        scoreVal.innerText = score + "%";
        if (score >= 80) scoreVal.style.color = "#00ff00";
        else if (score >= 50) scoreVal.style.color = "#ffff00";
        else scoreVal.style.color = "#ff5500";
        if (scoreDiv) scoreDiv.style.opacity = '1';
    }
}

class Simulator {
    constructor() { }
    // Simulator logic condensed for brevity if not used
    triggerMove(moveId) { console.log("Simulating:", moveId); }
}

// Global Init
window.sensorManager = new SensorManager();
window.referee = new MoveReferee();
window.gameManager = new GameManager();

// --- APP ---
const app = { mode: 'referee' };

document.getElementById('btn-connect').addEventListener('click', () => {
    sensorManager.requestPermission();
    document.getElementById('btn-connect').style.display = 'none';
    setTimeout(() => { gameManager.startRandomGame(); }, 1000);
    sensorManager.startCalibration();
});
