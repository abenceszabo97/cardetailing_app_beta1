# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika (Statisztika oldalon)**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként/telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely) - mindenki számára
- **Dolgozói havi statisztika**: Ledolgozott napok/órák, elkészített autók, bevétel - hónapra szűrhető + PDF export + email küldés
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés - mindenki számára
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés - mindenki számára
- **Készlet figyelmeztetések**: Értesítési harang a headerben, alacsony készlet push értesítés valós időben
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, haladó analitika, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - mindenki számára
- **Napnyitás/Napzárás**: Teljes flow + PDF export + email küldés, lezárt nap utáni újranyitás
- **Beállítások**: Felhasználók kezelése (csak admin)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz
- **Telephely szűrés**: Budapest, Debrecen, Összes

### V2 Funkciók - Megvalósítva (2025-12-16)
- **Publikus foglalási oldal** (`/booking`): 4 lépéses wizard bejelentkezés nélkül
  - Lépés 1: Telephely és szolgáltatás választás
  - Lépés 2: Dátum és időpont választás szabad dolgozókkal
  - Lépés 3: Személyes adatok (név, autó, rendszám, email, telefon) + opcionális számlázási adatok
  - Lépés 4: Összegzés és foglalás véglegesítése
  - Visszaigazoló képernyő foglalás után
  - **Rendszám alapú gyors foglalás**: Visszatérő ügyfelek rendszám megadásával automatikusan betöltik korábbi adataikat
  - **VIP státusz**: 5+ sikeres mosás után VIP badge jelenik meg
- **Foglalási naptár** (`/calendar`): Napi/heti/havi nézet foglalások kezelésére
  - Telephely és dolgozó szűrés
  - Foglalás részletek megtekintése
  - Státusz módosítás (foglalt, folyamatban, kész, lemondta, nem jött el)
  - Dolgozó hozzárendelés
- **Új API végpontok**:
  - `GET /api/bookings/public-locations` - Telephelyek (publikus)
  - `GET /api/bookings/public-services` - Szolgáltatások (publikus)
  - `GET /api/bookings/available-slots` - Szabad időpontok (publikus)
  - `GET /api/bookings/lookup-plate/{plate}` - Ügyfél keresés rendszám alapján (publikus)
  - `POST /api/bookings` - Új foglalás (publikus)
  - `GET/PUT/DELETE /api/bookings` - Foglalások kezelése (védett)

### Implementálva de API kulcsok szükségesek
- **SMS értesítés (Twilio)**: Ügyfél értesítés munka elkészüléséről - szükséges: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- **Email küldés (Resend)**: PDF riportok és foglalás visszaigazolás emailben - szükséges: RESEND_API_KEY

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic, Twilio, Resend
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth

## Tesztelési állapot
- 8. iteráció: Backend 100% (19/19), Frontend 100%
- Utolsó teszt: 2025. december 16.

## P0 - Következő iteráció (Kiemelt prioritás)
- [ ] Foglalás módosítás funkció
- [ ] Automatikus PDF napzárás és email küldés
- [ ] Ügyfél történet (foglalások, lemondások, nem jelenések száma)
- [ ] Blacklist kezelés

## P1 - Közepes prioritás
- [ ] Google Calendar integráció
- [ ] AI fotó elemzés (Gemini) - árajánlat és szolgáltatás ajánlás
- [ ] Időbecslés és upsell AI

## P2 - Későbbi fejlesztés
- [ ] AI Marketing (SMS/email emlékeztetők, kuponok, hűségprogram)
- [ ] AI Chat asszisztens
- [ ] AI Analytics
- [ ] Globális telephely szűrő a headerben

## P3 - Backlog
- [ ] Twilio API kulcsok konfigurálása az SMS küldéshez
- [ ] Resend API kulcs konfigurálása az email küldéshez
- [ ] server.py refaktorálás (routes/, models/ mappák)

## Fájl struktúra
```
/app/
├── backend/
│   ├── server.py          # Fő API (1700+ sor)
│   ├── .env               # MONGO_URL, TWILIO, RESEND, GEMINI
│   └── requirements.txt
├── frontend/src/
│   ├── pages/
│   │   ├── BookingPage.jsx   # Publikus foglalás
│   │   ├── Calendar.jsx      # Foglalási naptár
│   │   ├── Dashboard.jsx
│   │   ├── Customers.jsx
│   │   ├── Workers.jsx
│   │   └── ...
│   └── components/
│       ├── Sidebar.jsx
│       └── ui/
└── memory/PRD.md
```
