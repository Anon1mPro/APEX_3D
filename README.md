# APEX3D Engine

## 🌐 MULTIPLAYER YANGILIK — Real-time Collaborative Editor!

APEX3D endi **real-time multiplayer**ni qo'llab-quvvatlaydi! Firebase orqali bir nechta foydalanuvchi bir vaqtda bir sahna ustida ishlashi mumkin.

### ✨ Multiplayer Imkoniyatlar

- 🔗 **Firebase Integration** — Realtime Database bilan ulanish
- 🚪 **Room System** — Session yaratish va boshqalarga ulashish
- 📡 **Real-time Sync** — Obyektlar avtomatik sinxronlanadi
- 👥 **User Visualization** — Boshqa foydalanuvchilarning kursorlari va tanlovlarini ko'rish
- 🎮 **Player Mode** — Editor modidan player modiga o'tish, WASD bilan boshqarish
- 🔒 **Conflict Resolution** — Bir obyektni bir vaqtda faqat bitta kishi tahrirlaydi
- 💾 **Scene Export** — Collaborative sahnani yuklab olish
- ⚡ **Smooth Interpolation** — Lag yo'q! Client-side prediction va smooth interpolation

### 🚀 Qanday Ishlaydi?

**Client-side Prediction:**
- O'z obyektlaringiz darhol harakatlanadi (lag yo'q!)
- Server'ga throttled yuboriladi (150ms delay)
- Foydalanuvchi smooth tajriba ko'radi

**Smooth Interpolation:**
- Boshqa foydalanuvchilarning obyektlari interpolatsiya bilan harakat qiladi
- Lag va sakrash yo'q, faqat silliq harakat
- Real-time va responsiv his

### 🚀 Multiplayer Qanday Ishlatiladi?

1. **Firebase Sozlash:**
   - [Firebase Console](https://console.firebase.google.com) ga kiring
   - Yangi loyiha yarating
   - Realtime Database yarating
   - API Key va Database URL ni oling

2. **Editor'da:**
   - Inspector panelida **"ONLINE"** tabiga o'ting
   - Firebase API Key va Database URL kiriting
   - **"Connect"** bosing

3. **Room Yaratish:**
   - **"Room Yaratish"** tugmasini bosing
   - Room ID ni boshqalarga ulashing

4. **Qo'shilish:**
   - **"Qo'shilish"** tugmasini bosing
   - Room ID ni kiriting

5. **Ishlatish:**
   - Obyektlar qo'shing, o'zgartiring — avtomatik sinxronlanadi!
   - Boshqa foydalanuvchilarning kursorlari va tanlovlarini ko'rasiz
   - **"Become Player"** tugmasi bilan obyektni boshqaring
   - **"Sahnani Yuklab Olish"** bilan natijani saqlab oling

### 🎮 Player Mode

- Obyekt tanlang va **"Become Player"** bosing
- WASD — harakat
- Space — sakrash
- Boshqalar sizni 3D sahnada ko'radi!

### 🔒 Xavfsizlik

- Har bir obyektni faqat bitta kishi tahrirlashi mumkin
- Locked obyektlar 🔒 belgisi bilan ko'rsatiladi
- Boshqa foydalanuvchining obyektini boshqarmoqchi bo'lsangiz, nusxasi yaratiladi

---

## Ishga tushirish

### Usul 1 — Node.js server (tavsiya etiladi)
```bash
node server.js
```
Keyin brauzerda: **http://localhost:3000**

### Usul 2 — VS Code Live Server
VS Code da `index.html` ni ochib, **Go Live** tugmasini bosing.

### Usul 3 — Python server
```bash
python -m http.server 3000
```

> ⚠️ `file://` bilan to'g'ridan brauzerda ochish ishlamaydi — CORS xatosi chiqadi.

## Fayl tuzilmasi
```
APEX-3D-ENGINE/
├── index.html
├── server.js          ← lokal server
└── scripts/
    ├── core/          ← dvigatel asosi (renderer, hierarchy, inspector...)
    ├── systems/       ← tizimlar (physics, audio, timeline, multiplayer...)
    ├── entities/      ← obyektlar (player, car, animal-ai)
    ├── gameplay/      ← o'yin (keyboard, camera, weapon...)
    ├── ui/            ← interfeys panellari
    └── misc/          ← qo'shimcha (stats, screenshot...)
```

## 🆕 Yangi Multiplayer Fayllar

- `scripts/systems/multiplayer.js` — Asosiy multiplayer tizimi
- `scripts/systems/multiplayer-smooth.js` — **Smooth interpolation va client-side prediction**
- `scripts/systems/multiplayer-viz.js` — User cursor va selection vizualizatsiyasi
- `scripts/systems/multiplayer-hooks.js` — Auto-sync hooklari
- `scripts/systems/multiplayer-selection-sync.js` — Selection sinxronizatsiyasi
- `scripts/systems/multiplayer-player-mode.js` — Player mode mexanikasi
- `scripts/ui/multiplayer-panel.js` — Online UI paneli
- `scripts/ui/inspector-tabs.js` — Inspector tab switching

