/**
 * MoveHero Referee Game Engine
 * V3.1 - Force-Weighted Vector Analysis (Relaxed Thresholds & Debug Mode)
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
                alert("İzin isteniyor (iOS)...");
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    alert("İzin VERİLDİ!");
                    this.startListeners();
                    return true;
                } else {
                    alert('Sensor izni REDDEDİLDİ: ' + response);
                    return false;
                }
            } catch (e) {
                console.error(e);
                alert('İzin hatası (Catch): ' + e);
                return false;
            }
        } else {
            alert("İzin gerekmiyor (Android/PC), dinlemeye başlanıyor...");
            this.startListeners();
            return true;
        }
    }

    startListeners() {
        this.isActive = true;
        document.getElementById('sensor-status').innerText = "Durum: AKTİF";
        document.getElementById('sensor-status').style.color = "#00f3ff";

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

        // SAFE UI UPDATE
        try {
            this.updateUI();
        } catch (e) {
            console.error("UI Error", e);
        }

        // SAFE RECORDER HOOK
        if (window.app && window.app.recorder && window.app.recorder.isRecording) {
            try { window.app.recorder.capture(this.accel, this.gyro); } catch (e) { console.error("Rec Error", e); }
        }

        // SAFE ANALYZE
        try {
            if (typeof referee !== 'undefined') referee.analyze(this.accel, this.gyro, force);
        } catch (e) { console.error("Ref Error", e); }
    }

    handleOrientation(event) {
        this.gyro.alpha = event.alpha || 0;
        this.gyro.beta = event.beta || 0;
        this.gyro.gamma = event.gamma || 0;
    }

    updateUI() {
        this.eventCount = (this.eventCount || 0) + 1;

        // DIRECT DOM UPDATE (No Optimization)
        const elEvents = document.getElementById('val-events');
        if (elEvents) elEvents.innerText = this.eventCount;

        if (!this.uiAccel) return;
        this.uiAccel.innerText = `${this.accel.x.toFixed(1)}, ${this.accel.y.toFixed(1)}, ${this.accel.z.toFixed(1)}`;
        this.uiGyro.innerText = `${this.gyro.alpha.toFixed(0)}, ${this.gyro.beta.toFixed(0)}, ${this.gyro.gamma.toFixed(0)}`;
        this.uiMax.innerText = this.maxForce.toFixed(1);
    }
}

// Global Error Handler
window.onerror = function (msg, url, lineNo, columnNo, error) {
    alert('Error: ' + msg + ' Line: ' + lineNo);
    return false;
};


const MOVE_LIST = {
    // --- OFFENSIVE (Kılıç - Accel + Gyro) ---
    '1': { id: '1', name: "Vanguard's Cleave", type: 'OFFENSIVE', desc: 'Sağ Üst -> Sol Alt (Çapraz)', trigger: 'slash_diag_down_left' },
    '2': { id: '2', name: "Sinister Slash", type: 'OFFENSIVE', desc: 'Sol Üst -> Sağ Alt (Ters Çapraz)', trigger: 'slash_diag_down_right' },
    '3': { id: '3', name: "Rising Dragon", type: 'OFFENSIVE', desc: 'Sağ Alt -> Sol Üst (Aparkat)', trigger: 'slash_diag_up_left' },
    '4': { id: '4', name: "Gale Upper", type: 'OFFENSIVE', desc: 'Sol Alt -> Sağ Üst (Ters Aparkat)', trigger: 'slash_diag_up_right' },
    '5': { id: '5', name: "Heartseeker", type: 'OFFENSIVE', desc: 'Göğüs hizasından ileri saplama (Thrust)', trigger: 'thrust_forward' },
    '6': { id: '6', name: "Executioner’s Gavel", type: 'OFFENSIVE', desc: 'Baş üstünden bele dikey inme (Chop)', trigger: 'slash_vertical_down' },
    '7': { id: '7', name: "Earthshaker", type: 'OFFENSIVE', desc: 'Baş üstünden yere kadar çökerek inme (Squat Chop)', trigger: 'slash_vertical_drop' },
    '8': { id: '8', name: "Horizon Sweeper", type: 'OFFENSIVE', desc: 'Göğüs hizasında sağdan sola geniş savurma', trigger: 'slash_horizontal_left' },
    '9': { id: '9', name: "Blade Hurricane", type: 'OFFENSIVE', desc: 'Göğüs hizasında soldan sağa geniş savurma', trigger: 'slash_horizontal_right' },

    // --- DEFENSIVE (Korunma - Bodyweight & Isometric) ---
    '20': { id: '20', name: "Iron Stance", type: 'DEFENSIVE', desc: 'Göğüs hizasında tut + Squat (Çök/Bekle)', trigger: 'stance_iron' },
    '21': { id: '21', name: "Aegis of Heavens", type: 'DEFENSIVE', desc: 'Baş üstünde tut + Squat', trigger: 'stance_aegis' },
    '22': { id: '22', name: "Valkyrie’s Ward", type: 'DEFENSIVE', desc: 'Göğüs hizasında tut + Zıpla (Jump)', trigger: 'action_jump' },
    '23': { id: '23', name: "Relentless Pursuit", type: 'DEFENSIVE', desc: 'Olduğun yerde koş (High Knees)', trigger: 'action_run' },
    '24': { id: '24', name: "Dwarven Breaker", type: 'DEFENSIVE', desc: 'Kettlebell Swing (İki bacak arası savurma)', trigger: 'action_swing' },
    '25': { id: '25', name: "Shadow Step", type: 'DEFENSIVE', desc: 'Göğüs hizasında tut + Sağa/Sola sıçra', trigger: 'action_dodge' },

    // --- MAGIC (Büyü - Pattern Recognition) ---
    '41': { id: '41', name: "Sigil of Banishing", type: 'MAGIC', desc: 'Havada büyük "X" çizme', trigger: 'pattern_x' },
    '42': { id: '42', name: "Arcane Comet", type: 'MAGIC', desc: 'Baş yanında daire çiz + İleri fırlat', trigger: 'pattern_circle_throw' },
    '43': { id: '43', name: "Nova Eruption", type: 'MAGIC', desc: 'Çök (Toplan) + Kalkarken kolları aç (Patla)', trigger: 'pattern_squat_explode' },
    '44': { id: '44', name: "Pentagram of Doom", type: 'MAGIC', desc: 'Havada 5 köşeli yıldız çizme', trigger: 'pattern_star' }
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
        // User Data shows max force ~4.5. Lowering threshold to 2.5
        const SWING_THRESHOLD = 2.5;
        if (force > SWING_THRESHOLD) {
            this.classifyOffensive();
        }
    }

    classifyOffensive() {
        if (this.history.length < 5) return;

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
            // Lower noise gate to 1.5
            if (h.f > 1.5) {
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

        // Debug UI Update
        const uiVector = document.getElementById('dbg-vector');
        const uiForce = document.getElementById('dbg-force');
        const uiResult = document.getElementById('dbg-result');

        if (uiVector) {
            uiVector.innerText = `X:${domX.toFixed(2)}  Y:${domY.toFixed(2)}`;
            uiForce.innerText = maxForce.toFixed(1);
            uiResult.innerText = "Analiz..";
        }

        console.log(`V2: domX=${domX.toFixed(1)}, domY=${domY.toFixed(1)}, Force=${maxForce.toFixed(1)}`);

        // --- MATCHING LOGIC (Calibrated to Prayer Grip Data) ---
        let detectedId = null;

        // 1. VANGUARD (Right Up -> Left Down Strike) -> Vector X < -0.5, Y < -0.5
        if (domX < -0.5 && domY < -0.5 && maxForce > 2.5) {
            detectedId = '1';
        }
        // 2. SINISTER (Left Up -> Right Down) -> Vector X > 0.5, Y < -0.5
        else if (domX > 0.5 && domY < -0.5 && maxForce > 2.5) {
            detectedId = '2';
        }
        // 3. RISING DRAGON (Up-Right)
        else if (domX > 0.3 && domY > 0.8 && maxForce > 2.5) {
            detectedId = '3';
        }
        // 4. GALE UPPER (Up-Left)
        else if (domX < -0.3 && domY > 0.8 && maxForce > 2.5) {
            detectedId = '4';
        }
        // 6. EXECUTIONER (Chop Down)
        else if (maxForce > 3.5 && deltaBeta > 25) {
            detectedId = '6';
        }
        // 7. EARTHSHAKER (Drop)
        else if (maxForce > 3.0 && domY < -1.0) {
            detectedId = '7';
        }
        // 5. HEARTSEEKER (Thrust)
        else if (maxForce > 2.5 && Math.abs(domX) < 0.5 && domY > 1.5) {
            detectedId = '5';
        }

        if (detectedId) {
            if (uiResult) uiResult.innerText = `EŞLEŞTİ: ${MOVE_LIST[detectedId].name}`;
            let intensityScore = Math.min(((maxForce - 2.5) / 2.0) * 50, 50); // Scale to user max ~4.5
            let totalScore = Math.floor(50 + intensityScore);
            this.triggerMove(detectedId, totalScore);
        }
    }

    // ... (Stance methods remain same)

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

// ... (Gamemanager, App classes remain same)

class Recorder {
    constructor() {
        this.isRecording = false;
        this.dataBuffer = [];
        this.startTime = 0;
        this.sessionData = {}; // Stores all moves in this session

        this.uiSelect = document.getElementById('record-select');
        this.uiStatus = document.getElementById('rec-status');
        this.uiOutput = document.getElementById('rec-output');
        this.btnStart = document.getElementById('btn-rec-start');
        this.btnCopy = document.getElementById('btn-rec-copy');
        this.btnDownload = document.getElementById('btn-rec-download'); // New button

        this.populateList();
        this.bindEvents();
    }

    populateList() {
        this.uiSelect.innerHTML = '';
        Object.values(MOVE_LIST).forEach(move => {
            const hasData = this.sessionData[move.id] ? '✅ ' : '';
            const opt = document.createElement('option');
            opt.value = move.id;
            opt.innerText = `${hasData}${move.id}. ${move.name}`;
            this.uiSelect.appendChild(opt);
        });

        // Restore selection if possible
        if (this.lastSelected) this.uiSelect.value = this.lastSelected;
    }

    bindEvents() {
        this.uiSelect.addEventListener('change', (e) => {
            this.lastSelected = e.target.value;
        });

        this.btnStart.addEventListener('click', () => {
            if (this.isRecording) return;
            this.startCountdown();
        });

        this.btnCopy.addEventListener('click', () => {
            this.uiOutput.select();
            document.execCommand('copy');
            navigator.clipboard.writeText(this.uiOutput.value);
            this.btnCopy.innerText = "KOPYALANDI!";
            setTimeout(() => this.btnCopy.innerText = "TEK KOPYALA", 2000);
        });

        if (this.btnDownload) {
            this.btnDownload.addEventListener('click', () => {
                this.downloadAll();
            });
        }
    }

    startCountdown() {
        this.uiStatus.innerText = "HAZIRLAN (3)...";
        this.uiOutput.style.display = 'none';

        let count = 3;
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                this.uiStatus.innerText = `HAZIRLAN (${count})...`;
            } else {
                clearInterval(timer);
                this.startRecording();
            }
        }, 1000);
    }

    startRecording() {
        this.isRecording = true;
        this.dataBuffer = [];
        this.startTime = Date.now();
        this.uiStatus.innerText = "KAYDEDİLİYOR... (HAREKETİ YAP)";
        this.uiStatus.style.color = "#ff0055";

        // Auto-stop after 2.5 seconds
        setTimeout(() => {
            this.stopRecording();
        }, 2500);
    }

    stopRecording() {
        this.isRecording = false;
        this.uiStatus.innerText = "KAYIT TAMAMLANDI.";
        this.uiStatus.style.color = "#00ff00";
        this.processData();
    }

    capture(accel, gyro) {
        if (!this.isRecording) return;
        const t = Date.now() - this.startTime;
        this.dataBuffer.push({
            t: t,
            ax: Number(accel.x.toFixed(3)),
            ay: Number(accel.y.toFixed(3)),
            az: Number(accel.z.toFixed(3)),
            gx: Number(gyro.alpha.toFixed(1)),
            gy: Number(gyro.beta.toFixed(1)),
            gz: Number(gyro.gamma.toFixed(1))
        });
    }

    processData() {
        const moveId = this.uiSelect.value;
        const moveName = MOVE_LIST[moveId].name;

        const singleMoveData = {
            moveId: moveId,
            moveName: moveName,
            timestamp: new Date().toISOString(),
            samples: this.dataBuffer
        };

        // Save to Session (Overwrite existing)
        this.sessionData[moveId] = singleMoveData;

        // Refresh List (to show checkmark)
        this.populateList();

        const jsonStr = JSON.stringify(singleMoveData, null, 2);
        this.uiOutput.value = jsonStr;
        this.uiOutput.style.display = 'block';
        this.btnCopy.style.display = 'block';
        if (this.btnDownload) this.btnDownload.style.display = 'block'; // Ensure visible

        this.uiStatus.innerText = `KAYDEDİLDİ: ${moveName}. (Toplam: ${Object.keys(this.sessionData).length})`;
    }

    downloadAll() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.sessionData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "move_hero_data.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

// Global Init
window.sensorManager = new SensorManager();
window.referee = new MoveReferee();
window.gameManager = new GameManager();

// App Init (Wait for Load)
window.addEventListener('load', () => {
    window.app = new App();
});

document.getElementById('btn-connect').addEventListener('click', () => {
    sensorManager.requestPermission();
    document.getElementById('btn-connect').style.display = 'none';

    // Unlock Navigation
    window.app.enableNav();
});
