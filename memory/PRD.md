# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.5 - Pénztár funkciók (2025-03-25)

### ✅ Készpénz kivétel funkció
- **"Új kivétel" gomb** a Napzárás szekcióban
- Dialógus megnyílik: összeg + indoklás mezők
- Kivétel rögzítése frissíti a listát és a várható egyenleget
- Kivétel lista: indoklás, felhasználó, időpont, összeg
- Backend: `POST /api/day-records/withdraw`

### ✅ Előző nap záró egyenlege
- **Napnyitáskor** megjelenik az előző nap záró egyenlege
- "Előző nap záró egyenlegének átvétele" gomb
- Eltérés megjelenítése ha volt (+/-)

### ✅ Napzárás részletes számítás
- Nyitó egyenleg
- + Készpénz bevétel
- - Készpénz kivételek (piros)
- = Várható záró egyenleg (zöld)

## V3.4 - P0 Fejlesztések (2025-03-25)

### ✅ Munkások modul - Műszakkezelés javítások
- Napra kattintás: új műszak dialógus dátummal
- Műszak szerkesztés dialógus
- Mobil nézet: kártya alapú napi lista

### ✅ Statisztika modul - Korábbi napok megtekintése
- Dátumválasztó: balra/jobbra nyilak + dátum input
- Történelmi nézet narancssárga kerettel
- "Ma" gomb a visszaugráshoz

## V3.3 - Naptár modul (2025-03-25)
- Naptár munkásonkénti oszlopnézet
- Mobil nézet javítás
- Dashboard "Hozzárendelésre vár" javítás

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
- [ ] Jelenléti rendszer - Be/kilépés funkció
- [ ] Havi jelenléti PDF riport
- [ ] Betegszabadság/szabadság napok kezelése

## P1 - Közepes prioritás  
- [ ] Statisztikák - További mobil UI javítások
- [ ] Nap zárás részletes összesítő PDF

## P2 - Későbbi fejlesztés
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)
- [ ] Kedvezmények rendszer

## Changelog
- 2025-03-25: V3.5 - Készpénz kivétel funkció, Előző nap záró egyenlege, Napzárás részletes számítás
- 2025-03-25: V3.4 - Munkások műszakszerkesztés, Statisztika history nézet
- 2025-03-25: V3.3 - Naptár munkásonkénti oszlopnézet, mobil nézet javítás
- 2025-03-25: V3.2 - Időblokkolás, Új ügyfél, Dashboard javítások
- 2025-03-25: V3.1 - Cloudinary integráció
- 2025-03-25: V3.0 - Teljesen új BookingPage
