/**
 * game.js - ตรรกะและโครงสร้างหลักของเกมการศึกษาคณิตศาสตร์
 * เรื่อง ส่วนย่อย-ส่วนรวม (Part-Whole Relations)
 */

// รูปภาพเวกเตอร์พิกเซลอาร์ต (SVG) สำหรับเป็นสไลม์วุ้นช่วยนับของเด็กๆ
const SLIME_SVGS = {
    green: `<svg viewBox="0 0 16 16" class="slime-sprite"><path d="M4 2h8v2H4V2zm-2 2h12v2H2V4zm-1 2h14v6H1V6zm1 6h12v2H2v-2zm2 2h8v2H4v-2z" fill="#39ff14"/><path d="M4 6h2v2H4V6zm6 0h2v2h-2V6z" fill="#000"/><path d="M5 7h1v1H5V7zm6 0h1v1h-1V7z" fill="#fff"/><path d="M7 10h2v1H7v-1z" fill="#ff0080"/></svg>`,
    pink: `<svg viewBox="0 0 16 16" class="slime-sprite"><path d="M4 2h8v2H4V2zm-2 2h12v2H2V4zm-1 2h14v6H1V6zm1 6h12v2H2v-2zm2 2h8v2H4v-2z" fill="#ff0080"/><path d="M4 6h2v2H4V6zm6 0h2v2h-2V6z" fill="#fff"/><path d="M5 7h1v1H5V7zm6 0h1v1h-1V7z" fill="#000"/><path d="M6 10h4v1H6v-1z" fill="#fff"/></svg>`,
    blue: `<svg viewBox="0 0 16 16" class="slime-sprite"><path d="M4 2h8v2H4V2zm-2 2h12v2H2V4zm-1 2h14v6H1V6zm1 6h12v2H2v-2zm2 2h8v2H4v-2z" fill="#00f0ff"/><path d="M4 6h2v2H4V6zm6 0h2v2h-2V6z" fill="#000"/><path d="M5 7h1v1H5V7zm6 0h1v1h-1V7z" fill="#fff"/><path d="M6 10h4v1H6v-1z" fill="#151124"/></svg>`,
    yellow: `<svg viewBox="0 0 16 16" class="slime-sprite"><path d="M4 2h8v2H4V2zm-2 2h12v2H2V4zm-1 2h14v6H1V6zm1 6h12v2H2v-2zm2 2h8v2H4v-2z" fill="#fff01f"/><path d="M3 6h2v2H3V6zm8 0h2v2h-2V6z" fill="#000"/><path d="M6 9h4v2H6V9z" fill="#ff0080"/></svg>`
};

class MathGame {
    constructor() {
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pixel_math_highscore')) || 0;
        this.level = 1; // 1 = <=5, 2 = <=10, 3 = <=20
        this.round = 1;
        this.maxRounds = 5;
        this.currentMode = 'PARTS'; // PARTS (หาปุ่มย่อย), WHOLE (หาปุ่มรวม)
        this.currentQuestion = null;
        
        // ค่าคำตอบปัจจุบันของนักเรียน
        this.answerPartA = 0;
        this.answerPartB = 0;
        this.answerWhole = 0;

        // สิทธิ์การใช้กล้อง
        this.webcamEnabled = false;

        // องค์ประกอบทาง HTML
        this.screens = {};
        this.initDOMElements();
    }

    initDOMElements() {
        this.screens.menu = document.getElementById('menu-screen');
        this.screens.game = document.getElementById('game-screen');
        this.screens.summary = document.getElementById('summary-screen');
        
        // ข้อความและหน้าจอแสดงผลในเกม
        this.txtScore = document.getElementById('score-val');
        this.txtHighScore = document.getElementById('highscore-val');
        this.txtHighScoreMenu = document.getElementById('menu-highscore-val');
        this.txtLevelBadge = document.getElementById('level-badge');
        this.txtRoundBadge = document.getElementById('round-badge');
        this.txtInstruction = document.getElementById('instruction-text');
        this.feedbackBox = document.getElementById('feedback-box');
        
        // คอนเทนเนอร์ตัวเลขและสไลม์
        this.nodeWhole = document.getElementById('node-whole');
        this.nodePartA = document.getElementById('node-part-a');
        this.nodePartB = document.getElementById('node-part-b');

        // แสดงสถิติคะแนนหน้าแรก
        if (this.txtHighScoreMenu) {
            this.txtHighScoreMenu.innerText = this.highScore;
        }
    }

