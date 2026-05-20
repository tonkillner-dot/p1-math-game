/**
 * motion.js - ระบบประมวลผลกล้องเว็บแคมและตรวจจับความเคลื่อนไหว (Motion Detection)
 * ใช้การเปรียบเทียบความแตกต่างระหว่างเฟรม (Frame Differencing)
 * เพื่อตรวจจับคลื่นมือทางซ้ายหรือขวาของเด็ก ป.1
 */

class MotionDetector {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isTracking = false;
        
        // เฟรมข้อมูลพิกเซลก่อนหน้า
        this.prevFrameData = null;
        
        // ฟังก์ชัน callback เมื่อเกิดการตรวจจับความเคลื่อนไหว
        this.onLeftTrigger = null;
        this.onRightTrigger = null;
        
        // การตั้งค่าความไวและโซนตรวจจับ
        this.sensitivity = 45; // ความต่างของค่าสีที่นับว่าเคลื่อนไหว (0-255)
        this.motionThreshold = 0.08; // อัตราส่วนพิกเซลที่เปลี่ยนไปในพื้นที่ (เช่น 8% ของพื้นที่ย่อย)
        this.cooldownTime = 600; // มิลลิวินาทีสำหรับ Cooldown หลังขยับหนึ่งครั้ง เพื่อป้องกันเลขขึ้นรัวเกินไป
        
        this.lastLeftTriggerTime = 0;
        this.lastRightTriggerTime = 0;
        
        // ขนาดของวิดีโอประมวลผล (ขนาดเล็กช่วยประหยัด CPU)
        this.width = 320;
        this.height = 240;

