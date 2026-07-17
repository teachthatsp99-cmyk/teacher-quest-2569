# เปิดระบบออนไลน์ฟรี — ครูเควสต์ 2569

โค้ดระบบสมาชิก ตัวแต่งตัวละคร จำนวนผู้เล่น และการเห็นเพื่อนในแผนที่เตรียมไว้แล้ว เว็บไซต์ยังเล่นแบบออฟไลน์ได้ตามปกติจนกว่าจะใส่ค่าตั้งค่านี้

## บริการที่ใช้

- Firebase **Spark plan** เท่านั้น โดยไม่ผูก Billing account
- Authentication: Anonymous และ Google
- Realtime Database: โปรไฟล์ สถานะออนไลน์ และตำแหน่งผู้เล่น
- GitHub Pages: เว็บไซต์ ภาพ และไฟล์ Pixel Art ทั้งหมด
- ไม่ใช้ Phone/SMS, Cloud Functions หรือ Cloud Storage

## 1. สร้าง Firebase Project

1. เปิด [Firebase Console](https://console.firebase.google.com/)
2. กด **Create a project** และตั้งชื่อ เช่น `teacher-quest-2569`
3. จะเปิดหรือปิด Google Analytics ก็ได้ ระบบเกมไม่พึ่ง Analytics
4. ตรวจที่หน้า Usage and billing ว่าเป็นแผน **Spark — No-cost** และไม่มี Billing account

## 2. เปิดระบบบัญชี

1. ไปที่ **Build → Authentication → Get started**
2. ในแท็บ Sign-in method เปิด **Anonymous**
3. เปิด **Google** และเลือกอีเมลสนับสนุนของเจ้าของเว็บ
4. ไปที่ **Settings → Authorized domains** แล้วเพิ่ม `teachthatsp99-cmyk.github.io`

ผู้เล่นจะเข้าด้วยบัญชี Guest อัตโนมัติ จึงเริ่มเล่นได้ทันที และเลือกเชื่อม Google ภายหลังเพื่อรักษาชื่อและตัวละครได้

## 3. สร้าง Realtime Database

1. ไปที่ **Build → Realtime Database → Create Database**
2. เลือกภูมิภาคใกล้ประเทศไทย หากมีตัวเลือกให้ใช้ Singapore/Asia
3. เลือกเริ่มแบบ Locked mode
4. เปิดแท็บ **Rules**
5. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `database.rules.json` ไปวาง แล้วกด **Publish**

กฎนี้อนุญาตให้ผู้เล่นแก้เฉพาะโปรไฟล์และตำแหน่งของตนเอง อีเมลไม่ถูกเก็บในข้อมูลสาธารณะ และผู้ที่ยังไม่ยืนยันตัวตนอ่านข้อมูลไม่ได้

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

- Authentication → Sign-in method: **Anonymous** และ **Google** ต้องเป็น Enabled
- Authentication → Settings → Authorized domains: ต้องมี `teachthatsp99-cmyk.github.io`
- Realtime Database → Rules: ต้องเป็นเนื้อหาเดียวกับ `database.rules.json` และกด **Publish** แล้ว

## 5. ทดสอบก่อนเปิดใช้จริง

1. เปิดเว็บจาก GitHub Pages แล้วดูปุ่มสถานะมุมขวาบน
2. ปุ่มต้องเปลี่ยนจาก “กำลังเชื่อม” เป็นจำนวนคนออนไลน์
3. เปิดเว็บในหน้าต่างปกติและ Incognito พร้อมกัน
4. ตั้งชื่อและชุดคนละแบบ จากนั้นให้ตัวละครทั้งสองอยู่พื้นที่เดียวกัน
5. ตรวจว่ามองเห็นชื่อและตัวละครของอีกหน้าต่าง และจำนวนออนไลน์เป็น 2
6. ปิดหนึ่งหน้าต่าง จำนวนออนไลน์และตัวละครควรหายภายในไม่กี่วินาที

## การใช้โควตาฟรีอย่างปลอดภัย

- ส่งตำแหน่งไม่เกินประมาณ 1–2 ครั้งต่อวินาที และส่งเฉพาะเมื่ออยู่หน้าโลกผจญภัย
- รับผู้เล่นเฉพาะพื้นที่เดียวกัน สูงสุด 40 ตัวละครต่อหน้าจอ
- เก็บชุดเป็นรหัสสี ไม่อัปโหลดรูปจากผู้ใช้
- Authentication บน Spark รองรับผู้ใช้งานประจำวันตามโควตาฟรีปัจจุบัน (3,000 DAU สำหรับผู้ให้บริการทั่วไป)
- แผน Spark รองรับ Realtime Database พร้อมกัน 100 การเชื่อมต่อ เมื่อโครงการเติบโตจึงค่อยย้ายเฉพาะห้องเกมไป Cloudflare Durable Objects
