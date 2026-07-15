# ตั้งค่าบัญชีและซิงก์ฟรี — ครูเควสต์ V4

ระบบเว็บไซต์เตรียมโค้ดไว้แล้ว เหลือสร้าง Firebase Project และนำค่าของ Web App มาใส่เท่านั้น

## เงื่อนไขที่ยึดไว้

- ใช้ **Firebase Spark plan** เท่านั้น
- ไม่เพิ่ม Billing account และไม่อัปเกรดเป็น Blaze
- ใช้เพียง **Authentication: Email/Password** และ **Cloud Firestore**
- ไม่ใช้ SMS/Phone Auth, Cloud Functions, Cloud Storage หรือบริการที่ต้องเปิดการชำระเงิน
- เว็บไซต์ยังทำงานแบบเดิมได้ แม้ยังไม่ตั้งค่า Firebase

## 1. สร้างโปรเจกต์

1. เข้า Firebase Console ด้วยบัญชี Google
2. เลือก **Create a project**
3. ตั้งชื่อ เช่น `teacher-quest-2569`
4. ปิด Google Analytics ได้ เพราะระบบนี้ไม่จำเป็นต้องใช้
5. ตรวจให้แน่ใจว่าอยู่แผน **Spark** และไม่มี Billing account

## 2. เพิ่ม Web App

1. ใน Project overview กดไอคอน `</>`
2. ตั้งชื่อแอป เช่น `Teacher Quest Web`
3. ไม่ต้องเปิด Firebase Hosting เพราะเว็บไซต์ใช้ GitHub Pages
4. คัดลอกค่า `firebaseConfig`
5. เปิดไฟล์ `firebase-config.js`
6. เปลี่ยนบรรทัด `window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;` เป็นค่าที่คัดลอกมา เช่น

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

> Firebase Web Config ใช้ระบุโปรเจกต์ฝั่งเว็บ ไม่ใช่รหัสผ่านผู้ดูแล ห้ามนำ Service Account หรือ Private Key ใส่ใน GitHub

## 3. เปิดระบบสมัครด้วยอีเมล

1. ไปที่ **Build → Authentication**
2. กด **Get started**
3. เปิด **Email/Password**
4. ไม่ต้องเปิด Phone provider

## 4. สร้าง Firestore

1. ไปที่ **Build → Firestore Database**
2. กด **Create database**
3. เลือก Region ใกล้ผู้ใช้ เช่น Asia
4. หลังสร้างแล้ว ไปแท็บ **Rules**
5. วางเนื้อหาจากไฟล์ `firestore.rules` และกด Publish

กฎนี้อนุญาตให้ผู้ใช้แต่ละคนอ่านและเขียนได้เฉพาะเอกสารของบัญชีตัวเอง

## 5. เพิ่มโดเมน GitHub Pages

1. ไปที่ **Authentication → Settings → Authorized domains**
2. เพิ่ม `teachthatsp99-cmyk.github.io`

## 6. ทดสอบ

1. เปิดเว็บไซต์ GitHub Pages
2. กดปุ่มรูปเมฆด้านบน หรือเข้า **ศูนย์ฝึกอัจฉริยะ**
3. สมัครบัญชีด้วยอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร
4. กด **อัปโหลดข้อมูลเครื่องนี้**
5. เปิดอีกเบราว์เซอร์ เข้าบัญชีเดิม แล้วกด **ดึงข้อมูลจากคลาวด์**

## การป้องกันข้อมูลทับกัน

V4 ไม่ซิงก์อัตโนมัติ ผู้ใช้ต้องเลือกเองว่าจะ

- อัปโหลดข้อมูลจากเครื่องขึ้นคลาวด์ หรือ
- ดึงข้อมูลจากคลาวด์ลงเครื่อง

วิธีนี้ลดความเสี่ยงที่เครื่องเก่าจะเขียนทับความคืบหน้าใหม่ และช่วยควบคุมจำนวนการอ่าน/เขียนในโควตาฟรี
