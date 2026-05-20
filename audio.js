/**
 * audio.js - ระบบเสียงสังเคราะห์ 8-bit (Web Audio API)
 * ใช้สำหรับสร้างเสียงประกอบและดนตรีโดยไม่ต้องใช้ไฟล์เสียงภายนอก
 */

class RetroAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmInterval = null;
        this.bgmNode = null;
        this.isPlayingBgm = false;
    }

    // เริ่มต้น Audio Context (ต้องเรียกหลังจากผู้ใช้กดปุ่มเพื่อหลีกเลี่ยงนโยบายความปลอดภัยของเบราว์เซอร์)
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // เล่นเสียงบี๊บปุ่มทั่วไป (Select/Click)
    playSelect() {
        if (this.muted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // คลื่นสี่เหลี่ยมให้ฟีล 8-bit
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // เล่นเสียงเมื่อตอบถูก (Correct)
    playCorrect() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // เสียงแรก (ต่ำ) และตามด้วยเสียงสอง (สูง) ทันที คล้ายเสียงเก็บเหรียญ Mario
        this.playTone(523.25, 'square', 0.1, now); // C5
        this.playTone(659.25, 'square', 0.15, now + 0.08); // E5
        this.playTone(783.99, 'square', 0.25, now + 0.16); // G5
    }

    // เล่นเสียงเมื่อตอบผิด (Incorrect)
    playWrong() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // เสียงความถี่ต่ำ ค่อยๆ ลดลงให้ฟีลเศร้า
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.3);
    }

    // เล่นเสียงโทนสั้นทั่วไป
    playTone(frequency, type, duration, startTime) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startTime);

        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // เล่นเสียงชัยชนะเมื่อผ่านด่าน/จบเกม
    playVictory() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // ทำเสียงอาร์เปจจิโอ (Arpeggio) แบบน่ารักๆ
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major
        notes.forEach((freq, index) => {
            this.playTone(freq, 'triangle', 0.2, now + index * 0.08);
        });
    }

    // เล่นเพลงประกอบ 8-bit Chip tune สั้นๆ วนลูป
    startBgm() {
        if (this.isPlayingBgm) return;
        this.init();
        this.isPlayingBgm = true;

        // เมโลดี้เพลงง่ายๆ สไตล์น่ารัก (C-Major / F-Major)
        const melody = [
            261.63, 329.63, 392.00, 329.63, // C E G E
            293.66, 349.23, 440.00, 349.23, // D F A F
            329.63, 392.00, 493.88, 392.00, // E G B G
            261.63, 392.00, 523.25, 261.63  // C G C C
        ];

        let index = 0;
        const noteDuration = 0.25; // 1/4 วินาทีต่อโน้ต

        this.bgmInterval = setInterval(() => {
            if (this.muted || !this.isPlayingBgm) return;
            
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle'; // เสียงใสๆ เบาๆ ไม่แสบหูเกินไปสำหรับเด็ก
            osc.frequency.setValueAtTime(melody[index], now);

            // เบาเสียงกว่าเสียงเอฟเฟกต์ เพื่อไม่ให้รบกวนการเล่น
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration - 0.02);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + noteDuration);

            index = (index + 1) % melody.length;
        }, noteDuration * 1000);
    }

    // หยุดเพลงประกอบ
    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    // ปิด/เปิดเสียงทั้งหมด
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBgm();
        } else {
            this.startBgm();
        }
        return this.muted;
    }
}

// สร้างอินสแตนซ์พร้อมใช้งาน
const audio = new RetroAudio();
