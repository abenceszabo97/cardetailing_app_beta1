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

### V2.1 - Felhasználónév/Jelszó auth (2025-12-20)
- **✅ Felhasználónév + Jelszó bejelentkezés**: Google Auth lecserélve
  - Admin hozhat létre új felhasználókat
  - Jelszó visszaállítás admin által
  - Felhasználó aktiválás/deaktiválás
- **✅ Két autó foglalása egymás után**: Minden ügyfélnek elérhető
- **✅ Push értesítések bővítve**: Módosítás és státusz változáskor
- **✅ AI komponensek frontend**: Upsell, fotó elemzés, árajánlat komponensek
- **✅ server.py refaktorálás kész** (routes/, models/ moduláris struktúra)

### V2.2 - Dolgozó megjelenítés és ebédszünet (2025-12-20)
- **✅ Dolgozó név megjelenítése**: Dashboard "Mai munkák" és Naptár nézetben kiemelt dolgozó badge
- **✅ Ebédszünet felvitele műszakhoz**: Kezdete/Vége időpontok, megjelenítés a naptárban
- **✅ Settings menüpont mindenki számára**: Profil és jelszóváltás minden felhasználónak elérhető

### V2.3 - Frontend refaktorálás és mobiloptimalizálás (2025-12-20)
- **✅ Frontend szétválasztás két alkalmazásra**:
  - `/app/frontend-admin` - Admin dashboard (védett útvonalak)
  - `/app/frontend-booking` - Publikus foglalási oldal (auth nélkül)
- **✅ Céglogó hozzáadva**: Login és Booking oldalon, zöld háttérrel
- **✅ Teljes mobil reszponzivitás**: Minden admin oldal optimalizálva mobilra és tabletre
  - Dashboard: 2 oszlopos KPI kártyák mobilon
  - Naptár: Kompakt szűrők, kisebb gombok
  - Workers, Statistics, Inventory, Services, DayManagement, Settings: Mind reszponzív
  - CustomerDetail: Mobil-barát kártya elrendezés
  - Booking: Skálázódó lépések, naptár, időpontok

### V2.4 - AI Chatbot (2025-12-20)
- **✅ AI Chatbot hozzáadva a foglalási oldalhoz**
  - Lebegő chat gomb jobb alsó sarokban
  - Valós idejű beszélgetés a Gemini AI-val
  - Szolgáltatásokról, árakról, nyitvatartásról informál
  - Gyors kérdés gombok (Szolgáltatások, Árak, Nyitvatartás, Foglalás)
  - Session kezelés a folyamatos beszélgetéshez

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

## Befejezett feladatok
- [x] Foglalás módosítás funkció (naptárban szerkesztés)
- [x] Blacklist/tiltólista kezelés
- [x] Budapest eltávolítása
- [x] Teszt adatok törlése
- [x] server.py refaktorálás (2255 sor → moduláris struktúra)
- [x] Felhasználónév/jelszó bejelentkezés
- [x] Két autó foglalása egymás után
- [x] Push értesítések (módosítás, státusz változás)
- [x] AI komponensek frontend
- [x] Dolgozó megjelenítés dashboard és naptárban
- [x] Ebédszünet felvitele műszakhoz
- [x] Settings mindenki számára elérhető
- [x] AI Chatbot a foglalási oldalon

## P0 - Következő iteráció (Kiemelt prioritás)
- [ ] Google Naptár integráció - Foglalások automatikus szinkronizálása
- [ ] Foglalás megerősítő automatikus email küldés (Resend API kulcs szükséges)

## P1 - Közepes prioritás  
- [ ] Számlázás integráció (pl. Billingo, számlázz.hu)
- [ ] E-nyugta integráció
- [ ] Elkészült autó SMS értesítés (Twilio API kulcs szükséges)

## P2 - Későbbi fejlesztés
- [ ] Automatikus PDF napzárás és email küldés
- [ ] AI Marketing (SMS/email emlékeztetők, kuponok, hűségprogram)
- [ ] AI Analytics

## P3 - Backlog
- [ ] Twilio API kulcsok konfigurálása az SMS küldéshez
- [ ] Resend API kulcs konfigurálása az email küldéshez

## Fájl struktúra
```
/app/backend/                 # Változatlan - közös API
├── main.py                   # Entry point
├── config.py                 # Konfiguráció + JWT settings
├── database.py               # MongoDB kapcsolat
├── dependencies.py           # Auth (JWT decode)
├── models/                   # Pydantic modellek
├── routes/                   # API végpontok

/app/frontend/                # Eredeti (referencia)

/app/frontend-admin/          # Admin Dashboard App (V2.3)
├── src/
│   ├── App.js               # Admin routing (védett útvonalak)
│   ├── pages/
│   │   ├── Login.jsx        # Admin bejelentkezés
│   │   ├── Dashboard.jsx    # Főoldal
│   │   ├── Calendar.jsx     # Naptár
│   │   ├── Customers.jsx    # Ügyfelek
│   │   ├── Workers.jsx      # Dolgozók + műszakok
│   │   ├── Inventory.jsx    # Készlet
│   │   ├── Statistics.jsx   # Statisztikák
│   │   ├── Services.jsx     # Szolgáltatások
│   │   ├── DayManagement.jsx# Napnyitás/zárás
│   │   └── Settings.jsx     # Beállítások
│   └── components/
│       ├── Sidebar.jsx      # Navigáció
│       └── NotificationBell.jsx

/app/frontend-booking/        # Publikus Foglalási App (V2.3)
├── src/
│   ├── App.js               # Publikus routing (auth nélkül)
│   ├── pages/
│   │   └── BookingPage.jsx  # 4 lépéses foglalási wizard
│   └── components/
│       └── AIComponents.jsx # AI ajánlások
```

## Fontos megjegyzések
- **Emergent LLM Key egyenleg**: 24.95 USD (feltöltve)
- **Admin credentials**: admin / admin123
- **Felhasználó kezelés**: Settings oldalon (/settings) admin jogosultsággal

## Changelog
- 2025-12-20: V2.4 - AI Chatbot hozzáadva a foglalási oldalhoz
- 2025-12-20: V2.3 - Frontend refaktorálás: Admin és Booking app szétválasztása, teljes mobil reszponzivitás
- 2025-12-20: V2.2 - Dolgozó megjelenítés, ebédszünet, Settings mindenki számára
- 2025-12-20: V2.1 - Username/password auth, two car booking, notifications, AI frontend
- 2025-12-19: Server.py refactor, data cleanup, Budapest removed
- 2025-12-16: V2 - Booking system, notifications, blacklist, AI backend
