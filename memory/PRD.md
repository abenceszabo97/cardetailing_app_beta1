# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Budapest és Debrecen telephelyek számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika (Statisztika oldalon)**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként, bevétel telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD műveletek
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely) - mindenki számára elérhető
- **Dolgozói havi statisztika**: Ledolgozott napok, ledolgozott órák, elkészített autók száma, bevétel - hónapra szűrhető
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés - mindenki számára elérhető
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés - mindenki számára elérhető
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, haladó analitika, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - mindenki számára elérhető
- **Napnyitás/Napzárás**: Nyitó egyenleg, napi összesítő, napzárás utáni újranyitás - mindenki számára elérhető
- **Beállítások**: Felhasználók kezelése (csak admin)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz, fájlfeltöltés
- **Telephely szűrés**: Budapest, Debrecen, Összes

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth

## Tesztelési állapot
- 6. iteráció: Backend 100%, Frontend 100%
- Utolsó teszt: 2026. március 4.

## P0 - Következő iteráció (felhasználó kérte)
- [ ] Push értesítések alacsony készletről
- [ ] PDF számla export (helyi letöltés + email küldés)
- [ ] Ügyfél SMS értesítés munka elkészüléséről (Twilio)

## P1 - Későbbi fejlesztés
- [ ] Publikus időpontfoglalási felület
- [ ] Hűségprogram integráció
- [ ] Többnyelvű támogatás
- [ ] Mobilalkalmazás
