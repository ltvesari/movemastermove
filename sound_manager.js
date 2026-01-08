class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Master volume
        this.masterGain.connect(this.ctx.destination);
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.initialized = true;
        // Play silent sound to unlock audio on iOS
        this.playTone(0, 0, 0);
    }

    // Temel Ton Üretici (Beep vb.)
    playTone(freq, duration, type = 'sine', vol = 0.5) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Gürültü Üretici (Adım, Kılıç sesi vb. için)
    createNoiseBuffer() {
        if (this.noiseBuffer) return this.noiseBuffer;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
        return buffer;
    }

    // --- GAME SOUNDS ---

    // 1. ADIM SESİ (Koşu)
    // Tok, kısa, ritmik bir ses
    playStep() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // 2. SAVURMA (Swing/Chop)
    // Rüzgar sesi (Filter sweep over noise)
    playSwing() {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 1;
        // Filter sweep
        filter.frequency.setValueAtTime(200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
        noise.stop(this.ctx.currentTime + 0.25);
    }

    // 3. ZIPLAMA (Jump)
    // Yukarı doğru kayan eğlenceli ses
    playJump() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    // 4. SALLA (Shake)
    // Titreme sesi
    playShake() {
        this.playTone(300, 0.1, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(400, 0.1, 'sawtooth', 0.2), 50);
        setTimeout(() => this.playTone(300, 0.1, 'sawtooth', 0.2), 100);
    }

    // 5. GİZLİLİK UYARISI (Stealth Warn)
    // Gerilim sesi (Kalp atışı gibi)
    playStealthWarn() {
        this.playTone(100, 0.3, 'square', 0.2);
    }

    // 6. ADIM TAMAMLANDI (Level Complete)
    // Pozitif bir 'Ding' sesi
    playComplete() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Harmonikler ekleyebiliriz ama basit tutalim
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5); // Uzun tınlama

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }

    // 7. OYUN BİTTİ (Win)
    // Fanfare Melodisi
    playWin() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.playTone(note, 0.4, 'triangle', 0.4);
            }, index * 200);
        });
    }

    // 8. FAIL (Yanma)
    playFail() {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}

// Global instance
window.soundManager = new SoundManager();
