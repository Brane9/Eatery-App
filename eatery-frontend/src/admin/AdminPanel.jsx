import React, { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../api';
import './AdminPanel.css';

function AdminPanel({ user, onLogout }) {
    const [sekcija, setSekcija] = useState('zahtjevi');
    const [poruka, setPoruka] = useState('');

    const [zahtjevi, setZahtjevi] = useState([]);
    const [zahtjeviLoading, setZahtjeviLoading] = useState(true);
    const [obradaId, setObradaId] = useState(null);

    const [oglasi, setOglasi] = useState([]);
    const [oglasiLoading, setOglasiLoading] = useState(false);
    const [brisanjeId, setBrisanjeId] = useState(null);

    const [korisnici, setKorisnici] = useState([]);
    const [korisniciLoading, setKorisniciLoading] = useState(false);
    const [pretraga, setPretraga] = useState('');
    const [aktiviranFilter, setAktiviranFilter] = useState('');
    const [suspendovanFilter, setSuspendovanFilter] = useState('');
    const [sort, setSort] = useState('id');
    const [dir, setDir] = useState('asc');
    const [aktivacijaId, setAktivacijaId] = useState(null);
    const [suspenzijaId, setSuspenzijaId] = useState(null);
    const [suspenzijaForma, setSuspenzijaForma] = useState(null);

    const [zahtjeviSifra, setZahtjeviSifra] = useState([]);
    const [zahtjeviSifraLoading, setZahtjeviSifraLoading] = useState(true);
    const [obradaSifraId, setObradaSifraId] = useState(null);

    const [recenzije, setRecenzije] = useState([]);
    const [recenzijeLoading, setRecenzijeLoading] = useState(false);
    const [brisanjeRecenzijeId, setBrisanjeRecenzijeId] = useState(null);
    const [brisanjeNalogaId, setBrisanjeNalogaId] = useState(null);
    const [profil, setProfil] = useState(null);
    const [profilLoading, setProfilLoading] = useState(false);

    const ucitajZahtjeve = useCallback(async () => {
        try {
            setZahtjeviLoading(true);
            const res = await API.get('/admin/zahtjevi');
            setZahtjevi(res.data);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || err.message || 'Nepoznata greška';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setZahtjeviLoading(false);
        }
    }, []);

    const ucitajOglase = useCallback(async () => {
        try {
            setOglasiLoading(true);
            const res = await API.get('/admin/oglasi');
            setOglasi(res.data);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || err.message || 'Nepoznata greška';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setOglasiLoading(false);
        }
    }, []);

    const ucitajKorisnike = useCallback(async () => {
        if (sekcija !== 'kupci' && sekcija !== 'klijenti') return;
        try {
            if (korisnici.length === 0) {
                setKorisniciLoading(true);
            }
            const putanja = sekcija === 'kupci' ? '/admin/kupci' : '/admin/klijenti';
            const res = await API.get(putanja, {
                params: {
                    q: pretraga.trim() || undefined,
                    aktiviran: aktiviranFilter === '' ? undefined : aktiviranFilter === 'true',
                    suspendovan: suspendovanFilter === '' ? undefined : suspendovanFilter === 'true',
                    sortBy: sort,
                    dir
                }
            });
            setKorisnici(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || err.message || 'Nepoznata greška';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setKorisniciLoading(false);
        }
    }, [sekcija, pretraga, aktiviranFilter, suspendovanFilter, sort, dir]);

    const ucitajRecenzije = useCallback(async () => {
        try {
            setRecenzijeLoading(true);
            const res = await API.get('/admin/recenzije');
            setRecenzije(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || err.message || 'Nepoznata greška';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setRecenzijeLoading(false);
        }
    }, []);

    const ucitajZahtjeveSifra = useCallback(async () => {
        try {
            setZahtjeviSifraLoading(true);
            const res = await API.get('/admin/zahtjevi-sifra');
            setZahtjeviSifra(res.data);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || err.message || 'Nepoznata greška';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setZahtjeviSifraLoading(false);
        }
    }, []);

    useEffect(() => {
        ucitajZahtjeve();
    }, [ucitajZahtjeve]);

    useEffect(() => {
        ucitajZahtjeveSifra();
    }, [ucitajZahtjeveSifra, sekcija]);

    useEffect(() => {
        if (sekcija === 'oglasi') {
            ucitajOglase();
        }
    }, [sekcija, ucitajOglase]);

    useEffect(() => {
        if (sekcija === 'recenzije') {
            ucitajRecenzije();
        }
    }, [sekcija, ucitajRecenzije]);

    useEffect(() => {
        if (sekcija !== 'kupci' && sekcija !== 'klijenti') return undefined;
        const t = setTimeout(() => {
            ucitajKorisnike();
        }, pretraga ? 250 : 0);
        return () => clearTimeout(t);
    }, [sekcija, ucitajKorisnike, pretraga]);

    const obradiZahtjev = async (id, odobreno) => {
        try {
            setObradaId(id);
            const res = await API.post(`/admin/zahtjevi/${id}/obradi?odobreno=${odobreno}`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Zahtjev je uspješno obrađen.');
            setZahtjevi((prev) => prev.filter((z) => z.id !== id));
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Došlo je do greške prilikom obrade zahtjeva.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setObradaId(null);
        }
    };

    const obradiZahtjevSifra = async (id, odobreno) => {
        try {
            setObradaSifraId(id);
            const res = await API.post(`/admin/zahtjevi-sifra/${id}/obradi?odobreno=${odobreno}`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Zahtjev je obrađen.');
            setZahtjeviSifra((prev) => prev.filter((z) => z.id !== id));
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Došlo je do greške prilikom obrade zahtjeva.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setObradaSifraId(null);
        }
    };

    const aktivirajKlijenta = async (id) => {
        try {
            setAktivacijaId(id);
            const res = await API.post(`/admin/korisnici/${id}/aktiviraj`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Restoran je aktiviran.');
            setKorisnici((prev) =>
                prev.map((k) => (k.id === id ? { ...k, aktiviran: true } : k))
            );
            ucitajZahtjeve();
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Nalog nije mogao biti aktiviran.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setAktivacijaId(null);
        }
    };

    const otvoriProfil = async (id) => {
        try {
            setProfilLoading(true);
            const res = await API.get(`/admin/korisnici/${id}`);
            setProfil(res.data);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Profil nije mogao biti učitan.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setProfilLoading(false);
        }
    };

    const obrisiNalog = async (k) => {
        const ime = k.prikazIme || k.korisnickoIme || k.id;
        if (!window.confirm(`Obrisati nalog "${ime}"? Radnja se ne može poništiti.`)) {
            return;
        }
        try {
            setBrisanjeNalogaId(k.id);
            const res = await API.delete(`/admin/korisnici/${k.id}`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Nalog je obrisan.');
            setKorisnici((prev) => prev.filter((x) => x.id !== k.id));
            if (profil?.id === k.id) setProfil(null);
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Nalog nije mogao biti obrisan.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setBrisanjeNalogaId(null);
        }
    };

    const obrisiRecenziju = async (id) => {
        if (!window.confirm('Obrisati ovu recenziju? Radnja se ne može poništiti.')) {
            return;
        }
        try {
            setBrisanjeRecenzijeId(id);
            const res = await API.delete(`/admin/recenzije/${id}`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Recenzija je obrisana.');
            setRecenzije((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Recenzija nije mogla biti obrisana.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setBrisanjeRecenzijeId(null);
        }
    };

    const obrisiOglas = async (id) => {
        if (!window.confirm('Obrisati ovaj oglas? Radnja se ne može poništiti.')) {
            return;
        }
        try {
            setBrisanjeId(id);
            const res = await API.delete(`/admin/oglasi/${id}`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Oglas je obrisan.');
            setOglasi((prev) => prev.filter((o) => o.id !== id));
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Oglas nije mogao biti obrisan.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setBrisanjeId(null);
        }
    };

    const parseDatum = (vrijednost) => {
        if (vrijednost == null || vrijednost === '') return null;
        if (Array.isArray(vrijednost)) {
            const [y, m, d, h = 0, min = 0, s = 0] = vrijednost;
            const parsed = new Date(y, (m || 1) - 1, d, h, min, s);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        const parsed = new Date(vrijednost);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const jeSuspendovan = (k) => {
        const doKad = parseDatum(k?.suspendovanDo);
        if (doKad) {
            return doKad.getTime() > Date.now();
        }
        return k?.suspendovan === true;
    };

    const promeniSort = (polje) => {
        if (sort === polje) {
            setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSort(polje);
            setDir('asc');
        }
    };

    const sortOznaka = (polje) => {
        if (sort !== polje) return ' ↕';
        return dir === 'asc' ? ' ↑' : ' ↓';
    };

    const usporediTekst = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'bs', { sensitivity: 'base' });

    const usporediVrijednost = (a, b, polje) => {
        if (polje === 'id' || polje === 'kolicina') {
            return (Number(a) || 0) - (Number(b) || 0);
        }
        if (polje === 'akcijskaCijena' || polje === 'originalnaCijena') {
            return (Number(a) || 0) - (Number(b) || 0);
        }
        if (polje === 'aktiviran' || polje === 'aktivna') {
            return (a ? 1 : 0) - (b ? 1 : 0);
        }
        if (polje === 'datumPodnosenja' || polje === 'vrijemeKreiranja') {
            const da = parseDatum(a)?.getTime() ?? 0;
            const db = parseDatum(b)?.getTime() ?? 0;
            return da - db;
        }
        return usporediTekst(a, b);
    };

    const sortirajListu = (lista, polje, smjer) => {
        const mul = smjer === 'desc' ? -1 : 1;
        return [...lista].sort((x, y) => {
            if (polje === 'status') {
                const rang = (k) => (jeSuspendovan(k) ? 2 : k.aktiviran ? 1 : 0);
                return (rang(x) - rang(y)) * mul;
            }
            return usporediVrijednost(x?.[polje], y?.[polje], polje) * mul;
        });
    };

    const prikazaniKorisnici = useMemo(() => {
        const filtrirani = korisnici.filter((k) => {
            if (suspendovanFilter === 'true') return jeSuspendovan(k);
            if (suspendovanFilter === 'false') return !jeSuspendovan(k);
            return true;
        });
        return sortirajListu(filtrirani, sort === 'aktiviran' ? 'status' : sort, dir);
    }, [korisnici, sort, dir, suspendovanFilter]);

    const prikazaniZahtjevi = useMemo(
        () => sortirajListu(zahtjevi, sort, dir),
        [zahtjevi, sort, dir]
    );

    const prikazaniOglasi = useMemo(
        () => sortirajListu(oglasi, sort, dir),
        [oglasi, sort, dir]
    );

    const formatCijena = (vrijednost) => {
        if (vrijednost == null) return '—';
        return `${Number(vrijednost).toFixed(2)} KM`;
    };

    const nazivUloge = (uloga) => {
        if (uloga === 'KLIJENT') return 'Restoran';
        if (uloga === 'KUPAC') return 'Kupac';
        return uloga || '—';
    };

    const formatDatum = (vrijednost) => {
        const d = parseDatum(vrijednost);
        if (!d) return vrijednost ? String(vrijednost) : '—';
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const renderStatus = (k, { prikaziAktivaciju = true } = {}) => {
        if (jeSuspendovan(k)) {
            return (
                <div className="admin-status">
                    <span className="admin-badge is-warn">Suspendovan</span>
                    <span className="admin-status-until">do {formatDatum(k.suspendovanDo)}</span>
                </div>
            );
        }
        if (!prikaziAktivaciju) return null;
        return (
            <div className="admin-status">
                <span className={k.aktiviran ? 'admin-badge is-on' : 'admin-badge'}>
                    {k.aktiviran ? 'Aktiviran' : 'Neaktiviran'}
                </span>
            </div>
        );
    };

    const datetimeLocalNow = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const toIsoLocal = (value) => {
        if (!value) return null;
        return value.length === 16 ? `${value}:00` : value;
    };

    const otvoriSuspenziju = (k) => {
        setSuspenzijaForma({
            id: k.id,
            prikazIme: k.prikazIme || k.korisnickoIme,
            period: '7',
            until: datetimeLocalNow(),
            sekunde: '30'
        });
    };

    const potvrdiSuspenziju = async () => {
        if (!suspenzijaForma) return;
        const { id, prikazIme, period, until, sekunde } = suspenzijaForma;
        const sekundePreset = { '30s': 30, '60s': 60, '300s': 300 };
        let body;

        if (period === 'custom') {
            if (!until) {
                setPoruka('Greška: Odaberite datum i vrijeme do kada suspenzija vrijedi.');
                return;
            }
            body = { suspendovanDo: toIsoLocal(until) };
        } else if (sekundePreset[period] != null) {
            body = { sekunde: sekundePreset[period] };
        } else if (period === 'sekunde') {
            const broj = Number(sekunde);
            if (!Number.isInteger(broj) || broj <= 0) {
                setPoruka('Greška: Unesite broj sekundi veći od nule.');
                return;
            }
            body = { sekunde: broj };
        } else {
            body = { dani: Number(period) };
        }

        if (!window.confirm(`Suspendovati nalog "${prikazIme}"?`)) {
            return;
        }

        try {
            setSuspenzijaId(id);
            const res = await API.post(`/admin/korisnici/${id}/suspenduj`, body);
            setPoruka(typeof res.data === 'string' ? res.data : 'Nalog je suspendovan.');
            setSuspenzijaForma(null);
            ucitajKorisnike();
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Nalog nije mogao biti suspendovan.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setSuspenzijaId(null);
        }
    };

    const skiniSuspenziju = async (k) => {
        if (!window.confirm(`Ukloniti suspenziju za "${k.prikazIme || k.korisnickoIme}"?`)) {
            return;
        }
        try {
            setSuspenzijaId(k.id);
            const res = await API.post(`/admin/korisnici/${k.id}/skini-suspenziju`);
            setPoruka(typeof res.data === 'string' ? res.data : 'Suspenzija je uklonjena.');
            ucitajKorisnike();
        } catch (err) {
            const porukaGreske = err.response?.data?.message || 'Suspenzija nije mogla biti uklonjena.';
            setPoruka(`Greška: ${porukaGreske}`);
        } finally {
            setSuspenzijaId(null);
        }
    };

    const heading = {
        zahtjevi: {
            title: 'Zahtjevi za aktivaciju',
            text: 'Pregledajte i odobrite restorane koji čekaju da se pojave na platformi.'
        },
        kupci: {
            title: 'Kupci',
            text: 'Pregled kupaca iz baze. Otvorite profil, suspendujte ili uklonite nalog.'
        },
        klijenti: {
            title: 'Restorani',
            text: 'Pregled klijenata iz baze. Otvorite profil restorana, aktivirajte, suspendujte ili uklonite nalog.'
        },
        sifre: {
            title: 'Zahtjevi za promjenu šifre',
            text: 'Korisnici su zatražili novu šifru. Nova šifra počinje važiti tek kada je odobrite.'
        },
        oglasi: {
            title: 'Oglasi',
            text: 'Pregledajte vrećice iznenađenja i uklonite oglase koji krše pravila platforme.'
        },
        recenzije: {
            title: 'Recenzije',
            text: 'Pregledajte ocjene kupaca i uklonite recenzije koje krše pravila platforme.'
        }
    }[sekcija];

    const renderKorisniciTabela = (tip) => (
        <>
            <div className="admin-toolbar">
                <input
                    type="search"
                    className="admin-search"
                    placeholder={
                        tip === 'kupci'
                            ? 'Pretraži ime, korisničko ime ili email...'
                            : 'Pretraži restoran, korisničko ime, email ili adresu...'
                    }
                    value={pretraga}
                    onChange={(e) => setPretraga(e.target.value)}
                />
                <select
                    value={aktiviranFilter}
                    aria-label="Filter aktivacije"
                    onChange={(e) => setAktiviranFilter(e.target.value)}
                >
                    <option value="">Sva aktivacija</option>
                    <option value="true">Aktivirani</option>
                    <option value="false">Neaktivirani</option>
                </select>
                <select
                    value={suspendovanFilter}
                    aria-label="Filter suspenzije"
                    onChange={(e) => setSuspendovanFilter(e.target.value)}
                >
                    <option value="">Sve suspenzije</option>
                    <option value="true">Suspendovani</option>
                    <option value="false">Nisu suspendovani</option>
                </select>
                <select
                    value={sort}
                    aria-label="Sortiraj po"
                    onChange={(e) => {
                        setSort(e.target.value);
                        setDir('asc');
                    }}
                >
                    <option value="id">Sortiraj: ID</option>
                    <option value="prikazIme">{tip === 'kupci' ? 'Sortiraj: Ime' : 'Sortiraj: Objekat'}</option>
                    <option value="korisnickoIme">Sortiraj: Korisničko ime</option>
                    <option value="email">Sortiraj: Email</option>
                    {tip === 'klijenti' && <option value="adresa">Sortiraj: Adresa</option>}
                    <option value="aktiviran">Sortiraj: Status</option>
                </select>
                <select value={dir} aria-label="Smjer sortiranja" onChange={(e) => setDir(e.target.value)}>
                    <option value="asc">Rastuće (A–Z)</option>
                    <option value="desc">Opadajuće (Z–A)</option>
                </select>
            </div>

            <div className="admin-card">
                {korisniciLoading ? (
                    <div className="admin-inline-loading">
                        {tip === 'kupci' ? 'Učitavanje kupaca...' : 'Učitavanje restorana...'}
                    </div>
                ) : prikazaniKorisnici.length === 0 ? (
                    <div className="admin-empty">
                        <h3>
                            {pretraga.trim() || aktiviranFilter || suspendovanFilter
                                ? 'Nema rezultata'
                                : tip === 'kupci'
                                    ? 'Nema kupaca u bazi korisnika'
                                    : 'Nema restorana'}
                        </h3>
                        <p>
                            {pretraga.trim() || aktiviranFilter || suspendovanFilter
                                ? 'Nema rezultata za zadatu pretragu ili filter.'
                                : tip === 'kupci'
                                    ? 'Nijedan korisnik sa ulogom kupca nije pronađen u tabeli korisnik.'
                                    : 'Nema rezultata za zadatu pretragu ili filter.'}
                        </p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>
                                    <button type="button" className="admin-sort" onClick={() => promeniSort('id')}>
                                        ID{sortOznaka('id')}
                                    </button>
                                </th>
                                <th>
                                    <button type="button" className="admin-sort" onClick={() => promeniSort('prikazIme')}>
                                        {tip === 'kupci' ? 'Ime' : 'Objekat'}{sortOznaka('prikazIme')}
                                    </button>
                                </th>
                                <th>
                                    <button type="button" className="admin-sort" onClick={() => promeniSort('korisnickoIme')}>
                                        Korisničko ime{sortOznaka('korisnickoIme')}
                                    </button>
                                </th>
                                <th>
                                    <button type="button" className="admin-sort" onClick={() => promeniSort('email')}>
                                        Email{sortOznaka('email')}
                                    </button>
                                </th>
                                {tip === 'klijenti' && (
                                    <th>
                                        <button type="button" className="admin-sort" onClick={() => promeniSort('adresa')}>
                                            Adresa{sortOznaka('adresa')}
                                        </button>
                                    </th>
                                )}
                                <th>
                                    <button type="button" className="admin-sort" onClick={() => promeniSort('aktiviran')}>
                                        Status{sortOznaka('aktiviran')}
                                    </button>
                                </th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prikazaniKorisnici.map((k) => (
                                <tr key={k.id}>
                                    <td>{k.id}</td>
                                    <td>
                                        <button type="button" className="admin-name-link" onClick={() => otvoriProfil(k.id)}>
                                            {k.prikazIme || '—'}
                                        </button>
                                    </td>
                                    <td>{k.korisnickoIme}</td>
                                    <td>{k.email}</td>
                                    {tip === 'klijenti' && (
                                        <td className="admin-cell-address" title={k.adresa || ''}>
                                            <span>{k.adresa || '—'}</span>
                                        </td>
                                    )}
                                    <td>{renderStatus(k)}</td>
                                    <td className="admin-cell-actions">
                                        <div className="admin-actions">
                                            <button
                                                className="admin-view"
                                                type="button"
                                                disabled={profilLoading}
                                                onClick={() => otvoriProfil(k.id)}
                                            >
                                                Pregled
                                            </button>
                                            {tip === 'klijenti' && !k.aktiviran && (
                                                <button
                                                    className="admin-approve"
                                                    type="button"
                                                    disabled={aktivacijaId === k.id}
                                                    onClick={() => aktivirajKlijenta(k.id)}
                                                >
                                                    {aktivacijaId === k.id ? 'Aktivacija...' : 'Aktiviraj'}
                                                </button>
                                            )}
                                            {jeSuspendovan(k) ? (
                                                <button
                                                    className="admin-lift"
                                                    type="button"
                                                    disabled={suspenzijaId === k.id}
                                                    onClick={() => skiniSuspenziju(k)}
                                                >
                                                    {suspenzijaId === k.id ? 'Obrada...' : 'Skini suspenziju'}
                                                </button>
                                            ) : (
                                                <button
                                                    className="admin-suspend"
                                                    type="button"
                                                    disabled={suspenzijaId === k.id}
                                                    onClick={() => otvoriSuspenziju(k)}
                                                >
                                                    Suspenduj
                                                </button>
                                            )}
                                            <button
                                                className="admin-reject"
                                                type="button"
                                                disabled={brisanjeNalogaId === k.id}
                                                onClick={() => obrisiNalog(k)}
                                            >
                                                {brisanjeNalogaId === k.id ? 'Brisanje...' : 'Obriši'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );

    return (
        <div className="admin-page">
            <header className="admin-navbar">
                <div className="admin-navbar-inner">
                    <div className="admin-brand">
                        <div className="admin-logo" aria-hidden="true">E</div>
                        <div>
                            <div className="admin-brand-name">Eatery</div>
                            <div className="admin-brand-subtitle">Administracija</div>
                        </div>
                    </div>
                    <nav className="admin-tabs" aria-label="Admin sekcije">
                        <button
                            type="button"
                            className={sekcija === 'zahtjevi' ? 'is-active' : ''}
                            onClick={() => setSekcija('zahtjevi')}
                        >
                            Zahtjevi
                        </button>
                        <button
                            type="button"
                            className={sekcija === 'kupci' ? 'is-active' : ''}
                            onClick={() => { setSekcija('kupci'); setPretraga(''); setAktiviranFilter(''); setSuspendovanFilter(''); setSort('id'); setDir('asc'); }}
                        >
                            Kupci
                        </button>
                        <button
                            type="button"
                            className={sekcija === 'klijenti' ? 'is-active' : ''}
                            onClick={() => { setSekcija('klijenti'); setPretraga(''); setAktiviranFilter(''); setSuspendovanFilter(''); setSort('id'); setDir('asc'); }}
                        >
                            Restorani
                        </button>
                        <button
                            type="button"
                            className={sekcija === 'sifre' ? 'is-active' : ''}
                            onClick={() => setSekcija('sifre')}
                        >
                            Šifre{zahtjeviSifra.length > 0 ? ` (${zahtjeviSifra.length})` : ''}
                        </button>
                        <button
                            type="button"
                            className={sekcija === 'oglasi' ? 'is-active' : ''}
                            onClick={() => setSekcija('oglasi')}
                        >
                            Oglasi
                        </button>
                        <button
                            type="button"
                            className={sekcija === 'recenzije' ? 'is-active' : ''}
                            onClick={() => setSekcija('recenzije')}
                        >
                            Recenzije
                        </button>
                    </nav>
                    <div className="admin-user">
                        <span>{user?.korisnickoIme || 'Administrator'}</span>
                        {onLogout && (
                            <button className="admin-logout" type="button" onClick={onLogout}>
                                Odjava
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="admin-content">
                <div className="admin-heading">
                    <span>ADMIN PANEL</span>
                    <h1>{heading.title}</h1>
                    <p>{heading.text}</p>
                </div>

                {poruka && <div className="admin-alert">{poruka}</div>}

                {sekcija === 'zahtjevi' && (
                    <div className="admin-card">
                        {zahtjeviLoading ? (
                            <div className="admin-inline-loading">Učitavanje zahtjeva...</div>
                        ) : zahtjevi.length === 0 ? (
                            <div className="admin-empty">
                                <h3>Nema novih zahtjeva</h3>
                                <p>Trenutno nema restorana koji čekaju aktivaciju.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('id')}>
                                                ID{sortOznaka('id')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('uloga')}>
                                                Uloga{sortOznaka('uloga')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('prikazIme')}>
                                                Objekat{sortOznaka('prikazIme')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('korisnickoIme')}>
                                                Korisničko ime{sortOznaka('korisnickoIme')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('email')}>
                                                Email{sortOznaka('email')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('datumPodnosenja')}>
                                                Datum{sortOznaka('datumPodnosenja')}
                                            </button>
                                        </th>
                                        <th>Status</th>
                                        <th>Akcije</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prikazaniZahtjevi.map((z) => (
                                        <tr key={z.id}>
                                            <td>{z.id}</td>
                                            <td>{nazivUloge(z.uloga)}</td>
                                            <td>{z.prikazIme || '—'}</td>
                                            <td>{z.korisnickoIme || 'N/A'}</td>
                                            <td>{z.email || 'N/A'}</td>
                                            <td>
                                                {z.datumPodnosenja
                                                    ? new Date(z.datumPodnosenja).toLocaleString()
                                                    : 'N/A'}
                                            </td>
                                            <td>{renderStatus(z, { prikaziAktivaciju: false }) || '—'}</td>
                                            <td>
                                                <div className="admin-actions">
                                                    <button
                                                        className="admin-approve"
                                                        type="button"
                                                        disabled={obradaId === z.id}
                                                        onClick={() => obradiZahtjev(z.id, true)}
                                                    >
                                                        {obradaId === z.id ? 'Obrada...' : 'Odobri'}
                                                    </button>
                                                    <button
                                                        className="admin-reject"
                                                        type="button"
                                                        disabled={obradaId === z.id}
                                                        onClick={() => obradiZahtjev(z.id, false)}
                                                    >
                                                        {obradaId === z.id ? 'Obrada...' : 'Odbij'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {sekcija === 'sifre' && (
                    <div className="admin-card">
                        {zahtjeviSifraLoading ? (
                            <div className="admin-inline-loading">Učitavanje zahtjeva...</div>
                        ) : zahtjeviSifra.length === 0 ? (
                            <div className="admin-empty">
                                <h3>Nema zahtjeva za promjenu šifre</h3>
                                <p>Kada korisnik zatraži novu šifru, zahtjev će se pojaviti ovdje.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Uloga</th>
                                        <th>Ime / objekat</th>
                                        <th>Korisničko ime</th>
                                        <th>Email</th>
                                        <th>Datum</th>
                                        <th>Akcije</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zahtjeviSifra.map((z) => (
                                        <tr key={z.id}>
                                            <td>{z.id}</td>
                                            <td>{nazivUloge(z.uloga)}</td>
                                            <td>{z.prikazIme || '—'}</td>
                                            <td>{z.korisnickoIme || 'N/A'}</td>
                                            <td>{z.email || 'N/A'}</td>
                                            <td>
                                                {z.datumPodnosenja
                                                    ? new Date(z.datumPodnosenja).toLocaleString()
                                                    : 'N/A'}
                                            </td>
                                            <td>
                                                <div className="admin-actions">
                                                    <button
                                                        className="admin-approve"
                                                        type="button"
                                                        disabled={obradaSifraId === z.id}
                                                        onClick={() => obradiZahtjevSifra(z.id, true)}
                                                    >
                                                        {obradaSifraId === z.id ? 'Obrada...' : 'Odobri'}
                                                    </button>
                                                    <button
                                                        className="admin-reject"
                                                        type="button"
                                                        disabled={obradaSifraId === z.id}
                                                        onClick={() => obradiZahtjevSifra(z.id, false)}
                                                    >
                                                        {obradaSifraId === z.id ? 'Obrada...' : 'Odbij'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {sekcija === 'kupci' && renderKorisniciTabela('kupci')}
                {sekcija === 'klijenti' && renderKorisniciTabela('klijenti')}

                {sekcija === 'recenzije' && (
                    <div className="admin-card">
                        {recenzijeLoading ? (
                            <div className="admin-inline-loading">Učitavanje recenzija...</div>
                        ) : recenzije.length === 0 ? (
                            <div className="admin-empty">
                                <h3>Nema recenzija</h3>
                                <p>Trenutno nema ostavljenih ocjena kupaca.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Ocjena</th>
                                        <th>Komentar</th>
                                        <th>Kupac</th>
                                        <th>Restoran</th>
                                        <th>Narudžba</th>
                                        <th>Datum</th>
                                        <th>Akcije</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recenzije.map((r) => (
                                        <tr key={r.id}>
                                            <td>{r.ocjena != null ? `${r.ocjena}/5` : '—'}</td>
                                            <td>{r.komentar || '—'}</td>
                                            <td>
                                                {r.kupacId ? (
                                                    <button type="button" className="admin-name-link" onClick={() => otvoriProfil(r.kupacId)}>
                                                        {r.kupac || r.kupacId}
                                                    </button>
                                                ) : (r.kupac || '—')}
                                            </td>
                                            <td>
                                                {r.restoranId ? (
                                                    <button type="button" className="admin-name-link" onClick={() => otvoriProfil(r.restoranId)}>
                                                        {r.restoran || r.restoranId}
                                                    </button>
                                                ) : (r.restoran || '—')}
                                            </td>
                                            <td>{r.sifraNarudzbe || r.narudzbaId || '—'}</td>
                                            <td>{formatDatum(r.datumKreiranja)}</td>
                                            <td>
                                                <button
                                                    className="admin-reject"
                                                    type="button"
                                                    disabled={brisanjeRecenzijeId === r.id}
                                                    onClick={() => obrisiRecenziju(r.id)}
                                                >
                                                    {brisanjeRecenzijeId === r.id ? 'Brisanje...' : 'Obriši'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {sekcija === 'oglasi' && (
                    <div className="admin-card">
                        {oglasiLoading ? (
                            <div className="admin-inline-loading">Učitavanje oglasa...</div>
                        ) : oglasi.length === 0 ? (
                            <div className="admin-empty">
                                <h3>Nema oglasa</h3>
                                <p>Trenutno nema objavljenih vrećica iznenađenja.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('naziv')}>
                                                Oglas{sortOznaka('naziv')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('restoran')}>
                                                Restoran{sortOznaka('restoran')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('akcijskaCijena')}>
                                                Cijena{sortOznaka('akcijskaCijena')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('kolicina')}>
                                                Količina{sortOznaka('kolicina')}
                                            </button>
                                        </th>
                                        <th>
                                            <button type="button" className="admin-sort" onClick={() => promeniSort('aktivna')}>
                                                Status{sortOznaka('aktivna')}
                                            </button>
                                        </th>
                                        <th>Akcije</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prikazaniOglasi.map((o) => (
                                        <tr key={o.id}>
                                            <td>
                                                <strong>{o.naziv}</strong>
                                                {o.opis && <div className="admin-muted">{o.opis}</div>}
                                            </td>
                                            <td>{o.restoran || 'N/A'}</td>
                                            <td>
                                                {formatCijena(o.akcijskaCijena)}
                                                {o.originalnaCijena != null && (
                                                    <div className="admin-muted">
                                                        orig. {formatCijena(o.originalnaCijena)}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{o.kolicina ?? '—'}</td>
                                            <td>
                                                <span className={o.aktivna ? 'admin-badge is-on' : 'admin-badge'}>
                                                    {o.aktivna ? 'Aktivan' : 'Neaktivan'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="admin-reject"
                                                    type="button"
                                                    disabled={brisanjeId === o.id}
                                                    onClick={() => obrisiOglas(o.id)}
                                                >
                                                    {brisanjeId === o.id ? 'Brisanje...' : 'Obriši'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            {(profil || profilLoading) && (
                <div className="admin-modal-backdrop" role="presentation" onClick={() => setProfil(null)}>
                    <div
                        className="admin-modal admin-modal-wide"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profil-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="profil-title">Pregled profila</h2>
                        {profilLoading || !profil ? (
                            <p>Učitavanje profila...</p>
                        ) : (
                            <>
                                <p>
                                    {profil.uloga === 'KLIJENT' ? 'Restoran' : 'Kupac'}:{' '}
                                    <strong>{profil.prikazIme || profil.korisnickoIme}</strong>
                                </p>
                                <dl className="admin-profile-grid">
                                    <div><dt>ID</dt><dd>{profil.id}</dd></div>
                                    <div><dt>Korisničko ime</dt><dd>{profil.korisnickoIme || '—'}</dd></div>
                                    <div><dt>Email</dt><dd>{profil.email || '—'}</dd></div>
                                    <div>
                                        <dt>Status</dt>
                                        <dd>
                                            {jeSuspendovan(profil)
                                                ? `Suspendovan do ${formatDatum(profil.suspendovanDo)}`
                                                : profil.aktiviran
                                                    ? 'Aktiviran'
                                                    : 'Neaktiviran'}
                                        </dd>
                                    </div>
                                    {profil.uloga === 'KUPAC' && (
                                        <>
                                            <div><dt>Ime i prezime</dt><dd>{profil.ime || 'Nije uneseno'}</dd></div>
                                            <div><dt>Česti kupac</dt><dd>{profil.cestiKupac ? 'Da' : 'Ne'}</dd></div>
                                            <div><dt>Popust</dt><dd>{profil.popust != null ? `${profil.popust}%` : '—'}</dd></div>
                                            <div><dt>Narudžbe</dt><dd>{profil.ukupnoNarudzbi ?? 0}</dd></div>
                                            <div><dt>Kupljenih vrećica</dt><dd>{profil.ukupnoVrecica ?? 0}</dd></div>
                                            <div>
                                                <dt>Ukupna ušteda</dt>
                                                <dd>{formatCijena(profil.ukupnaUstedaKM)}</dd>
                                            </div>
                                        </>
                                    )}
                                    {profil.uloga === 'KLIJENT' && (
                                        <>
                                            <div><dt>Naziv objekta</dt><dd>{profil.nazivObjekta || '—'}</dd></div>
                                            <div><dt>Adresa</dt><dd>{profil.adresa || 'Nije unesena'}</dd></div>
                                            <div>
                                                <dt>Koordinate</dt>
                                                <dd>
                                                    {profil.lat && profil.lng
                                                        ? `${Number(profil.lat).toFixed(5)}, ${Number(profil.lng).toFixed(5)}`
                                                        : 'Nisu unesene'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Radno vrijeme</dt>
                                                <dd>
                                                    {profil.radnoVrijemeOd || profil.radnoVrijemeDo
                                                        ? `${profil.radnoVrijemeOd || '—'} – ${profil.radnoVrijemeDo || '—'}`
                                                        : 'Nije uneseno'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Ocjena kupaca</dt>
                                                <dd>
                                                    {profil.ukupanBrojOcjena > 0
                                                        ? `${Number(profil.prosjecnaOcjena).toFixed(1)} (${profil.ukupanBrojOcjena})`
                                                        : 'Nema ocjena'}
                                                </dd>
                                            </div>
                                            <div><dt>Narudžbe</dt><dd>{profil.ukupnoNarudzbi ?? 0}</dd></div>
                                            <div><dt>Jela na meniju</dt><dd>{profil.brojJela ?? 0}</dd></div>
                                            <div><dt>Oglasi</dt><dd>{profil.brojOglasa ?? 0}</dd></div>
                                        </>
                                    )}
                                </dl>
                                <div className="admin-actions">
                                    <button
                                        className="admin-reject"
                                        type="button"
                                        disabled={brisanjeNalogaId === profil.id}
                                        onClick={() => obrisiNalog(profil)}
                                    >
                                        {brisanjeNalogaId === profil.id ? 'Brisanje...' : 'Obriši nalog'}
                                    </button>
                                    <button className="admin-logout" type="button" onClick={() => setProfil(null)}>
                                        Zatvori
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {suspenzijaForma && (
                <div className="admin-modal-backdrop" role="presentation" onClick={() => setSuspenzijaForma(null)}>
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="suspenzija-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="suspenzija-title">Suspenduj nalog</h2>
                        <p>
                            Odaberite period suspenzije za <strong>{suspenzijaForma.prikazIme}</strong>.
                            Dok traje suspenzija, prijava nije moguća.
                        </p>
                        <div className="admin-period">
                            {[
                                { value: '1', label: '1 dan' },
                                { value: '7', label: '7 dana' },
                                { value: '30', label: '30 dana' },
                                { value: '30s', label: '30 s' },
                                { value: '60s', label: '60 s' },
                                { value: '300s', label: '300 s' },
                                { value: 'sekunde', label: 'Po sekundama' },
                                { value: 'custom', label: 'Do datuma i vremena' }
                            ].map((opcija) => (
                                <label key={opcija.value} className={suspenzijaForma.period === opcija.value ? 'is-active' : ''}>
                                    <input
                                        type="radio"
                                        name="period-suspenzije"
                                        value={opcija.value}
                                        checked={suspenzijaForma.period === opcija.value}
                                        onChange={() => setSuspenzijaForma((prev) => ({ ...prev, period: opcija.value }))}
                                    />
                                    {opcija.label}
                                </label>
                            ))}
                        </div>
                        {suspenzijaForma.period === 'sekunde' && (
                            <label className="admin-datetime">
                                Trajanje u sekundama
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={suspenzijaForma.sekunde}
                                    onChange={(e) => setSuspenzijaForma((prev) => ({ ...prev, sekunde: e.target.value }))}
                                />
                            </label>
                        )}
                        {suspenzijaForma.period === 'custom' && (
                            <label className="admin-datetime">
                                Suspendovan do
                                <input
                                    type="datetime-local"
                                    min={datetimeLocalNow()}
                                    value={suspenzijaForma.until}
                                    onChange={(e) => setSuspenzijaForma((prev) => ({ ...prev, until: e.target.value }))}
                                />
                            </label>
                        )}
                        <div className="admin-actions">
                            <button
                                className="admin-suspend"
                                type="button"
                                disabled={suspenzijaId === suspenzijaForma.id}
                                onClick={potvrdiSuspenziju}
                            >
                                {suspenzijaId === suspenzijaForma.id ? 'Obrada...' : 'Potvrdi suspenziju'}
                            </button>
                            <button className="admin-logout" type="button" onClick={() => setSuspenzijaForma(null)}>
                                Odustani
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;
