# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika (Statisztika oldalon)**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként/telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely) - mindenki számára
- **Dolgozói havi statisztika**: Ledolgozott napok/órák, elkészített autók, bevétel - hónapra szűrhető + PDF export + email küldés
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés + **Ebédszünet felvitele**
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés - mindenki számára
- **Készlet figyelmeztetések**: Értesítési harang a headerben, alacsony készlet push értesítés valós időben
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, haladó analitika, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - mindenki számára
- **Napnyitás/Napzárás**: Teljes flow + PDF export + email küldés, lezárt nap utáni újranyitás, pénzelvitel, kasszaellenőrzés
- **Beállítások**: Mindenki számára elérhető (profil, jelszó váltás); Admin: felhasználók kezelése
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz
- **Telephely**: Csak Debrecen (Budapest eltávolítva)

### V3.0 - Teljesen Új Foglalási Oldal (2025-03-25)
- **✅ Átdolgozott BookingPage UI**:
  - **1. Autó méret választás** - S/M/L/XL/XXL autó piktogramokkal
    - S: Ferdehátú, kisautó (Swift, Polo, Corsa)
    - M: Sedan, kompakt (Golf, Corolla, Audi A3)
    - L: Kombi, nagy sedan (Passat, Octavia)
    - XL: SUV, crossover (Tiguan, RAV4, BMW X3)
    - XXL: Terepjáró, kisbusz (Touareg, Range Rover, Transit)
  - **2. Szolgáltatás típus** - Külső / Belső / Komplett (Külső+Belső)
  - **3. Csomag választás** - Eco / Pro / VIP árakkal és feature listával
    - VIP: Liquid kerámia, prémium szolgáltatások
    - Pro: Bővített csomag (wax, falcok, felni)
    - Eco: Alap tisztítás
  - **4. Extra szolgáltatások** - Opcionális kiegészítők
    - Vízkő eltávolítás, gyanta eltávolítás
    - Ózonos fertőtlenítés, kárpittisztítás
    - Bőrápolás, állatszőr eltávolítás
  - **5. Időpont választás** - Heti naptár nézet
  - **6. Személyes adatok** - Gyors rendszám keresés
  - **7. Összegzés** - Végső ár kalkuláció

- **✅ Backend Pricing API**:
  - `/api/services/pricing-data` - Teljes ármatrix és csomag tartalom
  - `/api/services/extras` - Extra szolgáltatások listája
  - `/api/services/calculate-price` - Ár kalkuláció
  - `/api/services/sync-pricing` - Árak szinkronizálása DB-be

- **✅ Object Storage integráció** (Emergent):
  - `/api/files/upload` - Fájl feltöltés
  - `/api/files/upload-multiple` - Több fájl feltöltése
  - `/api/files/{file_id}` - Fájl lekérdezés
  - `/api/files/{file_id}/download` - Fájl letöltés
  - `/api/files/entity/{entity_type}/{entity_id}` - Entitáshoz tartozó fájlok

- **✅ Ár mátrix az X-CLEAN árlista alapján**:
  ```
  Méret     Külső Eco/Pro/VIP    Belső Eco/Pro/VIP    Komplett Eco/Pro/VIP
  S         4,000/7,800/9,700    3,000/5,300/6,700    6,000/11,800/14,700
  M         4,800/8,600/10,800   3,500/6,000/7,400    7,500/13,100/16,400
  L         5,500/9,400/11,700   4,000/6,400/8,000    8,600/14,200/17,800
  XL        6,300/10,700/13,400  4,800/7,400/9,300    10,100/16,400/20,500
  XXL       8,000/11,700/14,600  6,300/7,700/9,600    13,000/17,400/21,700
  ```

### Korábbi verziók
- V2.6 - Feketelista bizonyíték képek (2025-12-21)
- V2.5 - Megnevezett Előtte-Utána képek (2025-12-20)
- V2.4 - AI Chatbot (2025-12-20)
- V2.3 - Frontend szétválasztás (admin/booking) (2025-12-20)
- V2.2 - Dolgozó megjelenítés, ebédszünet (2025-12-20)
- V2.1 - Username/password auth (2025-12-20)
- V2.0 - Booking rendszer, AI backend (2025-12-16)

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic, bcrypt, python-jose (JWT)
- **Database**: MongoDB
- **Auth**: Felhasználónév + Jelszó (JWT tokens, bcrypt hash)
- **Integrations**: 
  - Groq (AI chatbot, upsell)
  - Resend (Email visszaigazolások)
  - Emergent Object Storage (Képfeltöltés)
- **Deployment**: Railway (backend), Vercel (frontend)

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## Tesztelési állapot
- Utolsó teszt: 2025. március 25.
- Teszt credentials: admin / admin123
- Preview URL: https://wash-management-dev.preview.emergentagent.com

## P0 - Következő teendők (Kiemelt prioritás)
- [ ] Railway deploy frissítés az új kóddal (pricing API, object storage)
- [ ] Dashboard dolgozónkénti nézet (2 dolgozó oszlopban)
- [ ] Új státuszok: "Nem jött el", "Lemondta"
- [ ] Fizetési mód megjelenítés "Kész" státusznál

## P1 - Közepes prioritás  
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] E-nyugta integráció
- [ ] SMS értesítés (Twilio)

## P2 - Későbbi fejlesztés
- [ ] Időblokkolás logika (dolgozó foglaltság kezelése)
- [ ] Új ügyfél felvitel a dashboard-ról
- [ ] Kedvezmények rendszer (pl. Lion Office Center -10%)
- [ ] Automatikus PDF napzárás email

## P3 - Backlog
- [ ] Jelenléti rendszer (be/kijelentkezés, PDF export)
- [ ] Munkaidő számítás (ebédszünet levonás)
- [ ] Statisztika mobil UI javítás
- [ ] Régi /app/frontend és server_old.py törlése

## Changelog
- 2025-03-25: V3.0 - Teljesen új BookingPage az árlista alapján, Object Storage integráció
- 2025-03-24: Production deployment fixes (CORS, Railway, Vercel)
- 2025-03-23: Groq AI integráció, Resend email integráció
- 2025-12-21: V2.6 - Feketelista bizonyíték képek
- 2025-12-20: V2.5 - Megnevezett Előtte-Utána képek
- 2025-12-20: V2.4 - AI Chatbot
- 2025-12-20: V2.3 - Frontend refaktorálás
