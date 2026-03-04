# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként, bevétel telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD műveletek
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely), táblázatos megjelenítés
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés, telephely szűrés
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, telephely bontás, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD
- **Napnyitás/Napzárás**: Nyitó egyenleg, napi összesítő, készpénz/kártya bevétel, zárási megjegyzés
- **Beállítások**: Felhasználók kezelése (Admin/Dolgozó)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz, teljes méretű megtekintés, közvetlen fájlfeltöltés
- **Telephely szűrés**: Budapest, Debrecen, Összes

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth

## User Personas
1. **Admin**: Teljes hozzáférés minden funkcióhoz
2. **Dolgozó**: Csak saját munkák megtekintése, státusz frissítés

## API Endpoints
- `/api/auth/*` - Hitelesítés (session, me, logout)
- `/api/customers/*` - Ügyfelek CRUD
- `/api/services/*` - Szolgáltatások CRUD
- `/api/workers/*` - Dolgozók CRUD
- `/api/jobs/*` - Munkák CRUD (képekkel)
- `/api/shifts/*` - Műszakok CRUD
- `/api/inventory/*` - Készlet CRUD
- `/api/day-records/*` - Napnyitás/zárás (open, close, today)
- `/api/stats/*` - Dashboard, daily, monthly, workers, services, locations, advanced
- `/api/upload` - Képfeltöltés
- `/api/seed` - Kezdeti adatok

## P0 - Megvalósítva
- [x] Google OAuth bejelentkezés
- [x] Dashboard KPI-ok és napi munkák
- [x] Haladó analitika (átl. bevétel/autó, visszatérő ügyfelek, TOP 10, havi összehasonlítás)
- [x] Bevétel dolgozónként és telephelyenként
- [x] Teljes CRUD minden entitásra (szolgáltatások, készlet, dolgozók, műszakok)
- [x] Napnyitás/Napzárás teljes flow
- [x] Statisztika grafikonok + PDF export
- [x] Telephely szűrés minden oldalon
- [x] Készpénz/kártya bontás
- [x] Előtte/utána képgaléria (max 9-9 kép, fájlfeltöltés)

## P1 - Következő iteráció
- [ ] Push értesítések alacsony készletről
- [ ] Ügyfél SMS értesítés munka elkészüléséről
- [ ] Publikus időpontfoglalási felület
- [ ] PDF export számlákhoz

## P2 - Későbbi fejlesztés
- [ ] Hűségprogram integráció
- [ ] Többnyelvű támogatás
- [ ] Mobilalkalmazás

## Tesztelési állapot
- 4. iteráció: Backend 100% (30/30), Frontend 100%
- Utolsó teszt: 2026. március 4.