    // ฟังก์ชันเริ่มเกมนัดแรก
    startGame(level, mode) {
        audio.playSelect();
        this.level = level;
        this.currentMode = mode;
        this.score = 0;
        this.round = 1;
        
        // อัปเดตการแสดงผลหน้าเว็บ
        this.txtScore.innerText = this.score;
        this.txtLevelBadge.innerText = this.level;
        
        this.switchScreen('game');
        
        // จัดการเว็บแคม
        this.setupWebcamControl();
        
        // สร้างโจทย์ข้อแรก
        this.generateQuestion();
    }

    // จัดการการสลับหน้าจอเว็บ
    switchScreen(screenName) {
        Object.keys(this.screens).forEach(key => {
            if (key === screenName) {
                this.screens[key].classList.add('active');
            } else {
                this.screens[key].classList.remove('active');
            }
        });
    }

    // สร้างระบบควบคุมผ่านเว็บแคม
    async setupWebcamControl() {
        const webcamToggle = document.getElementById('webcam-toggle');
        const webcamPanel = document.getElementById('webcam-panel');
        
        if (!webcamToggle) return;

        // อัปเดตสถานะตามหน้าตากล่องตัวเลือก
        const checkWebcam = async () => {
            if (webcamToggle.checked) {
                webcamPanel.style.display = 'flex';
                // เริ่มกล้อง
                const video = document.getElementById('webcam-video');
                const canvas = document.getElementById('webcam-canvas');
                
                const success = await motion.init(
                    video, 
                    canvas, 
                    () => this.handleWebcamTrigger('left'), // คอลแบ็กปุ่มซ้าย
                    () => this.handleWebcamTrigger('right')  // คอลแบ็กปุ่มขวา
                );

                if (success) {
                    motion.start();
                    this.webcamEnabled = true;
                } else {
                    alert("ไม่สามารถเปิดใช้งานเว็บแคมได้ กรุณาเชื่อมต่อกล้องหรืออนุญาตสิทธิ์");
                    webcamToggle.checked = false;
                    webcamPanel.style.display = 'none';
                    this.webcamEnabled = false;
                }
            } else {
                motion.stop();
                webcamPanel.style.display = 'none';
                this.webcamEnabled = false;
            }
        };

        webcamToggle.onchange = checkWebcam;
        // เช็คการเริ่มต้นถ้าติ๊กถูกไว้อยู่แล้ว
        await checkWebcam();
    }

    // จัดการเมื่อเว็บแคมจับความเคลื่อนไหวได้
    handleWebcamTrigger(side) {
        if (this.currentMode === 'PARTS') {
            // ในโหมดให้แยกส่วนย่อย: คลื่นซ้ายเพิ่ม Part A, คลื่นขวาเพิ่ม Part B
            if (side === 'left') {
                audio.playTone(400, 'sine', 0.08, audio.ctx.currentTime);
                this.adjustPartValue('A', 1);
            } else {
                audio.playTone(450, 'sine', 0.08, audio.ctx.currentTime);
                this.adjustPartValue('B', 1);
            }
        } else {
            // ในโหมดรวมเป็นส่วนรวม: นักเรียนต้องคลิกหรือกวักมือฝั่งใดฝั่งหนึ่งเพื่อปรับค่าผลรวม (Whole)
            // หรือใช้เป็นปุ่มเพิ่ม/ลดค่าผลรวมเสมือนจริง
            if (side === 'left') {
                audio.playTone(350, 'sine', 0.08, audio.ctx.currentTime);
                this.adjustWholeValue(1);
            } else {
                audio.playTone(300, 'sine', 0.08, audio.ctx.currentTime);
                this.adjustWholeValue(-1);
            }
        }
    }