        // ขอบเขตของปุ่มเสมือนบนภาพ (ซ้ายและขวา)
        // พิกัดในระบบกล้องปกติ (เดี๋ยวจะกลับซ้ายขวาตอนวาดแบบกระจกเงา)
        this.zones = {
            left: { x: 20, y: 50, w: 90, h: 140, color: 'rgba(0, 240, 255, 0.4)', activeColor: 'rgba(255, 0, 128, 0.8)', active: false },
            right: { x: 210, y: 50, w: 90, h: 140, color: 'rgba(0, 240, 255, 0.4)', activeColor: 'rgba(255, 0, 128, 0.8)', active: false }
        };
    }

    /**
     * เริ่มต้นใช้งานระบบกล้อง
     * @param {HTMLVideoElement} videoElement - แท็กวิดีโอซ่อน
     * @param {HTMLCanvasElement} canvasElement - แท็กแคนวาสแสดงผลซ้อน
     * @param {Function} onLeftTrigger - คอลแบ็กเมื่อกวักมือฝั่งซ้าย
     * @param {Function} onRightTrigger - คอลแบ็กเมื่อกวักมือฝั่งขวา
     */
    async init(videoElement, canvasElement, onLeftTrigger, onRightTrigger) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.onLeftTrigger = onLeftTrigger;
        this.onRightTrigger = onRightTrigger;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: this.width,
                    height: this.height,
                    facingMode: 'user' // กล้องหน้า
                },
                audio: false
            });
            this.video.srcObject = this.stream;
            this.video.play();
            return true;
        } catch (error) {
            console.warn("ไม่สามารถเข้าถึงกล้องเว็บแคมได้:", error);
            return false;
        }
    }

    // เริ่มตรวจจับ
    start() {
        if (!this.stream) return;
        this.isTracking = true;
        this.prevFrameData = null;
        this.tick();
    }

    // หยุดตรวจจับ
    stop() {
        this.isTracking = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        // เคลียร์ Canvas เป็นสีดำ
        if (this.ctx) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    // ลูปประมวลผลภาพทีละเฟรม
    tick() {
        if (!this.isTracking) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.processFrame();
        }

        requestAnimationFrame(() => this.tick());
    }

    // ฟังก์ชันเปรียบเทียบพิกเซลเพื่อตรวจหาความเคลื่อนไหว
    processFrame() {
        const now = Date.now();

        // 1. วาดวิดีโอลงใน Canvas แบบกลับด้าน (Mirror) เพื่อให้เด็กๆ เล่นง่ายเหมือนส่องกระจก
        this.ctx.save();
        this.ctx.translate(this.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        this.ctx.restore();

        // 2. ดึงข้อมูลพิกเซลของภาพปัจจุบัน
        const currentFrame = this.ctx.getImageData(0, 0, this.width, this.height);
        const currentPixels = currentFrame.data;

        // หากเป็นเฟรมแรก ให้บันทึกแล้วออกก่อน
        if (!this.prevFrameData) {
            this.prevFrameData = this.ctx.getImageData(0, 0, this.width, this.height);
            this.drawUI();
            return;
        }

        const prevPixels = this.prevFrameData.data;

        // นับจำนวนพิกเซลที่มีความเคลื่อนไหวในแต่ละโซน
        let leftMotionPixels = 0;
        let rightMotionPixels = 0;

        // พิกเซลทั้งหมดต่อโซน
        const leftZoneTotalPixels = this.zones.left.w * this.zones.left.h;
        const rightZoneTotalPixels = this.zones.right.w * this.zones.right.h;

        // ดึงภาพความเคลื่อนไหวมาแสดงผลเป็นจุดสีแดง (เพื่อสร้างเอฟเฟกต์ไซไฟให้เด็กเห็นความเคลื่อนไหวตัวเอง)
        const motionOverlay = this.ctx.getImageData(0, 0, this.width, this.height);
        const overlayData = motionOverlay.data;

        // วนลูปตรวจสอบความแตกต่างทุกๆ พิกเซล (ข้ามทีละ 2-3 พิกเซลเพื่อลดภาระ CPU)
        const step = 2;
        for (let y = 0; y < this.height; y += step) {
            for (let x = 0; x < this.width; x += step) {
                const index = (y * this.width + x) * 4;

                const rDiff = Math.abs(currentPixels[index] - prevPixels[index]);
                const gDiff = Math.abs(currentPixels[index + 1] - prevPixels[index + 1]);
                const bDiff = Math.abs(currentPixels[index + 2] - prevPixels[index + 2]);
                const totalDiff = (rDiff + gDiff + bDiff) / 3;

                // ถ้าผลต่างเกินค่าความไว แสดงว่ามีการเคลื่อนไหวที่พิกเซลนี้
                if (totalDiff > this.sensitivity) {
                    // วาดจุดความเคลื่อนไหวลงใน Overlay
                    overlayData[index] = 255;     // แดง
                    overlayData[index + 1] = 0;   // เขียว
                    overlayData[index + 2] = 128; // ชมพู
                    overlayData[index + 3] = 180; // ความโปร่งใส

                    // เช็คว่าพิกเซลอยู่ในโซนซ้ายหรือไม่
                    if (x >= this.zones.left.x && x < this.zones.left.x + this.zones.left.w &&
                        y >= this.zones.left.y && y < this.zones.left.y + this.zones.left.h) {
                        leftMotionPixels += (step * step);
                    }

                    // เช็คว่าพิกเซลอยู่ในโซนขวาหรือไม่
                    if (x >= this.zones.right.x && x < this.zones.right.x + this.zones.right.w &&
                        y >= this.zones.right.y && y < this.zones.right.y + this.zones.right.h) {
                        rightMotionPixels += (step * step);
                    }
                }
            }
        }

        // วาดพิกเซลตรวจจับการขยับสีแดงทับลงไป
        this.ctx.putImageData(motionOverlay, 0, 0);

        // คำนวณอัตราส่วนความเคลื่อนไหวต่อขนาดพื้นที่โซน
        const leftRatio = leftMotionPixels / leftZoneTotalPixels;
        const rightRatio = rightMotionPixels / rightZoneTotalPixels;

        // เช็คการทำปฏิกิริยาโซนซ้าย
        if (leftRatio > this.motionThreshold) {
            this.zones.left.active = true;
            if (now - this.lastLeftTriggerTime > this.cooldownTime) {
                this.onLeftTrigger();
                this.lastLeftTriggerTime = now;
            }
        } else {
            this.zones.left.active = false;
        }

        // เช็คการทำปฏิกิริยาโซนขวา
        if (rightRatio > this.motionThreshold) {
            this.zones.right.active = true;
            if (now - this.lastRightTriggerTime > this.cooldownTime) {
                this.onRightTrigger();
                this.lastRightTriggerTime = now;
            }
        } else {
            this.zones.right.active = false;
        }

        // บันทึกเฟรมปัจจุบันเก็บไว้เปรียบเทียบในเฟรมถัดไป
        this.prevFrameData = currentFrame;

        // วาดเส้นตารางพิกเซลและปุ่มเสมือนซ้อนหน้าจอ
        this.drawUI();
    }

    // วาดกล่อง UI ปุ่มตรวจจับซ้าย-ขวา
    drawUI() {
        this.ctx.lineWidth = 3;

        // วาดกรอบสแกนเนอร์สไตล์พิกเซลเรโทร
        for (const [key, zone] of Object.entries(this.zones)) {
            this.ctx.strokeStyle = zone.active ? zone.activeColor : zone.color;
            this.ctx.fillStyle = zone.active ? 'rgba(255, 0, 128, 0.15)' : 'rgba(0, 240, 255, 0.05)';
            
            // วาดกล่องโซน
            this.ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
            this.ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

            // วาดข้อความกำกับแบบ 8-bit
            this.ctx.fillStyle = zone.active ? '#ff0080' : '#00f0ff';
            this.ctx.font = '10px "Press Start 2P", Courier, monospace';
            this.ctx.textAlign = 'center';
            
            // ข้อความบอกหน้าที่ปุ่ม
            const label = key === 'left' ? 'PART A' : 'PART B';
            this.ctx.fillText(label, zone.x + zone.w / 2, zone.y - 12);
            
            const hint = zone.active ? 'WAVING!' : 'WAVE HAND';
            this.ctx.fillText(hint, zone.x + zone.w / 2, zone.y + zone.h / 2 + 5);
        }

        // วาดเอฟเฟกต์ตารางสี่เหลี่ยมพิกเซลบางๆ ทับกล้อง
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        const grid = 16;
        for (let i = 0; i < this.width; i += grid) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
            this.ctx.stroke();
        }
        for (let j = 0; j < this.height; j += grid) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, j);
            this.ctx.lineTo(this.width, j);
            this.ctx.stroke();
        }
    }
}

// สร้างอินสแตนซ์พร้อมใช้งาน
const motion = new MotionDetector();
