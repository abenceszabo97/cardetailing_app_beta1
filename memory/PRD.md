# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva ✅
- **Dashboard**: KPI kártyák (napi/havi autók, **készpénz/kártya bontás**), napi munkák lista státusz színezéssel, havi grafikon
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD műveletek
- **Dolgozók beosztása**: **Heti ÉS havi naptár nézet**, műszak kezelés (hozzáadás, törlés)
- **Készlet kezelés**: Termékek táblázat, **teljes CRUD (hozzáadás, szerkesztés, törlés)**, alacsony készlet figyelmeztetés
- **Statisztika**: Napi/havi grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, telephely bontás, **PDF export**
- **Szolgáltatások**: Teljes X-CLEAN árlista, **teljes CRUD (hozzáadás, szerkesztés, törlés)**
- **Napnyitás/Napzárás**: Nyitó egyenleg, napi összesítő, készpénz/kártya bevétel
- **Beállítások**: Felhasználók kezelése (Admin/Dolgozó), dolgozók CRUD
- **Munkákhoz képek**: **Közvetlen képfeltöltés** előtte/utána (nem csak URL)

### Státusz színek
- Kész: Zöld
- Folyamatban: Narancs  
- Foglalt: Piros

### Telephely szűrés
- Budapest
- Debrecen
- Összes

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth

## User Personas
1. **Admin**: Teljes hozzáférés minden funkcióhoz, dolgozók és szolgáltatások kezelése
2. **Dolgozó**: Csak saját munkák megtekintése, státusz frissítés

## API Endpoints
- `/api/auth/*` - Hitelesítés
- `/api/customers/*` - Ügyfelek CRUD
- `/api/services/*` - Szolgáltatások CRUD
- `/api/workers/*` - Dolgozók CRUD
- `/api/jobs/*` - Munkák CRUD (képekkel)
- `/api/shifts/*` - Műszakok CRUD
- `/api/inventory/*` - Készlet CRUD
- `/api/day-records/*` - Napnyitás/zárás
- `/api/stats/*` - Statisztikák (készpénz/kártya bontással)
- `/api/upload` - Képfeltöltés

## Implementáció dátuma
2025. március 4.

## Legutóbbi frissítések (3. iteráció)
- [x] Közvetlen képfeltöltés (nem csak URL)
- [x] Készlet teljes CRUD (hozzáadás, szerkesztés, törlés)
- [x] Szolgáltatások teljes CRUD
- [x] PDF export statisztikákhoz
- [x] Műszak hozzáadás/törlés naptárban

## P0 - Megvalósítva
- [x] Google OAuth bejelentkezés
- [x] Dashboard KPI-ok és napi munkák
- [x] Teljes CRUD minden entitásra
- [x] Statisztika grafikonok + PDF export
- [x] Telephely szűrés
- [x] Készpénz/kártya bontás
- [x] Havi naptár nézet
- [x] Képfeltöltés

## P1 - Következő iteráció
- [ ] Push értesítések alacsony készletről
- [ ] Ügyfél SMS értesítés munka elkészüléséről
- [ ] Időpontfoglalás publikus felület

## P2 - Későbbi fejlesztés
- [ ] Hűségprogram integráció
- [ ] Többnyelvű támogatás
- [ ] Mobilalkalmazás
