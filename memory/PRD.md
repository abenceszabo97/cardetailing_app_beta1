# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## V3.8 - Legacy kép megjelenítési javítás (2025-03-25)

### ✅ Legacy képek bug javítása
- **Probléma**: A régi képek (MongoDB-ben base64 formátumban tárolva) nem jelenítettek meg előnézetet és nem nyíltak meg teljes képernyőn
- **Gyökér ok**: A backend `'data'` mezőt keresett, de az adatbázisban `'data_url'` mező volt (data URL formátum: `data:image/png;base64,...`)
- **Javítás**: A `misc.py` `get_image` endpoint most mindkét formátumot kezeli
- **Tesztelve**: Backend és frontend tesztek 100% sikeresek

### Képkezelés összefoglaló
- **Régi képek**: `/api/images/img_xxx` URL → MongoDB `images` collection-ből base64 → image response
- **Új képek**: Cloudinary-ba töltődnek → `https://res.cloudinary.com/...` URL-t kapnak

## V3.7 - Mai fejlesztések (2025-03-25)

### ✅ Jelenléti PDF generálás
- **Jelenléti ív** gomb a Statisztika tab-on (zöld gomb)
- Részletes riport dolgozónként: dátum, nap, kezdés-befejezés, órák, típus
- Összesítés: munkanapok, szabadság, betegszabadság
- Backend: `GET /api/shifts/attendance-report?month=YYYY-MM`

### ✅ Szabadság/Betegszabadság kezelés
- Műszak típus választó: Munkanap / Szabadság / Betegszabadság
- Mind az új műszak, mind a szerkesztés dialógusban elérhető
- Szabadságnál nincs ebédszünet mező
- Backend: `GET /api/shifts/leave-stats` - éves statisztikák

### ✅ Naptár átláthatóbbá tétele
- **Havi nézet:** Tiszta cellák, foglalások száma badge-ben
- Foglalások bal oldali színes csíkkal (státusz szerint)
- Napra kattintva napi nézetre vált
- **Heti nézet:** Egyszerűsített megjelenés, max 2 foglalás/slot
- **Mobil nézet:** Napi kártyák foglalás részletekkel

### ✅ Nap zárás riport bővítése
- Pénzforgalom összesítő: Nyitó + Bevétel - Kivételek = Várható záró
- Készpénz kivételek részletezése: időpont, indoklás, személy, összeg
- Elkészült munkák táblázat: rendszám, szolgáltatás, dolgozó, fizetés
- Lemondott/Nem jelent meg munkák listája

## Korábbi verziók
- V3.6: Pénztár funkciók (készpénz kivétel, előző nap egyenlege)
- V3.5: Munkások műszakszerkesztés, Statisztika history
- V3.4: Naptár munkásonkénti oszlopnézet
- V3.3-V3.0: Booking page, Dashboard, Cloudinary

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)
- **PDF**: jsPDF + jspdf-autotable

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## P1 - Közepes prioritás (Következő feladatok)
- [ ] Google Naptár integráció
- [ ] Billingo számlázás integráció
- [ ] SMS értesítések (Twilio)
- [ ] Kedvezmények rendszer

## Changelog
- 2025-03-25: V3.8 - Legacy képek megjelenítési bug javítása (misc.py data/data_url kezelés)
- 2025-03-25: V3.7 - Jelenléti PDF, Szabadság kezelés, Naptár javítás, Nap zárás riport
- 2025-03-25: V3.6 - Pénztár funkciók
- 2025-03-25: V3.5 - Műszakszerkesztés, Statisztika history
- 2025-03-25: V3.4 - Naptár oszlopnézet
