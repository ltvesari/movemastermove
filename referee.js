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
        this.isMoving = false; // Pulse Detection State
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

        // --- PULSE DETECTION LOGIC (V6 - Accumulated) ---

        const MOVE_GATE = 1.8;
        const END_GATE = 1.2;

        if (force > MOVE_GATE) {
            this.isMoving = true;
            this.lastMoveTime = now;
        }

        if (this.isMoving) {
            this.history.push({ a: { ...accel }, g: { ...gyro }, f: force, t: now });

            // End condition
            if (force < END_GATE && (now - this.lastMoveTime > 150)) {
                this.finishMoveAndAnalyze();
            }
            // Safety cap
            if (this.history.length > 50) {
                this.finishMoveAndAnalyze();
            }
        }
    }

    finishMoveAndAnalyze() {
        this.isMoving = false;
        if (this.history.length < 5) {
            this.history = [];
            return;
        }

        this.classifyPattern(this.history);
        this.history = []; // Clear
    }

    classifyPattern(data) {
        // --- 3D VECTOR ANALYSIS (V9 - Manual User Calibration) ---

        // SİZİN GİRDİĞİNİZ DEĞERLER BURADA:
        const USER_CALIBRATION = {
            '1': { name: "Vanguard", target: { x: -4.0, y: -4.0, z: -0.5 } },
            '2': { name: "Sinister", target: { x: 4.0, y: -4.0, z: -0.5 } },
            '3': { name: "Rising", target: { x: -4.0, y: 4.0, z: 0.5 } },
            '4': { name: "Gale", target: { x: 4.0, y: 4.0, z: 0.5 } },
            '5': { name: "Heartseeker", target: { x: 0.0, y: 0.5, z: 4.0 } },
            '6': { name: "Executioner", target: { x: 0.0, y: -4.0, z: 2.0 } },
            '7': { name: "Earthshaker", target: { x: 0.0, y: -4.0, z: 3.0 } },
            '8': { name: "Horizon", target: { x: -4.0, y: 0.0, z: -0.5 } },
            '9': { name: "Blade", target: { x: 4.0, y: 0.0, z: -0.5 } }
        };

        let maxForce = 0;
        let weightedSumX = 0, weightedSumY = 0, weightedSumZ = 0;
        let totalWeight = 0;

        data.forEach(h => {
            if (h.f > maxForce) maxForce = h.f;

            if (h.f > 1.5) {
                let weight = h.f * h.f;
                weightedSumX += h.a.x * weight;
                weightedSumY += h.a.y * weight;
                weightedSumZ += h.a.z * weight;
                totalWeight += weight;
            }
        });

        const domX = totalWeight > 0 ? weightedSumX / totalWeight : 0;
        const domY = totalWeight > 0 ? weightedSumY / totalWeight : 0;
        const domZ = totalWeight > 0 ? weightedSumZ / totalWeight : 0;

        // UI Debug
        const uiVector = document.getElementById('dbg-vector');
        const uiForce = document.getElementById('dbg-force');
        const uiResult = document.getElementById('dbg-result');
        const uiTest = document.getElementById('test-result');

        if (uiVector) {
            uiVector.innerText = `X:${domX.toFixed(1)} Y:${domY.toFixed(1)} Z:${domZ.toFixed(1)}`;
            uiForce.innerText = maxForce.toFixed(1);
        }

        console.log(`PATTERN: MaxF=${maxForce.toFixed(1)} X=${domX.toFixed(1)} Y=${domY.toFixed(1)} Z=${domZ.toFixed(1)}`);

        if (maxForce < 3.0) return; // User Force Threshold

        let detectedId = null;

        // --- DISTANCE BASED MATCHING (En Yakın Hareketi Bul) ---
        // Sizin belirlediğiniz noktalara en yakın olanı seçiyoruz.

        let minDistance = 999;
        let bestMatch = null;

        for (const [id, move] of Object.entries(USER_CALIBRATION)) {
            const t = move.target;

            // Farkları hesapla
            const dx = domX - t.x;
            const dy = domY - t.y;
            const dz = domZ - t.z;

            // Öklid mesafesi (3D)
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Heartseeker Özel Kuralı: Z pozitif olmalı
            if (id === '5' && domZ < 2.0) continue;

            // Earthshaker vs Executioner Ayrımı (Z Derinliği)
            if (id === '7' && domZ < 2.5) continue; // Earthshaker için derinlik şart
            if (id === '6' && domZ > 2.5) continue; // Executioner için fazla derinlik olmamalı

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = id;
            }
        }

        // Mesafe toleransı (Ne kadar yakın olmalı?)
        if (minDistance < 3.5) {
            detectedId = bestMatch;
        }

        // --- FEEDBACK ---
        if (detectedId) {
            const name = MOVE_LIST[detectedId].name;
            if (uiResult) uiResult.innerText = `ALGILANDI: ${name}`;
            if (uiTest) {
                uiTest.innerText = name;
                uiTest.style.color = "#00ff00";
            }
            this.triggerMove(detectedId, 100);
        } else {
            if (uiResult) uiResult.innerText = "ANLAŞILMADI";
            if (uiTest) {
                uiTest.innerText = "ANLAŞILMADI";
                uiTest.style.color = "#ff5500";
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

class App {
    constructor() {
        this.mode = 'recorder'; // Default to recorder initially
        this.recorder = new Recorder();

        // Hide Nav initially
        this.uiNav = document.getElementById('main-nav');

        // Views
        this.views = {
            recorder: document.getElementById('view-recorder'),
            test: document.getElementById('view-test'),
            game: document.getElementById('view-game')
        };

        this.navBtns = {
            recorder: document.getElementById('nav-recorder'),
            test: document.getElementById('nav-test'),
            game: document.getElementById('nav-game')
        };
    }

    enableNav() {
        this.uiNav.style.display = 'block';
        this.setMode('recorder'); // Start in Recorder mode
    }

    setMode(mode) {
        this.mode = mode;
        console.log("App Mode:", mode);

        // Hide all views
        Object.values(this.views).forEach(el => el.style.display = 'none');
        Object.values(this.navBtns).forEach(el => el.style.background = '#333');

        // Show selected
        if (this.views[mode]) this.views[mode].style.display = 'block';
        if (this.navBtns[mode]) this.navBtns[mode].style.background = 'var(--primary)';

        // Logic hooks
        if (mode === 'game') {
            gameManager.startRandomGame();
        } else {
            // Stop game loop if leaving game
            // gameManager.stop(); // Todo if needed
        }

        if (mode === 'test') {
            // Enable Referee analyzing for Debug
            referee.setTargetCallback((id, score) => {
                document.getElementById('test-result').innerText = MOVE_LIST[id].name;
                document.getElementById('test-result').style.color = "#00ff00";
                setTimeout(() => document.getElementById('test-result').style.color = "#00f3ff", 200);
            });
        }
    }
}

class Recorder {
    constructor() {
        this.isRecording = false;
        this.dataBuffer = [];
        this.startTime = 0;
        this.sessionData = {}; // Stores all moves in this session

        this.uiSelect = document.getElementById('record-select');
        this.uiDesc = document.getElementById('rec-move-desc'); // New Description Element
        this.uiStatus = document.getElementById('rec-status');
        this.uiOutput = document.getElementById('rec-output');
        this.btnStart = document.getElementById('btn-rec-start');
        this.btnCopy = document.getElementById('btn-rec-copy');
        this.btnDownload = document.getElementById('btn-rec-download');

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

        // Restore selection or default to first
        if (this.lastSelected) this.uiSelect.value = this.lastSelected;

        // Initial Description Update
        this.updateDescription();
    }

    updateDescription() {
        if (this.uiDesc && this.uiSelect.value) {
            const moveId = this.uiSelect.value;
            if (MOVE_LIST[moveId]) {
                this.uiDesc.innerText = MOVE_LIST[moveId].desc;
            }
        }
    }

    bindEvents() {
        this.uiSelect.addEventListener('change', (e) => {
            this.lastSelected = e.target.value;
            this.updateDescription();
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
