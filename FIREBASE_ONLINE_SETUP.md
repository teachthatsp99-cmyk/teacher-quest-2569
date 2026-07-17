# เปิดระบบออนไลน์ฟรี — ครูเควสต์ 2569

โค้ดระบบสมาชิก ตัวแต่งตัวละคร Cloud Save จำนวนผู้เล่น การเห็นเพื่อนในแผนที่ และ Multiplayer Classroom Raid เตรียมไว้แล้ว ผู้เล่นต้องเข้าสู่ระบบด้วย Google ก่อนเริ่มเกม

## บริการที่ใช้

- Firebase **Spark plan** เท่านั้น โดยไม่ผูก Billing account
- Authentication: Google เท่านั้น
- Realtime Database: โปรไฟล์ ความคืบหน้า Cloud Save สถานะออนไลน์ ตำแหน่งผู้เล่น และห้อง Raid แบบเรียลไทม์
- GitHub Pages: เว็บไซต์ ภาพ และไฟล์ Pixel Art ทั้งหมด
- ไม่ใช้ Phone/SMS, Cloud Functions หรือ Cloud Storage

## 1. สร้าง Firebase Project

1. เปิด [Firebase Console](https://console.firebase.google.com/)
2. กด **Create a project** และตั้งชื่อ เช่น `teacher-quest-2569`
3. จะเปิดหรือปิด Google Analytics ก็ได้ ระบบเกมไม่พึ่ง Analytics
4. ตรวจที่หน้า Usage and billing ว่าเป็นแผน **Spark — No-cost** และไม่มี Billing account

## 2. เปิดระบบบัญชี

1. ไปที่ **Build → Authentication → Get started**
2. ในแท็บ Sign-in method เปิด **Google** และเลือกอีเมลสนับสนุนของเจ้าของเว็บ
3. ปิด **Anonymous** ได้หลังจาก Rules ชุดใหม่ถูก Publish และเว็บเวอร์ชันบังคับล็อกอินขึ้นใช้งานแล้ว
4. ไปที่ **Settings → Authorized domains** แล้วเพิ่ม `teachthatsp99-cmyk.github.io`

ผู้เล่นต้องกดเข้าสู่ระบบ Google ก่อนเริ่มเล่น บัญชี Guest เดิมที่เคยเชื่อม Google แล้วจะใช้ UID เดิมและรักษาโปรไฟล์ไว้ ส่วนความคืบหน้าในเครื่องจะถูกอัปโหลดเข้า Cloud อัตโนมัติในการเข้าสู่ระบบครั้งแรก

## 3. สร้าง Realtime Database

1. ไปที่ **Build → Realtime Database → Create Database**
2. เลือกภูมิภาคใกล้ประเทศไทย หากมีตัวเลือกให้ใช้ Singapore/Asia
3. เลือกเริ่มแบบ Locked mode
4. เปิดแท็บ **Rules**
5. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `database.rules.json` ไปวาง แล้วกด **Publish**

กฎนี้อนุญาตเฉพาะบัญชี Google ให้แก้โปรไฟล์ ความคืบหน้า ตำแหน่ง และข้อมูลสมาชิก Raid ของ UID ตนเอง บัญชี Anonymous ถูกปฏิเสธ ผู้ที่ไม่ได้อยู่ในห้องอ่านข้อมูล Raid ไม่ได้ การโจมตีหนึ่งครั้งถูกจำกัดไม่เกิน 40 HP และอีโมตใช้ได้เฉพาะรายการที่ระบบกำหนด อีเมลไม่ถูกเก็บใน Realtime Database และไม่แสดงแก่ผู้เล่นอื่น

## 4. Web App Config

Repository นี้เชื่อมกับโปรเจกต์ `teacher-quest-2569` ไว้ใน `online-config.js` แล้ว ไม่ต้องคัดลอกค่าซ้ำอีก เว้นแต่เจ้าของจะย้ายไป Firebase Project ใหม่

หากย้ายโปรเจกต์ ให้กลับหน้า Project overview กดไอคอนเว็บ `</>` คัดลอกออบเจ็กต์ `firebaseConfig` และเพิ่ม `databaseURL` จากหน้า Realtime Database โดยคงรูปแบบนี้:

```js
window.TEACHER_QUEST_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

Firebase Web Config เป็นรหัสระบุโปรเจกต์ฝั่งเว็บ ไม่ใช่รหัสผ่าน แต่ห้ามนำ Service Account, private key หรือไฟล์ Admin SDK ใส่ GitHub เด็ดขาด

## จุดที่ต้องยืนยันใน Console ก่อนทดสอบ

- Authentication → Sign-in method: **Google** ต้องเป็น Enabled
- Authentication → Settings → Authorized domains: ต้องมี `teachthatsp99-cmyk.github.io`
- Realtime Database → Rules: ต้องเป็นเนื้อหาเดียวกับ `database.rules.json` และกด **Publish** แล้ว

## 5. ทดสอบก่อนเปิดใช้จริง

1. เปิดเว็บจาก GitHub Pages แล้วดูปุ่มสถานะมุมขวาบน
2. ต้องเห็นหน้า Google Login Gate ก่อนเข้าเกม และหลังล็อกอินปุ่มมุมขวาต้องเปลี่ยนเป็นจำนวนคนออนไลน์
3. ทำข้อสอบอย่างน้อยหนึ่งข้อ จากนั้นเปิดอีกเบราว์เซอร์และล็อกอิน Google บัญชีเดียวกัน เพื่อตรวจว่าคะแนนและข้อที่เคยทำถูกเรียกคืน
4. เปิดเว็บด้วย Google คนละบัญชีในสองเบราว์เซอร์ ตั้งชื่อและชุดคนละแบบ แล้วให้ตัวละครอยู่พื้นที่เดียวกัน
5. ตรวจว่ามองเห็นชื่อและตัวละครของอีกบัญชี และจำนวนออนไลน์เป็น 2
6. ปิดหนึ่งหน้าต่าง จำนวนออนไลน์และตัวละครควรหายภายในไม่กี่วินาที
7. เปิดเมนู **Multiplayer Raid** สร้างห้อง ส่งรหัส 6 ตัวให้อีกบัญชี แล้วตรวจว่ารายชื่อสมาชิกขึ้นทั้งสองหน้าจอ
8. ให้หัวหน้าห้องกดเริ่ม ตอบถูกจากทั้งสองบัญชี แล้วตรวจว่า HP บอสและอันดับความเสียหายอัปเดตตรงกัน

## การใช้โควตาฟรีอย่างปลอดภัย

- ส่งตำแหน่งไม่เกินประมาณ 1–2 ครั้งต่อวินาที และส่งเฉพาะเมื่ออยู่หน้าโลกผจญภัย
- รับผู้เล่นเฉพาะพื้นที่เดียวกัน สูงสุด 40 ตัวละครต่อหน้าจอ
- เก็บชุดเป็นรหัสสี ไม่อัปโหลดรูปจากผู้ใช้
- Cloud Save หน่วงการเขียนและบันทึกตำแหน่งเป็นช่วง เพื่อลดจำนวนคำขอฐานข้อมูล
- ห้อง Raid จำกัด 8 คน ส่ง heartbeat ทุก 25 วินาที และไม่มีแชตอิสระ
- Authentication บน Spark รองรับผู้ใช้งานตามโควตาของ Firebase ในปัจจุบัน ควรตรวจหน้า Usage เป็นระยะ
- แผน Spark รองรับ Realtime Database พร้อมกัน 100 การเชื่อมต่อ เมื่อโครงการเติบโตจึงค่อยย้ายเฉพาะห้องเกมไป Cloudflare Durable Objects
