# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Fő funkciók

### V3.1 - Dashboard és Booking Fejlesztések (2025-03-25)

#### ✅ Booking oldal - Akciós szolgáltatás
- **"Aktuális akciók"** szekció a foglalás tetején (rózsaszín szín)
- **Tavaszi akció: 15,990 Ft** (eredeti 16,400 Ft - 410 Ft megtakarítás)
- Komplett külső+belső tisztítás M méretig
- ~70 perc időtartam
- Érvényesség: 2025-04-30-ig
- "Tartalmazza:" feature lista a kiválasztott akcióhoz

#### ✅ Dashboard - Dolgozónkénti nézet
- **2 dolgozó oszlop egymás mellett** (desktop)
- Minden dolgozóhoz külön blokk:
  - Dolgozó neve és munka száma
  - Hozzárendelt munkák listája
- **"Hozzárendelésre vár"** szekció (narancssárga) - dolgozóhoz nem rendelt munkák
- Kompakt munka kártyák: rendszám, státusz, ügyfél, szolgáltatás, időpont, ár, telefon

#### ✅ Új státuszok
- **"Nem jött el"** (❌) - Piros badge, nem számít bevételbe
- **"Lemondta"** (🚫) - Narancssárga badge, nem számít bevételbe
- Gombok: "Indít", "Nem jött", "Lemondta" foglalt státusznál

#### ✅ Fizetési mód megjelenítés
- **"Kész"** státusznál: 💵 Készpénz vagy 💳 Kártya badge

#### ✅ Cloudinary integráció
- Cloud name: `dgqq8hea1`
- Képek Cloudinary-ban, metadata MongoDB-ben
- `/api/cloudinary/config` - konfiguráció ellenőrzés
- `/api/cloudinary/signature` - frontend direct upload aláírás
- `/api/files/upload` - backend feltöltés

### V3.0 - Teljesen Új Foglalási Oldal (2025-03-25)
- Autó méret választó (S/M/L/XL/XXL) autó piktogramokkal
- Szolgáltatás típus (Külső/Belső/Komplett)
- Csomag választó (Eco/Pro/VIP) feature listával
- Extra szolgáltatások checkbox listával
- Dinamikus ár kalkuláció az árlista alapján
- Ár mátrix backend API-val

### Korábbi verziók
- V2.6 - Feketelista bizonyíték képek
- V2.5 - Megnevezett Előtte-Utána képek
- V2.4 - AI Chatbot (Groq)
- V2.3 - Frontend szétválasztás (admin/booking)

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **Integrations**: 
  - Groq (AI chatbot)
  - Resend (Email)
  - Cloudinary (Képfeltöltés)
- **Deployment**: Railway (backend), Vercel (frontend)

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## Railway környezeti változók (hozzáadandó)
```
CLOUDINARY_CLOUD_NAME=dgqq8hea1
CLOUDINARY_API_KEY=488457997917796
CLOUDINARY_API_SECRET=n1w30K_IpbIpnnVPTxagB5Lq5MM
```

## P0 - Következő teendők
- [ ] Railway deploy az új kóddal
- [ ] Időblokkolás logika (dolgozó foglaltság alapján)
- [ ] Új ügyfél felvitel dashboard-ról (ne csak kiválasztás)

## P1 - Közepes prioritás  
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)

## P2 - Későbbi fejlesztés
- [ ] Kedvezmények rendszer (pl. Lion Office Center -10%)
- [ ] Jelenléti rendszer (be/kijelentkezés, PDF export)
- [ ] Naptár mobil nézet javítás
- [ ] Statisztika mobil UI javítás

## Changelog
- 2025-03-25: V3.1 - Dashboard dolgozónkénti nézet, új státuszok, Cloudinary, akciós szolgáltatás
- 2025-03-25: V3.0 - Teljesen új BookingPage az árlista alapján
- 2025-03-24: Production deployment fixes
- 2025-03-23: Groq AI, Resend email integráció
