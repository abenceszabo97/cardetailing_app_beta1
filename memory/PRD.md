# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.6 - Jelenléti rendszer (2025-03-25)

### ✅ Be/Kilépés funkció
- **Új "Jelenlét" tab** a Dolgozók oldalon
- Dolgozónkénti kártyák különböző státuszokkal:
  - Nem jelentkezett: "Belépés" gomb (zöld)
  - Bejelentkezve: Zöld keret, "X óta" badge, "Kilépés" gomb (piros)
  - Kijelentkezett: Kék keret, "X óra" badge, "Kijelentkezett" badge
- Napi összesítő: Dolgozók, Bejelentkezve, Kijelentkezett, Nem jelentkezett

### ✅ Backend API-k
- `POST /api/attendance/check-in` - Bejelentkezés
- `POST /api/attendance/check-out` - Kijelentkezés (+ ledolgozott órák számítás)
- `GET /api/attendance/today` - Mai jelenléti rekordok
- `GET /api/attendance/worker/{id}` - Dolgozó jelenléti története
- `GET /api/attendance/stats/{id}` - Dolgozó jelenléti statisztikák

## V3.5 - Pénztár funkciók (2025-03-25)
- Készpénz kivétel funkció
- Előző nap záró egyenlege napnyitáskor
- Napzárás részletes számítás (Nyitó + Bevétel - Kivételek = Záró)

## V3.4 - P0 Fejlesztések (2025-03-25)
- Munkások műszakszerkesztés (napra kattintás, edit dialógus)
- Statisztika korábbi napok megtekintése (dátumnavigátor)

## V3.3 - Naptár modul (2025-03-25)
- Munkásonkénti oszlopnézet
- Mobil nézet javítás

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)
- **Deployment**: Railway (backend), Vercel (frontend)

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## P0 - Következő teendők
- [ ] Havi jelenléti PDF riport generálás
- [ ] Betegszabadság/szabadság napok kezelése
- [ ] Jelenléti történelem megtekintése

## P1 - Közepes prioritás  
- [ ] Statisztikák - További mobil UI javítások
- [ ] Nap zárás részletes összesítő PDF
- [ ] Dolgozói értesítések (SMS/email)

## P2 - Későbbi fejlesztés
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)
- [ ] Kedvezmények rendszer

## Changelog
- 2025-03-25: V3.6 - Jelenléti rendszer (be/kilépés, összesítő)
- 2025-03-25: V3.5 - Készpénz kivétel, Előző nap záró egyenleg
- 2025-03-25: V3.4 - Műszakszerkesztés, Statisztika history
- 2025-03-25: V3.3 - Naptár oszlopnézet, mobil javítás
- 2025-03-25: V3.2 - Időblokkolás, Új ügyfél
- 2025-03-25: V3.1 - Cloudinary integráció
- 2025-03-25: V3.0 - Teljesen új BookingPage