    // ปรับค่าส่วนย่อย
    adjustPartValue(part, amount) {
        audio.playSelect();
        const maxVal = this.currentQuestion.whole;
        
        if (part === 'A') {
            this.answerPartA += amount;
            // ถ้านิ้วพัดเลยค่าสูงสุด ให้วนกลับมาเป็น 0 (สำหรับเด็กกวักกล้องเล่นง่ายๆ)
            if (this.answerPartA > maxVal) this.answerPartA = 0;
            if (this.answerPartA < 0) this.answerPartA = maxVal;
        } else {
            this.answerPartB += amount;
            if (this.answerPartB > maxVal) this.answerPartB = 0;
            if (this.answerPartB < 0) this.answerPartB = maxVal;
        }
        
        this.updateBoardDisplay();
    }

    // ปรับค่าส่วนรวม
    adjustWholeValue(amount) {
        audio.playSelect();
        // ในกรณีระดับ 1-3 ค่าสูงสุดกำหนดตามระดับ
        const maxVal = this.level === 1 ? 5 : (this.level === 2 ? 10 : 20);
        
        this.answerWhole += amount;
        if (this.answerWhole > maxVal) this.answerWhole = 0;
        if (this.answerWhole < 0) this.answerWhole = maxVal;
        
        this.updateBoardDisplay();
    }

    // สร้างโจทย์คณิตศาสตร์ ป.1 ตามระดับและโหมด
    generateQuestion() {
        this.feedbackBox.innerHTML = '';
        this.txtRoundBadge.innerText = `${this.round}/${this.maxRounds}`;

        // 1. กำหนดผลรวมสูงสุดตามระดับความยาก
        let maxLimit = 5;
        if (this.level === 2) maxLimit = 10;
        if (this.level === 3) maxLimit = 20;

        // 2. สุ่มตัวเลขตามหลักสูตร ป.1
        let whole = 0;
        if (this.level === 1) {
            whole = Math.floor(Math.random() * 4) + 2; // 2 ถึง 5
        } else if (this.level === 2) {
            whole = Math.floor(Math.random() * 6) + 5; // 5 ถึง 10
        } else {
            whole = Math.floor(Math.random() * 11) + 10; // 10 ถึง 20
        }

        // สุ่มตัวย่อยที่ถูกต้อง
        const targetPartA = Math.floor(Math.random() * (whole + 1));
        const targetPartB = whole - targetPartA;

        this.currentQuestion = {
            whole: whole,
            targetPartA: targetPartA,
            targetPartB: targetPartB
        };

        // ตั้งค่าคำตอบเริ่มต้นของผู้เล่น
        if (this.currentMode === 'PARTS') {
            // โหมดสุ่มตัวย่อย: ผู้เล่นเริ่มต้นที่ 0 และต้องปรับหาคู่ที่นำมารวมกันแล้วเท่ากับ Whole
            this.answerPartA = 0;
            this.answerPartB = 0;
            this.answerWhole = whole; // ส่วนรวมถูกล็อกไว้

            // สุ่มหัวข้อคำถามย่อย (สองแบบ: แบ่งยังไงก็ได้ หรือระบุค่าหนึ่งฝั่ง)
            this.questionType = Math.random() > 0.5 ? 'FREE' : 'FIXED';
            
            if (this.questionType === 'FIXED') {
                // ล็อกค่าคำตอบของกลุ่ม A ให้นักเรียนหาความต่างในกลุ่ม B
                this.answerPartA = targetPartA;
                this.txtInstruction.innerHTML = `ส่วนรวมคือ <span style="color:var(--neon-yellow)">${whole}</span> และมีส่วนย่อยสีเขียวคือ <span style="color:var(--neon-green)">${targetPartA}</span><br>ส่วนย่อยสีฟ้าต้องเป็นเท่าไหร่จ๊ะ?`;
            } else {
                this.txtInstruction.innerHTML = `แบ่งไอติมสีส้ม <span style="color:var(--neon-yellow)">${whole}</span> แท่ง<br>ออกเป็นสองกลุ่ม (สีเขียว และ สีฟ้า) ให้ถูกต้อง`;
            }
        } else {
            // โหมดสุ่มส่วนรวม: มีกลุ่มย่อยสองกลุ่ม ให้นักเรียนหาผลรวม
            this.answerPartA = targetPartA;
            this.answerPartB = targetPartB;
            this.answerWhole = 0; // ส่วนรวมเริ่มต้นเป็น 0 เพื่อรอคำตอบ
            this.txtInstruction.innerHTML = `รวมกลุ่มสีเขียว <span style="color:var(--neon-green)">${targetPartA}</span> และกลุ่มสีฟ้า <span style="color:var(--neon-blue)">${targetPartB}</span><br>เข้าด้วยกันแล้วจะได้คำตอบเท่าไหร่จ๊ะ?`;
        }

        // วาดและอัปเดตหน้าจอบอร์ด
        this.updateBoardDisplay();
        this.drawRelationLines();
    }

