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
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés - mindenki számára
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés - mindenki számára
- **Készlet figyelmeztetések**: Értesítési harang a headerben, alacsony készlet push értesítés valós időben
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, haladó analitika, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - mindenki számára
- **Napnyitás/Napzárás**: Teljes flow + PDF export + email küldés, lezárt nap utáni újranyitás, pénzelvitel, kasszaellenőrzés
- **Beállítások**: Felhasználók kezelése (csak admin)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz
- **Telephely**: Csak Debrecen (Budapest eltávolítva)

### V2 Funkciók (2025-12-16)
- **Publikus foglalási oldal** (`/booking`): 4 lépéses wizard bejelentkezés nélkül
  - Lépés 1: Telephely és szolgáltatás választás (kategória szűréssel)
  - Lépés 2: **Naptár szerű időpont választás** - heti nézet, vizuális szabad/foglalt jelzés
  - Lépés 3: Személyes adatok + gyors rendszám keresés + **Második autó opció**
  - Lépés 4: Összegzés és foglalás véglegesítése
  - **Rendszám alapú gyors foglalás**: Visszatérő ügyfelek automatikus adatbetöltés
  - **VIP státusz**: 5+ sikeres mosás után VIP badge
- **Foglalási értesítések**: Új foglaláskor, módosításkor, státusz változáskor automatikus push értesítés
- **Foglalási naptár** (`/calendar`): Napi/heti/havi nézet foglalások kezelésére, foglalás módosítás
- **Blacklist/tiltólista**: Problémás ügyfelek kezelése rendszám alapján
- **AI Backend végpontok**: Upsell, fotó elemzés, árajánlat (Gemini) - backend kész

### V2.1 - Új funkciók (2025-12-20)
- **✅ Felhasználónév + Jelszó bejelentkezés**: Google Auth lecserélve
  - Admin hozhat létre új felhasználókat
  - Jelszó visszaállítás admin által
  - Felhasználó aktiválás/deaktiválás
- **✅ Két autó foglalása egymás után**: Minden ügyfélnek elérhető
  - Második autó adatai (rendszám, típus, szolgáltatás)
  - Automatikusan az első autó utáni időpontra foglalja
  - Összevont összegzés a 4. lépésben
- **✅ Push értesítések bővítve**:
  - Foglalás módosításkor (dátum/időpont változás)
  - Státusz változáskor (foglalt → folyamatban → kész → lemondta)
- **✅ AI komponensek frontend**: Upsell, fotó elemzés, árajánlat komponensek
- **✅ server.py refaktorálás kész** (routes/, models/ moduláris struktúra)

### Implementálva de API kulcsok szükségesek
- **SMS értesítés (Twilio)**: Ügyfél értesítés munka elkészüléséről
- **Email küldés (Resend)**: PDF riportok és foglalás visszaigazolás emailben

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic, bcrypt, python-jose (JWT)
- **Database**: MongoDB
- **Auth**: Felhasználónév + Jelszó (JWT tokens, bcrypt hash)
- **Deployment**: Railway-ready (Procfile, railway.json)

## Tesztelési állapot
- 9. iteráció: Backend 100% (12/12), Frontend 100%
- Utolsó teszt: 2025. december 20.
- Teszt credentials: admin / admin123

## Befejezett feladatok (P0) 
- [x] Foglalás módosítás funkció (naptárban szerkesztés)
- [x] Blacklist/tiltólista kezelés
- [x] Budapest eltávolítása
- [x] Teszt adatok törlése
- [x] server.py refaktorálás (2255 sor → moduláris struktúra)
- [x] Felhasználónév/jelszó bejelentkezés
- [x] Két autó foglalása egymás után
- [x] Push értesítések (módosítás, státusz változás)
- [x] AI komponensek frontend

## P0 - Következő iteráció (Kiemelt prioritás)
- [ ] Google Calendar integráció
- [ ] Automatikus PDF napzárás és email küldés
- [ ] Elkészült autó SMS értesítés (Twilio API kulcs szükséges)
- [ ] Foglalás visszaigazoló email (Resend API kulcs szükséges)

## P1 - Közepes prioritás
- [ ] AI ügyfélszolgálati chatbot

## P2 - Későbbi fejlesztés
- [ ] AI Marketing (SMS/email emlékeztetők, kuponok, hűségprogram)
- [ ] AI Analytics

## P3 - Backlog
- [ ] Twilio API kulcsok konfigurálása az SMS küldéshez
- [ ] Resend API kulcs konfigurálása az email küldéshez

## Fájl struktúra (Refaktorálva 2025-12-19)
```
/app/backend/
├── server.py          # Entry point (64 sor)
├── config.py          # Konfiguráció + JWT settings
├── database.py        # MongoDB kapcsolat
├── dependencies.py    # Auth (JWT decode)
├── models/            # Pydantic modellek (11 fájl)
│   ├── user.py        # username, password_hash, active
│   ├── booking.py     # + second_car field
│   └── ...
├── routes/            # API útvonalak (15 fájl)
│   ├── auth.py        # login, create-user, reset-password
│   ├── bookings.py    # + notifications on status/date change
│   └── ...
└── tests/

/app/frontend/src/
├── pages/
│   ├── Login.jsx      # Username/password form
│   ├── Settings.jsx   # User management (create, reset pwd)
│   ├── BookingPage.jsx # + Second car option
│   └── ...
├── components/
│   ├── AIComponents.jsx # Upsell, PhotoAnalysis, QuoteGenerator
│   └── ...
```

## Fontos megjegyzések
- **Emergent LLM Key egyenleg kimerült**: Az AI funkciók nem működnek, amíg nem töltöd fel az egyenleget a Profil → Universal Key → Add Balance menüpontban.
- **Admin credentials**: admin / admin123
- **Felhasználó kezelés**: Settings oldalon (/settings) admin jogosultsággal

## Changelog
- 2025-12-20: V2.1 - Username/password auth, two car booking, notifications, AI frontend
- 2025-12-19: Server.py refactor, data cleanup, Budapest removed
- 2025-12-16: V2 - Booking system, notifications, blacklist, AI backend
