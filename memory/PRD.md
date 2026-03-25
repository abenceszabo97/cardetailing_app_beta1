# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.4 - P0 Fejlesztések (2025-03-25)

### ✅ Munkások modul - Műszakkezelés javítások
- **Napra kattintás:** Bármelyik napra kattintva új műszak dialógus nyílik az előre kitöltött dátummal
- **Műszak szerkesztés:** Meglévő műszakra kattintva szerkesztés dialógus (dolgozó, időpontok, ebédszünet)
- **Mobil nézet:** Kártya alapú napi lista műszakokkal
- Backend: `/api/shifts/{shift_id}` PUT végpont bővítve teljes szerkesztéshez

### ✅ Statisztika modul - Korábbi napok megtekintése
- **Dátumválasztó:** Balra/jobbra nyilak + dátum input a navigációhoz
- **Történelmi nézet:** Narancssárga kerettel jelölt kártyák (dátum, autók, készpénz, kártya, összesen)
- **"Ma" gomb:** Megjelenik történelmi nézetben, visszaugrik a mai napra
- Fallback: Ha nincs history API, jobs-ból számolja ki az adatokat

## V3.3 - Naptár modul átdolgozás (2025-03-25)

### ✅ Naptár munkásonkénti oszlopnézet
- **Napi nézetben** új "Standard" és "Munkások" nézet váltó
- **Munkások nézet:** Minden dolgozónak külön oszlop
- "Nincs hozzárendelve" oszlop narancssárga háttérrel

### ✅ Naptár mobil nézet javítás
- **Heti nézet:** Kártya alapú elrendezés minden napra
- **Havi nézet:** Kompakt rács zöld pontokkal

### ✅ Dashboard "Hozzárendelésre vár" javítás
- Képfeltöltés gomb minden job card-nál
- Teljes státusz kezelés (Indít, Nem jött, Lemondta, Készpénz, Kártya)

## V3.2 - Korábbi fejlesztések (2025-03-25)
- Időblokkolás logika (dolgozó foglaltság alapú slot blokkolás)
- Új ügyfél felvitel a Dashboard-ról
- Akciók kezelése admin felületen
- Dashboard dolgozónkénti nézet
- Cloudinary képfeltöltés integráció

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
- [ ] Pénztár - Készpénz kivétel funkció
- [ ] Pénztár - Nap nyitás/zárás fejlesztés
- [ ] Jelenléti rendszer - Be/kilépés funkció

## P1 - Közepes prioritás  
- [ ] Munkások - Havi jelenléti PDF riport
- [ ] Betegszabadság/szabadság napok kezelése
- [ ] Statisztikák - További mobil UI javítások

## P2 - Későbbi fejlesztés
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)
- [ ] Kedvezmények rendszer

## Changelog
- 2025-03-25: V3.4 - Munkások műszakszerkesztés, Statisztika history nézet
- 2025-03-25: V3.3 - Naptár munkásonkénti oszlopnézet, mobil nézet javítás
- 2025-03-25: V3.2 - Időblokkolás, Új ügyfél, Dashboard javítások
- 2025-03-25: V3.1 - Cloudinary integráció
- 2025-03-25: V3.0 - Teljesen új BookingPage
