# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.1 - Dashboard és Booking Fejlesztések (2025-03-25)

### ✅ Akciók kezelése admin felületen
- **Szolgáltatások oldalon új "Akciók" fül** (rózsaszín, elsőként jelenik meg)
- **Új akció létrehozása** form:
  - Akció neve és leírása
  - Akciós ár és eredeti ár (%-os kedvezmény automatikus számítás)
  - Kategória (Komplett/Külső/Belső)
  - Csomag (Eco/Pro/VIP)
  - Autó méretek választása (S/M/L/XL/XXL)
  - Időtartam, badge szöveg, érvényesség dátum
  - Aktív/Inaktív kapcsoló
- **Akciók szerkesztése és törlése**
- **Backend API:**
  - `POST /api/services/promotions` - Új akció
  - `GET /api/services/promotions/admin` - Admin lista
  - `PUT /api/services/promotions/{id}` - Frissítés
  - `DELETE /api/services/promotions/{id}` - Törlés

### ✅ Booking oldal - Akciós szolgáltatás megjelenítés
- Akciók automatikusan betöltődnek az adatbázisból
- Rózsaszín kártya kiemelés
- Kedvezmény százalék megjelenítés
- "Tartalmazza:" feature lista

### ✅ Dashboard - Dolgozónkénti nézet
- 2 dolgozó oszlop egymás mellett (desktop)
- "Hozzárendelésre vár" szekció (narancssárga)
- Kompakt munka kártyák

### ✅ Új státuszok
- "Nem jött el" (❌) - nem számít bevételbe
- "Lemondta" (🚫) - nem számít bevételbe
- Fizetési mód badge: 💵 Készpénz / 💳 Kártya

### ✅ Cloudinary integráció
- Cloud name: `dgqq8hea1`
- Képek Cloudinary-ban, metadata MongoDB-ben

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)
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
- [ ] Új ügyfél felvitel dashboard-ról

## P1 - Közepes prioritás  
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)

## P2 - Későbbi fejlesztés
- [ ] Kedvezmények rendszer (pl. Lion Office Center -10%)
- [ ] Jelenléti rendszer
- [ ] Naptár mobil nézet javítás

## Changelog
- 2025-03-25: Akciók admin kezelése a Szolgáltatások oldalon
- 2025-03-25: V3.1 - Dashboard dolgozónkénti nézet, új státuszok, Cloudinary
- 2025-03-25: V3.0 - Teljesen új BookingPage az árlista alapján
