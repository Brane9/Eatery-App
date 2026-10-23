import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Star, Check, X, ReceiptText, ChevronLeft, ChevronRight, MapPin, KeyRound, Store, Gift } from 'lucide-react';
import { statusTerminaNarudzbe, formatTerminNarudzbe } from './radnoVrijeme';
import './MojeNarudzbe.css';

const NARUDZBI_PO_STRANICI = 5;

const statusMap = {
    KREIRANA: { className: 'waiting', label: 'Na čekanju' },
    ZAPRIMLJENO: { className: 'waiting', label: 'Zaprimljeno' },
    PRIHVAĆENA: { className: 'preparing', label: 'U pripremi' },
    U_PRIPREMI: { className: 'preparing', label: 'U pripremi' },
    SPREMNO: { className: 'ready', label: 'Spremno' },
    DOSTAVLJENO: { className: 'delivered', label: 'Dostavljeno' },
    PREUZETO: { className: 'delivered', label: 'Preuzeto' },
    ODBIJENA: { className: 'rejected', label: 'Odbijeno' },
    OTKAZANA: { className: 'rejected', label: 'Otkazano' },
    OTKAZANO: { className: 'rejected', label: 'Otkazano' },
};

const KORACI = [
    { kljuc: 'waiting', label: 'Zaprimljeno' },
    { kljuc: 'preparing', label: 'U pripremi' },
    { kljuc: 'ready', label: 'Spremno' },
    { kljuc: 'delivered', label: 'Završeno' }
];

const FILTERI = [
    { id: 'aktivne', label: 'Aktivne' },
    { id: 'zavrsene', label: 'Završene' },
    { id: 'sve', label: 'Sve' }
];

const jeZavrsena = (n) => n.status === 'PREUZETO' || n.status === 'DOSTAVLJENO';
const jeOdbijena = (n) => (statusMap[n.status]?.className) === 'rejected';
const imaVrecicu = (n) =>
    (n.stavke || []).some((s) => String(s.tipStavke || '').toUpperCase() === 'VRECICA')
    || Boolean(n.preuzimanjeOd);
const jeVrecicaStavka = (s) => String(s?.tipStavke || '').toUpperCase() === 'VRECICA';

