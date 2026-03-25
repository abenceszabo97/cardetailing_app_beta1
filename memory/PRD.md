# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.3 - Naptár modul átdolgozás (2025-03-25)

### ✅ Naptár munkásonkénti oszlopnézet
- **Napi nézetben** új "Standard" és "Munkások" nézet váltó
- **Munkások nézet:** Minden dolgozónak külön oszlop
- "Nincs hozzárendelve" oszlop is megjelenik narancssárgán
- Színes oszlopfejlécek (kék, lila, zöld, narancs, stb.)
- Vízszintesen görgethető ha sok dolgozó van

### ✅ Naptár mobil nézet javítás
- **Heti nézet:** Kártya alapú elrendezés minden napra
- Napok neve és dátuma jól látható
- Foglalások száma badge-ben megjelenik
- "Nincs foglalás" üzenet ha üres a nap
- **Havi nézet:** Kompakt rács zöld pontokkal
- Kattintásra napi nézetre vált

### ✅ Dashboard "Hozzárendelésre vár" javítás
- Képfeltöltés gomb minden job card-nál
- Teljes státusz kezelés (Indít, Nem jött, Lemondta, Készpénz, Kártya)
- Autó típus és telefon megjelenítés

## V3.2 - Időblokkolás és Új Ügyfél (2025-03-25)

### ✅ Időblokkolás logika
- **Dolgozó foglaltság alapú slot blokkolás**
- Ha egy dolgozó 2 órás munkát végez 08:00-kor, akkor 08:00-10:00 között nem foglalható más munkára
- A booking oldal automatikusan elküldi a szolgáltatás időtartamát
- API: `/api/bookings/available-slots?location=X&date=Y&duration=Z`

### ✅ Új ügyfél felvitel a Dashboard-ról
- **Új munka dialógban:** "Ügyfél" mező melletti **"+ Új ügyfél"** gomb
- Kattintásra megjelenik az új ügyfél form
- Az új ügyfél automatikusan létrejön a munka mentésekor

### ✅ Akciók kezelése admin felületen
- Szolgáltatások oldalon "Akciók" fül
- Új akció létrehozása, szerkesztése, törlése
- Akciók megjelennek a foglalási oldalon

### ✅ Dashboard dolgozónkénti nézet
- 2 dolgozó oszlop
- Új státuszok: "Nem jött el", "Lemondta"
- Fizetési mód megjelenítés

### ✅ Cloudinary integráció
- Képek felhő tárolása
- Cloudinary signed upload

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)
- **Deployment**: Railway (backend), Vercel (frontend)

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## P0 - Következő teendők (Mai napi feladatok)
- [ ] Munkások modul - Műszak kezelés
- [ ] Munkások modul - Jelenléti rendszer
- [ ] Statisztikák mobil UI javítás
- [ ] Pénztár - Készpénz kivétel funkció

## P1 - Közepes prioritás  
- [ ] Munkások - Havi jelenléti PDF riport
- [ ] Statisztikák - Korábbi napok megtekintése
- [ ] Nap nyitás/zárás fejlesztés

## P2 - Későbbi fejlesztés
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)
- [ ] Kedvezmények rendszer

## Changelog
- 2025-03-25: V3.3 - Naptár munkásonkénti oszlopnézet, mobil nézet javítás
- 2025-03-25: Dashboard "Hozzárendelésre vár" javítás (képek, státuszok)
- 2025-03-25: V3.2 - Időblokkolás logika, Új ügyfél felvitel Dashboard-ról
- 2025-03-25: Akciók admin kezelése
- 2025-03-25: V3.1 - Dashboard dolgozónkénti nézet, Cloudinary
- 2025-03-25: V3.0 - Teljesen új BookingPage
