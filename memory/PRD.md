# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.2 - Időblokkolás és Új Ügyfél (2025-03-25)

### ✅ Időblokkolás logika
- **Dolgozó foglaltság alapú slot blokkolás**
- Ha egy dolgozó 2 órás munkát végez 08:00-kor, akkor 08:00-10:00 között nem foglalható más munkára
- A booking oldal automatikusan elküldi a szolgáltatás időtartamát
- Csak azok a slotok elérhetők, ahol a teljes szolgáltatás időtartama belefér
- API: `/api/bookings/available-slots?location=X&date=Y&duration=Z`

### ✅ Új ügyfél felvitel a Dashboard-ról
- **Új munka dialógban:** "Ügyfél" mező melletti **"+ Új ügyfél"** gomb
- Kattintásra megjelenik az új ügyfél form:
  - Név * (kötelező)
  - Rendszám * (kötelező, automatikus nagybetűs)
  - Telefon
  - Email
  - Autó típusa
- **"← Meglévő ügyfél"** gomb a visszaváltáshoz
- Ügyfél kereső: "Keresés név vagy rendszám alapján..."
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
- [ ] Railway deploy az új kóddal (időblokkolás, új ügyfél)
- [ ] Vercel deploy frissítés (frontend-admin, frontend-booking)

## P1 - Közepes prioritás  
- [ ] Google Naptár integráció
- [ ] Számlázás integráció (Billingo)
- [ ] SMS értesítés (Twilio)

## P2 - Későbbi fejlesztés
- [ ] Kedvezmények rendszer
- [ ] Jelenléti rendszer
- [ ] Naptár mobil nézet javítás

## Changelog
- 2025-03-25: V3.2 - Időblokkolás logika, Új ügyfél felvitel Dashboard-ról
- 2025-03-25: Akciók admin kezelése
- 2025-03-25: V3.1 - Dashboard dolgozónkénti nézet, Cloudinary
- 2025-03-25: V3.0 - Teljesen új BookingPage