    // วาดเส้นความสัมพันธ์สไตล์พิกเซลแบบ 8-bit
    drawRelationLines() {
        const svg = document.getElementById('relation-lines-svg');
        if (!svg) return;

        // ดึงพิกัดของกล่องต่างๆ เพื่อวาดเส้นเชื่อม
        const boardRect = document.getElementById('math-board-area').getBoundingClientRect();
        const wholeNode = document.getElementById('node-whole').getBoundingClientRect();
        const partANode = document.getElementById('node-part-a').getBoundingClientRect();
        const partBNode = document.getElementById('node-part-b').getBoundingClientRect();

        // คำนวณพิกัดสัมพัทธ์ใน SVG
        const wholeX = (wholeNode.left + wholeNode.width / 2) - boardRect.left;
        const wholeY = wholeNode.bottom - boardRect.top;

        const partAX = (partANode.left + partANode.width / 2) - boardRect.left;
        const partAY = partANode.top - boardRect.top;

        const partBX = (partBNode.left + partBNode.width / 2) - boardRect.left;
        const partBY = partBNode.top - boardRect.top;

        // วาดเส้น SVG แบบหยักขั้นบันไดสไตล์พิกเซลเรโทร (Pixel step lines)
        svg.innerHTML = `
            <!-- เส้นเชื่อมฝั่งซ้าย (Whole -> Part A) -->
            <path d="M ${wholeX} ${wholeY} L ${wholeX} ${wholeY + 12} L ${partAX} ${wholeY + 12} L ${partAX} ${partAY}" 
                  stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="2 2" />
            
            <!-- เส้นเชื่อมฝั่งขวา (Whole -> Part B) -->
            <path d="M ${wholeX} ${wholeY} L ${wholeX} ${wholeY + 12} L ${partBX} ${wholeY + 12} L ${partBX} ${partBY}" 
                  stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="2 2" />
        `;
    }

