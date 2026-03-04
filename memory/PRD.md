# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva ✅
- **Dashboard**: KPI kártyák (napi/havi autók, **készpénz/kártya bontás**), napi munkák lista státusz színezéssel, havi grafikon
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD műveletek
- **Dolgozók beosztása**: **Heti ÉS havi naptár nézet**, műszak kezelés
- **Készlet kezelés**: Termékek táblázat, alacsony készlet figyelmeztetés (piros)
- **Statisztika**: Napi/havi grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, telephely bontás
- **Szolgáltatások**: Teljes X-CLEAN árlista (Eco, Pro, VIP csomagok), CRUD admin számára
- **Napnyitás/Napzárás**: Nyitó egyenleg, napi összesítő, készpénz/kártya bevétel
- **Beállítások**: Felhasználók kezelése (Admin/Dolgozó), dolgozók CRUD
- **Munkákhoz képek**: **Előtte/utána képek csatolása URL-lel**

### Státusz színek
- Kész: Zöld
- Folyamatban: Narancs  
- Foglalt: Piros

### Telephely szűrés
- Budapest
- Debrecen
- Összes

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts
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
- `/api/shifts/*` - Műszakok
- `/api/inventory/*` - Készlet
- `/api/day-records/*` - Napnyitás/zárás
- `/api/stats/*` - Statisztikák (készpénz/kártya bontással)

## Implementáció dátuma
2025. március 4.

## Javított hibák (2. iteráció)
- [x] Napzárás gomb működik
- [x] Szolgáltatás hozzáadás működik
- [x] Havi naptár nézet dolgozóknak
- [x] Előtte/utána képek munkákhoz
- [x] Készpénz/kártya bontás dashboard KPI-okon

## P0 - Megvalósítva
- [x] Google OAuth bejelentkezés
- [x] Dashboard KPI-ok és napi munkák
- [x] Teljes CRUD minden entitásra
- [x] Statisztika grafikonok
- [x] Telephely szűrés
- [x] Készpénz/kártya bontás
- [x] Havi naptár nézet

## P1 - Következő iteráció
- [ ] Push értesítések alacsony készletről
- [ ] PDF export statisztikákhoz
- [ ] Ügyfél SMS értesítés munka elkészüléséről
- [ ] Képfeltöltés közvetlenül (nem csak URL)

## P2 - Későbbi fejlesztés
- [ ] Időpontfoglalás publikus felület
- [ ] Hűségprogram integráció
- [ ] Többnyelvű támogatás
