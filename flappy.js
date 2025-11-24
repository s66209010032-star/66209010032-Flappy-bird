
/*
 * โครงสร้างเกม Flappy Bird
 * -------------------------------------------------
 * แนวคิดหลัก:
 * 1) สร้างฉาก (Game Board) ด้วย HTML5 Canvas สำหรับวาดภาพทุกเฟรม
 * 2) มีตัวละครหลัก (Player) ที่ในเกมนี้คือ "นก" ทำหน้าที่เป็นผู้เล่น
 * 3) สุ่มสร้างท่อคู่ (บน/ล่าง) เป็นสิ่งกีดขวางที่เลื่อนจากขวาไปซ้าย
 * 4) ใช้ลูปอัปเดตเฟรมเพื่อวาดภาพ, คำนวณฟิสิกส์, ตรวจสอบคะแนนและชนกัน
 * 5) เมื่อตัวละครชนท่อหรือหลุดขอบล่าง เกมจบและสามารถเริ่มใหม่ได้ทันที
 */

// ตั้งค่าพื้นที่เล่นเกม (Canvas) และตัวแปรบอร์ด
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

// ผู้เล่นหลัก (Player) - ใช้สไปรต์นกเป็นตัวแทน
// Bird configuration (Player avatar)
let birdWidth = 34; // width/height ratio = 408/228 = 17/12 ตามสัดส่วนภาพต้นฉบับ
let birdHeight = 24;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
} // โครงสร้างข้อมูลของ Player ใช้บอกตำแหน่งและขนาดที่ต้องวาดบนฉาก

// สิ่งกีดขวาง (Obstacles) - เก็บข้อมูลท่อที่จะแสดงผลบนหน้าจอ
// Pipes configuration
let pipeArray = [];
let pipeWidth = 64; // width/height ratio = 384/3072 = 1/8 ตามทรัพยากรภาพ
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// ฟิสิกส์ (Physics) - ความเร็วในแกน X/Y และแรงโน้มถ่วงที่ส่งผลต่อนก
let velocityX = -2; // ความเร็วท่อเลื่อนไปทางซ้าย (ทำให้รู้สึกว่านกบินไปข้างหน้า)
let velocityY = 0; // ค่าความเร็วตั้งต้นในแนวตั้ง
let gravity = 0.4; // แรงโน้มถ่วงทำให้นกค่อยๆ ตกลงเมื่อไม่กดปุ่ม

let gameOver = false;
let score = 0;

window.onload = function() {
    /*
     * วัตถุประสงค์: เตรียมทุกองค์ประกอบก่อนเกมเริ่ม
     * ขั้นตอนสำคัญ:
     * 1) เชื่อมต่อกับ <canvas> และเซ็ตขนาดพื้นที่เล่น
     * 2) โหลดภาพของ Player และสิ่งกีดขวางให้พร้อมใช้
     * 3) เรียกใช้ลูปหลักของเกมและตั้งตัวจับเวลาเพื่อสร้างท่อเป็นจังหวะ
     * 4) เพิ่มตัวจับเหตุการณ์ (event listener) เพื่อให้แป้นพิมพ์ควบคุมเกมได้
     */
    // ดึง <canvas> จาก HTML แล้วกำหนดขนาดให้ตรงกับตัวแปร
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); // context 2D สำหรับวาดรูปบน Canvas

    // โหลดภาพนกและรอจนโหลดเสร็จแล้วค่อยวาดนกเริ่มต้น
    birdImg = new Image();
    birdImg.src = "./assets/sprites/flappybird.png";
    birdImg.onload = function() {
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    }

    // โหลดภาพท่อบน/ท่อล่างเพื่อใช้ซ้ำทุกครั้งที่สร้างสิ่งกีดขวาง
    topPipeImg = new Image();
    topPipeImg.src = "./assets/images/pipe-top.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./assets/images/pipe-bottom.png";

    // เริ่มลูปวาดเฟรม, ตั้งเวลาเพิ่มท่อทุก 1.5 วินาที, และฟังการกดปุ่ม
    requestAnimationFrame(update);
    setInterval(placePipes, 1500); // every 1.5 seconds เพิ่มคู่ท่อใหม่
    document.addEventListener("keydown", moveBird);
}

