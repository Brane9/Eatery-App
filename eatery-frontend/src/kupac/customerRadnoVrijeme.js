function parseMinutes(hhmm) {
    if (!hhmm) return null;
    const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

export function formatRadnoVrijeme(od, doV) {
    if (!od && !doV) return '';
    return `${od || '—'} – ${doV || '—'}`;
}

export function jeOtvoreno(od, doV, now = new Date()) {
    const from = parseMinutes(od);
    const to = parseMinutes(doV);
    if (from == null || to == null) return null;
    const cur = now.getHours() * 60 + now.getMinutes();
    if (from === to) return true;
    if (from < to) return cur >= from && cur < to;
    return cur >= from || cur < to;
}

export function statusRadnogVremena(od, doV) {
    const open = jeOtvoreno(od, doV);
    const hours = formatRadnoVrijeme(od, doV);
    if (open === null) {
        return { label: 'Radno vrijeme nije uneseno', open: null, hours };
    }
    return {
        label: open ? 'Otvoreno' : 'Zatvoreno',
        open,
        hours,
    };
}

// Dnevna satnica vrećice (npr. "18:00" – "19:30") u odnosu na trenutno vrijeme:
// 'uskoro' = počinje kasnije danas, 'sada' = preuzimanje u toku,
// 'isteklo' = za danas završeno, null = satnica nije definisana.
export function statusPreuzimanjaVrecice(od, doV, now = new Date()) {
    const from = parseMinutes(od);
    const to = parseMinutes(doV);
    if (from == null || to == null || from === to) return null;
    const cur = now.getHours() * 60 + now.getMinutes();
    if (from < to) {
        if (cur < from) return 'uskoro';
        return cur < to ? 'sada' : 'isteklo';
    }
    // termin preko ponoći (npr. 22:00 – 01:00)
    return cur >= from || cur < to ? 'sada' : 'uskoro';
}

// Backend šalje LocalDateTime kao "2026-10-09T18:00:00" (ili kao niz [2026, 10, 9, 18, 0])
function uDatum(vrijednost) {
    if (!vrijednost) return null;
    if (Array.isArray(vrijednost)) {
        const [g, mj, d, h = 0, min = 0] = vrijednost;
        return new Date(g, mj - 1, d, h, min);
    }
    const datum = new Date(vrijednost);
    return isNaN(datum) ? null : datum;
}

const dvaZnaka = (broj) => String(broj).padStart(2, '0');
const sat = (datum) => `${dvaZnaka(datum.getHours())}:${dvaZnaka(datum.getMinutes())}`;

// Status termina preuzimanja na narudžbi: 'uskoro' | 'sada' | 'isteklo' | null
export function statusTerminaNarudzbe(od, doV, now = new Date()) {
    const start = uDatum(od);
    const end = uDatum(doV);
    if (!start || !end) return null;
    if (now < start) return 'uskoro';
    return now < end ? 'sada' : 'isteklo';
}

// "danas 18:00 – 19:30" ili "09.10. 18:00 – 19:30"
export function formatTerminNarudzbe(od, doV, now = new Date()) {
    const start = uDatum(od);
    const end = uDatum(doV);
    if (!start || !end) return '';
    const danas = start.toDateString() === now.toDateString();
    const dan = danas ? 'danas' : `${dvaZnaka(start.getDate())}.${dvaZnaka(start.getMonth() + 1)}.`;
    return `${dan} ${sat(start)} – ${sat(end)}`;
}
