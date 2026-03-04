# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika (Statisztika oldalon)**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként, bevétel telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD műveletek
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely), táblázatos megjelenítés - **mindenki számára elérhető**
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés - **mindenki számára elérhető**
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés, telephely szűrés - **mindenki számára elérhető**
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, telephely bontás, PDF export, haladó analitika
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - **mindenki számára elérhető**
- **Napnyitás/Napzárás**: Nyitó egyenleg, napi összesítő, készpénz/kártya bevétel, zárási megjegyzés - **mindenki számára elérhető**
- **Beállítások**: Felhasználók kezelése (csak admin)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz, teljes méretű megtekintés, közvetlen fájlfeltöltés
- **Telephely szűrés**: Budapest, Debrecen, Összes

## Jogosultságok
- **Összes CRUD művelet** (szolgáltatások, készlet, dolgozók, műszakok, napnyitás/zárás): mindenki számára elérhető
- **Csak admin**: Felhasználók kezelése (Settings), ügyfél törlés

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth

## API Endpoints
- `/api/auth/*` - Hitelesítés (session, me, logout)
- `/api/customers/*` - Ügyfelek CRUD
- `/api/services/*` - Szolgáltatások CRUD (mindenki)
- `/api/workers/*` - Dolgozók CRUD (mindenki)
- `/api/jobs/*` - Munkák CRUD (mindenki)
- `/api/shifts/*` - Műszakok CRUD (mindenki)
- `/api/inventory/*` - Készlet CRUD (mindenki)
- `/api/day-records/*` - Napnyitás/zárás (mindenki)
- `/api/stats/*` - Dashboard, daily, monthly, workers, services, locations, advanced
- `/api/upload` - Képfeltöltés

## Tesztelési állapot
- 5. iteráció: Backend 100% (24/24), Frontend 100%
- Utolsó teszt: 2026. március 4.

## P1 - Következő iteráció
- [ ] Push értesítések alacsony készletről
- [ ] Ügyfél SMS értesítés munka elkészüléséről
- [ ] Publikus időpontfoglalási felület
- [ ] PDF export számlákhoz

## P2 - Későbbi fejlesztés
- [ ] Hűségprogram integráció
- [ ] Többnyelvű támogatás
- [ ] Mobilalkalmazás