// อัปเดตเฟรมหลักของเกม: วาดฉาก, คุมฟิสิกส์, ตรวจสอบคะแนนและจบเกม
function update() {
    /*
     * วัตถุประสงค์: ทำให้เกมเคลื่อนไหวแบบเรียลไทม์
     * กลไกหลัก:
     * - ขอให้เบราว์เซอร์เรียก update ซ้ำในเฟรมถัดไป (game loop)
     * - ประมวลผลแรงโน้มถ่วงและการกระโดดของ Player
     * - ขยับสิ่งกีดขวาง วาดทุกองค์ประกอบ และคำนวณคะแนน
     * - ตรวจสอบการชนและสภาวะเกมจบ
     */
    // เรียกตัวเองซ้ำเพื่อให้เกิดอนิเมชัน (game loop)
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    // ล้างภาพเดิมก่อนวาดเฟรมใหม่
    context.clearRect(0, 0, board.width, board.height);

    // อัปเดตการเคลื่อนที่ของนก
    // 1) เพิ่ม velocityY ด้วยแรงโน้มถ่วง
    // 2) คำนวณตำแหน่งใหม่ (bird.y) โดยไม่ให้นกหลุดออกจากขอบบน
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0); 
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
    }

    // อัปเดตและวาดท่อทุกชิ้นในอาร์เรย์
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX; // ขยับท่อไปทางซ้ายตามความเร็วเกม
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            // เมื่อนกบินผ่านท่อหนึ่งชิ้น (บนหรือ ล่าง) เพิ่มคะแนน 0.5
            // ท่อหนึ่งคู่มี 2 ชิ้น จึงรวมเป็น 1 คะแนนเต็มต่อการผ่านหนึ่งช่อง
            score += 0.5; 
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
        }
    }

    // ลบท่อที่พ้นจอเพื่อไม่ให้ข้อมูลสะสมและกินหน่วยความจำ
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); // remove ท่อชิ้นแรกในอาร์เรย์
    }

    // วาดคะแนนและข้อความจบเกม
    context.fillStyle = "white";
    context.font="45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}

// Random pipes - วางท่อแบบสุ่มระยะห่าง เพื่อสร้างความท้าทาย
function placePipes() {
    /*
     * วัตถุประสงค์: เพิ่มคู่ท่อใหม่ทางด้านขวาของฉาก
     * กลไกหลัก:
     * - สุ่มค่าท่อบนเพื่อให้ช่องเปิดแต่ละครั้งต่างกัน
     * - จัดตำแหน่งท่อบนและท่อล่างให้เกิดช่องว่างที่บินผ่านได้
     * - ใส่ flag passed เพื่อกันการนับคะแนนซ้ำ
     */
    if (gameOver) {
        return;
    }

    // สุ่มตำแหน่งท่อบน โดยเลื่อนขึ้นลงตามค่า randomPipeY
    // openingSpace คือช่องว่างระหว่างท่อบนกับท่อล่างที่ผู้เล่นต้องบินผ่าน
    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/4;

    // ท่อบน (กลับด้าน) มีคุณสมบัติรวมถึง flag passed เพื่อคิดคะแนน
    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(topPipe);

    // ท่อล่างวางถัดมาจากท่อบน + ช่องว่างที่กำหนด
    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    /*
     * วัตถุประสงค์: รับอินพุตจากแป้นพิมพ์แล้วทำให้ Player กระโดด
     * กลไกหลัก:
     * - ตั้งค่า velocityY เป็นค่าลบ (กระโดดขึ้น) เมื่อกด Space, ArrowUp หรือ X
     * - หากเกมจบอยู่ ให้รีเซ็ตตำแหน่ง Player, ลบท่อทั้งหมด และคืนคะแนน
     */
    if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {
        // ปรับความเร็วในแนวตั้งเป็นค่าลบเพื่อให้เกิดการกระโดดพุ่งขึ้น
        velocityY = -6;

        // หากเกมจบอยู่ ให้รีเซ็ตสถานะทั้งหมดเพื่อเริ่มเล่นใหม่ทันที
        if (gameOver) {
            bird.y = birdY;
            pipeArray = [];
            score = 0;
            gameOver = false;
        }
    }
}

function detectCollision(a, b) {
    // ตรวจสอบกล่องสี่เหลี่ยม (Axis-Aligned Bounding Box) ของสองวัตถุซ้อนทับกันหรือไม่
    // หากทุกเงื่อนไขเป็นจริง แสดงว่าเกิดการชนกัน -> คืนค่า true
    return a.x < b.x + b.width &&   
           a.x + a.width > b.x &&   
           a.y < b.y + b.height &&  
           a.y + a.height > b.y;    
}