const MojeNarudzbe = ({ kupacId, onNovaNarudzba }) => {
    const [narudzbe, setNarudzbe] = useState([]);
    const [ucitavanje, setUcitavanje] = useState(true);
    const [greska, setGreska] = useState('');
    const [stranica, setStranica] = useState(1);
    const [filter, setFilter] = useState(null);

    // Stanja za ocjenjivanje
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [ocjena, setOcjena] = useState(5);
    const [hoverOcjena, setHoverOcjena] = useState(0);
    const [komentar, setKomentar] = useState('');
    const [slanje, setSlanje] = useState(false);
    const [ocjenjeneNarudzbe, setOcjenjeneNarudzbe] = useState([]);
    const [porukaOcjene, setPorukaOcjene] = useState(null);

    useEffect(() => {
        if (kupacId) {
            ucitajNarudzbe();
        }
    }, [kupacId]);

    const ucitajNarudzbe = async () => {
        try {
            setUcitavanje(true);
            setGreska('');
            const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');

            if (!token) {
                setGreska("Niste prijavljeni. Molimo prijavite se ponovo.");
                setUcitavanje(false);
                return;
            }

            const res = await axios.get(`http://localhost:8000/api/narudzbe/kupac/${kupacId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const sortiraneNarudzbe = [...res.data].sort((a, b) => b.id - a.id);
            setNarudzbe(sortiraneNarudzbe);

            // 1. Proveravamo direktna boolean polja iz DTO-a (ako postoje)
            const vecOcjenjeneIzDto = sortiraneNarudzbe
                .filter(n => n.ocjenjeno || n.isOcjenjeno || n.ocjenjena || n.recenzijaId || n.ocjena || n.hasRecenzija)
                .map(n => n.id);

            setOcjenjeneNarudzbe(vecOcjenjeneIzDto);

            // 2. PROVJERAVAMO PREKO BACKEND ENDPOINTA /provjeri/{id} ZA SVE ZAVRŠENE NARUDŽBE
            const zavrsene = sortiraneNarudzbe.filter(jeZavrsena);

            for (const n of zavrsene) {
                try {
                    const checkRes = await axios.get(`http://localhost:8000/api/recenzije/provjeri/${n.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (checkRes.data === true) {
                        setOcjenjeneNarudzbe(prev => Array.from(new Set([...prev, n.id])));
                    }
                } catch (cErr) {
                    // ignorisati greške pri provjeri
                }
            }

        } catch (err) {
            console.error("Greška pri preuzimanju narudžbi:", err);
            setGreska("Nije moguće učitati narudžbe.");
        } finally {
            setUcitavanje(false);
        }
    };

    const posaljiOcjenu = async (e, narudzba) => {
        e.preventDefault();
        const nId = narudzba.id || narudzba.narudzbaId;

        try {
            setSlanje(true);
            setPorukaOcjene(null);
            const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');

            const payload = {
                idNarudzbe: Number(nId),
                ocjena: Number(ocjena),
                komentar: komentar || ""
            };

            await axios.post('http://localhost:8000/api/recenzije', payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setOcjenjeneNarudzbe(prev => Array.from(new Set([...prev, nId])));
            setActiveOrderId(null);
            setKomentar('');
            setOcjena(5);
            setPorukaOcjene({ id: nId, tip: 'success', tekst: 'Hvala! Vaša ocjena je poslata.' });

        } catch (err) {
            console.error("Greška pri slanju ocjene:", err);

            const errData = err.response?.data;
            const errorMsg = typeof errData === 'string' ? errData : (errData?.message || JSON.stringify(errData || ''));

            // Ako backend javi da je već ocijenjena, ODMAH zaključaj dugme na frontu
            if (errorMsg.toLowerCase().includes('ocjenjen') || errorMsg.toLowerCase().includes('ocijenjen')) {
                setOcjenjeneNarudzbe(prev => Array.from(new Set([...prev, nId])));
                setActiveOrderId(null);
                setPorukaOcjene({ id: nId, tip: 'info', tekst: 'Ova narudžba je već ranije ocijenjena.' });
            } else {
                setPorukaOcjene({ id: nId, tip: 'error', tekst: errorMsg || 'Došlo je do greške pri slanju ocjene.' });
            }
        } finally {
            setSlanje(false);
        }
    };

    if (ucitavanje) {
        return (
            <div className="customer-orders-list" aria-busy="true">
                {[0, 1, 2].map(i => (
                    <div className="customer-order-card skeleton" key={i}>
                        <div className="order-skeleton line" />
                        <div className="order-skeleton line short" />
                        <div className="order-skeleton block" />
                    </div>
                ))}
            </div>
        );
    }

    if (greska) {
        return (
            <div className="customer-orders-state error" role="alert">
                <span className="customer-orders-state-icon" aria-hidden="true"><X size={20} /></span>
                <h3>Narudžbe nije moguće učitati</h3>
                <p>{greska}</p>
                <button type="button" className="orders-retry" onClick={ucitajNarudzbe}>Pokušaj ponovo</button>
            </div>
        );
    }

    if (narudzbe.length === 0) {
        return (
            <div className="customer-orders-state">
                <span className="customer-orders-state-icon" aria-hidden="true"><ReceiptText size={22} /></span>
                <h3>Još nemate narudžbi</h3>
                <p>Kad naručite iz nekog restorana, ovdje ćete pratiti status i PIN za preuzimanje.</p>
                {onNovaNarudzba && (
                    <button type="button" className="orders-retry primary" onClick={onNovaNarudzba}>
                        Pronađi restoran
                    </button>
                )}
            </div>
        );
    }

    const aktivne = narudzbe.filter(n => !jeZavrsena(n) && !jeOdbijena(n));
    const zavrsene = narudzbe.filter(n => jeZavrsena(n) || jeOdbijena(n));
    const brojevi = { aktivne: aktivne.length, zavrsene: zavrsene.length, sve: narudzbe.length };

    // Podrazumijevano prikazujemo aktivne ako ih ima, inače sve
    const aktivniFilter = filter || (aktivne.length > 0 ? 'aktivne' : 'sve');
    const filtrirane = aktivniFilter === 'aktivne' ? aktivne : aktivniFilter === 'zavrsene' ? zavrsene : narudzbe;

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirane.length / NARUDZBI_PO_STRANICI));
    const trenutnaStranica = Math.min(stranica, ukupnoStranica);
    const prikazaneNarudzbe = filtrirane.slice(
        (trenutnaStranica - 1) * NARUDZBI_PO_STRANICI,
        trenutnaStranica * NARUDZBI_PO_STRANICI
    );

    return (
        <div className="customer-orders">
            <div className="orders-tabs" role="tablist" aria-label="Filter narudžbi">
                {FILTERI.map(f => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={aktivniFilter === f.id}
                        className={aktivniFilter === f.id ? 'orders-tab active' : 'orders-tab'}
                        onClick={() => {
                            setFilter(f.id);
                            setStranica(1);
                        }}
                    >
                        {f.label}
                        <span>{brojevi[f.id]}</span>
                    </button>
                ))}
            </div>

            {filtrirane.length === 0 ? (
                <div className="customer-orders-state compact">
                    <p>{aktivniFilter === 'aktivne' ? 'Nemate aktivnih narudžbi.' : 'Nema narudžbi u ovoj kategoriji.'}</p>
                </div>
            ) : (
                <div className="customer-orders-list">
                    {prikazaneNarudzbe.map((n) => {
                        const statusInfo = statusMap[n.status] || { className: 'waiting', label: n.status };
                        const isZavrseno = jeZavrsena(n);
                        const isOdbijeno = statusInfo.className === 'rejected';
                        const isVecOcjenjeno = ocjenjeneNarudzbe.includes(n.id);
                        const isOtvoreno = activeOrderId === n.id;
                        const porukaZaNarudzbu = porukaOcjene?.id === n.id ? porukaOcjene : null;

                        // Termin preuzimanja vrećice iznenađenja
                        const statusTermina = statusTerminaNarudzbe(n.preuzimanjeOd, n.preuzimanjeDo);
                        const cekaPreuzimanje = !isZavrseno && !isOdbijeno;
                        const jeVrecicaNarudzba = imaVrecicu(n);
                        const korakIndex = KORACI.findIndex(k => k.kljuc === statusInfo.className);

                        return (
                            <article className={`customer-order-card ${statusInfo.className}`} key={n.id}>
                                <div className="customer-order-top">
                                    <span className="customer-order-avatar" aria-hidden="true"><Store size={18} /></span>
                                    <div className="customer-order-title">
                                        <h3>{n.restoranNaziv || 'Restoran'}</h3>
                                        <p>Narudžba {n.sifra || `#${n.id}`}</p>
                                    </div>
                                    <span className={`customer-order-status ${statusInfo.className}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>

                                {!isOdbijeno && korakIndex >= 0 && !isZavrseno && (
                                    <ol className="order-progress" aria-label="Napredak narudžbe">
                                        {KORACI.map((k, i) => (
                                            <li
                                                key={k.kljuc}
                                                className={i < korakIndex ? 'done' : i === korakIndex ? 'current' : ''}
                                                aria-current={i === korakIndex ? 'step' : undefined}
                                            >
                                                <span className="order-progress-dot" aria-hidden="true">
                                                    {i < korakIndex ? <Check size={11} strokeWidth={3} /> : null}
                                                </span>
                                                <span className="order-progress-label">{k.label}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                {n.pin && jeVrecicaNarudzba && cekaPreuzimanje && (
                                    <div className="customer-order-pin">
                                        <span><KeyRound size={14} aria-hidden="true" /> PIN za preuzimanje vrećice</span>
                                        <strong>{n.pin}</strong>
                                    </div>
                                )}

                                {statusTermina && (
                                    <div className={`customer-order-pickup ${cekaPreuzimanje ? statusTermina : ''}`}>
                                        <span>
                                            <Clock size={14} aria-hidden="true" />
                                            Preuzimanje {formatTerminNarudzbe(n.preuzimanjeOd, n.preuzimanjeDo)}
                                        </span>
                                        {cekaPreuzimanje && statusTermina === 'sada' && (
                                            <strong>Možete doći po vrećicu sada!</strong>
                                        )}
                                        {cekaPreuzimanje && statusTermina === 'uskoro' && (
                                            <em>Obavijestićemo vas kad možete doći.</em>
                                        )}
                                    </div>
                                )}

                                <ul className="customer-order-items">
                                    {n.stavke && n.stavke.length > 0 ? n.stavke.map((s, idx) => (
                                        <li key={idx}>
                                            <span>
                                                {s.kolicina ? <b>{s.kolicina}×</b> : null}
                                                {s.nazivJela || s.naziv || (jeVrecicaStavka(s) ? 'Vrećica iznenađenja' : 'Jelo')}
                                                {jeVrecicaStavka(s) && <em className="item-fulfillment-tag">Preuzimanje</em>}
                                            </span>
                                            <strong>
                                                {s.cijena != null ? `${Number(s.cijena).toFixed(2)} KM` : ''}
                                            </strong>
                                        </li>
                                    )) : (
                                        <li className="customer-order-items-empty">Nema stavki narudžbe</li>
                                    )}
                                </ul>

                                <div className="customer-order-footer">
                                    <div className="customer-order-address">
                                        {jeVrecicaNarudzba ? <Gift size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
                                        <span>
                                            {jeVrecicaNarudzba
                                                ? (n.adresaDostave && n.adresaDostave !== 'Preuzimanje u restoranu'
                                                    ? n.adresaDostave
                                                    : 'Preuzimanje u restoranu')
                                                : (n.adresaDostave || 'Adresa nije navedena')}
                                        </span>
                                    </div>

                                    <div className="customer-order-footer-right">
                                        <div className="customer-order-price-chip">
                                            <span>Ukupno</span>
                                            <strong>{Number(n.ukupnaCijena || 0).toFixed(2)} KM</strong>
                                        </div>

                                        {isZavrseno && (
                                            isVecOcjenjeno ? (
                                                <span className="badge-rated">
                                                    <Check size={14} aria-hidden="true" /> Ocijenjeno
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={isOtvoreno ? 'btn-rate-cancel' : 'btn-rate-open'}
                                                    aria-expanded={isOtvoreno}
                                                    onClick={() => {
                                                        setActiveOrderId(isOtvoreno ? null : n.id);
                                                        setOcjena(5);
                                                        setKomentar('');
                                                        setPorukaOcjene(null);
                                                    }}
                                                >
                                                    {isOtvoreno
                                                        ? <><X size={14} aria-hidden="true" /> Odustani</>
                                                        : <><Star size={14} aria-hidden="true" fill="currentColor" /> Ocijeni</>}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {porukaZaNarudzbu && (
                                    <p className={`rating-message ${porukaZaNarudzbu.tip}`} role="status">
                                        {porukaZaNarudzbu.tekst}
                                    </p>
                                )}

                                {isOtvoreno && !isVecOcjenjeno && (
                                    <form className="rating-inline-card" onSubmit={(e) => posaljiOcjenu(e, n)}>
                                        <div className="rating-inline-header">
                                            <h4>Kako vam se svidjela narudžba?</h4>
                                            <p>Ocijenite hranu i uslugu restorana {n.restoranNaziv || ''}</p>
                                        </div>

                                        <div className="interactive-stars" role="radiogroup" aria-label="Ocjena">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    type="button"
                                                    key={star}
                                                    role="radio"
                                                    aria-checked={ocjena === star}
                                                    aria-label={`${star} od 5`}
                                                    className={`star-btn${star <= (hoverOcjena || ocjena) ? ' filled' : ''}`}
                                                    onClick={() => setOcjena(star)}
                                                    onMouseEnter={() => setHoverOcjena(star)}
                                                    onMouseLeave={() => setHoverOcjena(0)}
                                                >
                                                    <Star size={28} fill="currentColor" aria-hidden="true" />
                                                </button>
                                            ))}
                                            <span className="star-rating-label">
                                                {hoverOcjena || ocjena} / 5
                                            </span>
                                        </div>

                                        <div className="rating-form-group">
                                            <label className="sr-only" htmlFor={`komentar-${n.id}`}>Komentar</label>
                                            <textarea
                                                id={`komentar-${n.id}`}
                                                value={komentar}
                                                onChange={(e) => setKomentar(e.target.value)}
                                                placeholder="Napišite vaše utiske (opcionalno)..."
                                                rows="3"
                                            />
                                        </div>

                                        <button type="submit" className="btn-submit-rating" disabled={slanje}>
                                            {slanje ? 'Slanje...' : 'Pošalji ocjenu'}
                                        </button>
                                    </form>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {ukupnoStranica > 1 && (
                <nav className="orders-pagination" aria-label="Stranice narudžbi">
                    <button
                        type="button"
                        onClick={() => setStranica(Math.max(trenutnaStranica - 1, 1))}
                        disabled={trenutnaStranica === 1}
                    >
                        <ChevronLeft size={16} aria-hidden="true" /> Prethodna
                    </button>

                    <span>{trenutnaStranica} / {ukupnoStranica}</span>

                    <button
                        type="button"
                        onClick={() => setStranica(Math.min(trenutnaStranica + 1, ukupnoStranica))}
                        disabled={trenutnaStranica === ukupnoStranica}
                    >
                        Sljedeća <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </nav>
            )}
        </div>
    );
};

export default MojeNarudzbe;