    // อัปเดตการแสดงผลของตัวเลขและภาพสไลม์ในบอร์ดเกม
    updateBoardDisplay() {
        // 1. ส่วนรวม (Whole)
        const displayWholeVal = this.currentMode === 'PARTS' ? this.currentQuestion.whole : this.answerWhole;
        const wholeValContainer = this.nodeWhole.querySelector('.node-number');
        const wholeVisual = this.nodeWhole.querySelector('.visual-count');
        
        wholeValContainer.innerText = displayWholeVal;
        this.renderSlimes(wholeVisual, displayWholeVal, 'yellow');

        // 2. ส่วนย่อย A
        const partAValContainer = this.nodePartA.querySelector('.node-number');
        const partAVisual = this.nodePartA.querySelector('.visual-count');
        
        partAValContainer.innerText = this.answerPartA;
        this.renderSlimes(partAVisual, this.answerPartA, 'green');

        // 3. ส่วนย่อย B
        const partBValContainer = this.nodePartB.querySelector('.node-number');
        const partBVisual = this.nodePartB.querySelector('.visual-count');
        
        partBValContainer.innerText = this.answerPartB;
        this.renderSlimes(partBVisual, this.answerPartB, 'blue');

        // ไฮไลต์กล่องย่อยที่ขยับได้ในโหมด FIXED
        if (this.currentMode === 'PARTS' && this.questionType === 'FIXED') {
            this.nodePartA.classList.remove('active-part');
            this.nodePartB.classList.add('active-part'); // ล็อก A แปลว่าแก้ B
        } else if (this.currentMode === 'PARTS') {
            this.nodePartA.classList.add('active-part');
            this.nodePartB.classList.add('active-part');
        } else {
            this.nodePartA.classList.remove('active-part');
            this.nodePartB.classList.remove('active-part');
            this.nodeWhole.classList.add('active-part'); // โหมดหาผลรวม ให้แก้ตัวบนสุด
        }

        // จัดระเบียบคอนโทรลเลอร์เสริมสำหรับเมาส์/ทัช
        this.setupButtons();
    }

    // แสดงสไลม์พิกเซลน่ารักขยับได้ตามจำนวน
    renderSlimes(container, count, color) {
        container.innerHTML = '';
        const slimeSvg = SLIME_SVGS[color];
        
        for (let i = 0; i < count; i++) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = slimeSvg;
            container.appendChild(wrapper.firstChild);
        }
    }

    // ผูกปุ่มกด เพิ่ม/ลด สำหรับเมาส์หรือทัชสกรีน
    setupButtons() {
        const controlsWhole = document.getElementById('controls-whole');
        const controlsA = document.getElementById('controls-part-a');
        const controlsB = document.getElementById('controls-part-b');

        // ซ่อน/แสดงตามโหมดเพื่อไม่ให้เด็กสับสน
        if (this.currentMode === 'PARTS') {
            controlsWhole.style.visibility = 'hidden';
            
            if (this.questionType === 'FIXED') {
                controlsA.style.visibility = 'hidden'; // ล็อกกลุ่มสีเขียว
                controlsB.style.visibility = 'visible';
            } else {
                controlsA.style.visibility = 'visible';
                controlsB.style.visibility = 'visible';
            }
        } else {
            controlsWhole.style.visibility = 'visible';
            controlsA.style.visibility = 'hidden';
            controlsB.style.visibility = 'hidden';
        }
    }

    // ตรวจคำตอบของนักเรียน
    checkAnswer() {
        let isCorrect = false;

        if (this.currentMode === 'PARTS') {
            // ส่วนย่อยสองส่วนต้องบวกรวมกันแล้วเท่ากับส่วนรวม
            const sumParts = this.answerPartA + this.answerPartB;
            
            if (this.questionType === 'FIXED') {
                // แบบล็อกฝั่ง A คำตอบฝั่ง B ต้องเป๊ะด้วย
                isCorrect = (sumParts === this.currentQuestion.whole) && 
                            (this.answerPartB === this.currentQuestion.targetPartB);
            } else {
                // แบบแบ่งกลุ่มอิสระ แบ่งคู่ไหนก็ได้ที่รวมแล้วได้ Whole
                isCorrect = (sumParts === this.currentQuestion.whole);
            }
        } else {
            // โหมดหาส่วนรวม: คำตอบส่วนรวมต้องเท่ากับคู่ย่อยบวกกัน
            const correctSum = this.currentQuestion.targetPartA + this.currentQuestion.targetPartB;
            isCorrect = (this.answerWhole === correctSum);
        }

        // แสดงผลลัพธ์เสียงและข้อความตอบรับ
        if (isCorrect) {
            audio.playCorrect();
            this.score += 20; // ตอบถูกได้ 20 คะแนน
            this.txtScore.innerText = this.score;
            
            this.feedbackBox.innerHTML = `<span class="feedback-text correct">★ เก่งมากเลยจ้า! ตอบถูกแล้ว ★</span>`;
            
            // รอ 1.5 วินาทีแล้วขึ้นข้อถัดไป
            setTimeout(() => this.nextRound(), 1500);
        } else {
            audio.playWrong();
            this.feedbackBox.innerHTML = `<span class="feedback-text wrong">✗ อ๊ะ! ลองนับใหม่อีกทีนะเด็กดี ✗</span>`;
        }
    }

    // ไปข้อถัดไปหรือจบด่าน
    nextRound() {
        this.round++;
        if (this.round <= this.maxRounds) {
            this.generateQuestion();
        } else {
            this.endGame();
        }
    }

    // จบการเล่นเกม แสดงผลสรุปคะแนน
    endGame() {
        motion.stop();
        this.webcamEnabled = false;
        
        audio.playVictory();
        
        // บันทึกสถิติสูงสุด
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pixel_math_highscore', this.highScore);
            if (this.txtHighScore) {
                this.txtHighScore.innerText = this.highScore;
            }
        }

        // แสดงหน้าจอสรุปคะแนน
        this.switchScreen('summary');
        
        // วาดตารางสรุปเกรดตามคะแนน (สไตล์แบบเอกสารเรียบร้อยสำหรับรายงานผล)
        const summaryTableBody = document.getElementById('summary-table-body');
        
        let grade = 'ผ่านเกณฑ์';
        let feedbackComment = 'มีความเข้าใจที่ดี สามารถนับและเชื่อมโยงจำนวนได้ถูกต้อง';
        
        if (this.score >= 100) {
            grade = 'ดีเยี่ยม (Excellent)';
            feedbackComment = 'สุดยอดมากเลยจ้า! เข้าใจเรื่องส่วนย่อยส่วนรวมอย่างสมบูรณ์แบบ';
        } else if (this.score >= 60) {
            grade = 'ผ่านดี (Good)';
        } else {
            grade = 'ควรส่งเสริม';
            feedbackComment = 'ควรทบทวนการนับเลขและฝึกการจับคู่ผลรวมเพิ่มอีกนิดนะจ๊ะ';
        }

        summaryTableBody.innerHTML = `
            <tr>
                <td>คะแนนที่ได้</td>
                <td style="font-family:var(--font-game); color:var(--neon-green);">${this.score} / 100</td>
            </tr>
            <tr>
                <td>ระดับด่านที่เล่น</td>
                <td>ระดับที่ ${this.level} (สูงสุดไม่เกิน ${this.level === 1 ? 5 : (this.level === 2 ? 10 : 20)})</td>
            </tr>
            <tr>
                <td>การประเมินผล</td>
                <td style="font-weight:bold; color:var(--neon-yellow);">${grade}</td>
            </tr>
            <tr>
                <td>คำแนะนำจากครู</td>
                <td style="font-size:14px; text-align:left;">${feedbackComment}</td>
            </tr>
        `;
    }

    // กลับหน้าเมนูหลัก
    goHome() {
        audio.playSelect();
        motion.stop();
        this.webcamEnabled = false;
        
        // เคลียร์เว็บแคมสวิตช์ในหน้าแรก
        const webcamToggle = document.getElementById('webcam-toggle');
        if (webcamToggle) webcamToggle.checked = false;

        if (this.txtHighScoreMenu) {
            this.txtHighScoreMenu.innerText = this.highScore;
        }

        this.switchScreen('menu');
    }
}

// สร้างตัวแปรแอปพลิเคชันหลัก
let game;

// โหลดข้อมูลเสียงและการตั้งค่าหลังจากเข้าเว็บสำเร็จ
window.addEventListener('load', () => {
    game = new MathGame();

    // บังคับวาดความสัมพันธ์เส้นใหม่เมื่อหมุนหน้าจอโทรศัพท์/แท็บเล็ต
    window.addEventListener('resize', () => {
        if (game && game.screens.game.classList.contains('active')) {
            game.drawRelationLines();
        }
    });
});
