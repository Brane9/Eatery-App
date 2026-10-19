import React, { useEffect, useState } from 'react';
import API from '../api';
import './PromjenaSifre.css';

const MIN_DUZINA = 6;
const praznaForma = { trenutnaSifra: '', novaSifra: '', potvrda: '' };

const formatDatum = (vrijednost) => {
    const d = new Date(vrijednost);
    if (isNaN(d)) return null;
    const dva = (n) => String(n).padStart(2, '0');
    return `${dva(d.getDate())}.${dva(d.getMonth() + 1)}.${d.getFullYear()}. u ${dva(d.getHours())}:${dva(d.getMinutes())}`;
};

const citajGresku = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    return data?.message || fallback;
};

function PromjenaSifre() {
    const [status, setStatus] = useState(null);
    const [otvoreno, setOtvoreno] = useState(false);
    const [forma, setForma] = useState(praznaForma);
    const [slanje, setSlanje] = useState(false);
    const [poruka, setPoruka] = useState(null);

    const ucitajStatus = () => {
        API.get('/korisnik/promjena-sifre')
            .then((res) => setStatus(res.data))
            .catch(() => setStatus(null));
    };

    useEffect(ucitajStatus, []);

    const handleChange = (e) => setForma({ ...forma, [e.target.name]: e.target.value });

    const zatvori = () => {
        setForma(praznaForma);
        setOtvoreno(false);
    };

    const posalji = async (e) => {
        e.preventDefault();
        setPoruka(null);

        if (forma.novaSifra.length < MIN_DUZINA) {
            setPoruka({ tip: 'greska', tekst: `Nova šifra mora imati najmanje ${MIN_DUZINA} znakova.` });
            return;
        }
        if (forma.novaSifra !== forma.potvrda) {
            setPoruka({ tip: 'greska', tekst: 'Nova šifra i potvrda se ne podudaraju.' });
            return;
        }

        setSlanje(true);
        try {
            const res = await API.post('/korisnik/promjena-sifre', {
                trenutnaSifra: forma.trenutnaSifra,
                novaSifra: forma.novaSifra
            });
            setPoruka({ tip: 'uspjeh', tekst: res.data?.message || 'Zahtjev je poslan administratoru.' });
            zatvori();
            ucitajStatus();
        } catch (err) {
            setPoruka({ tip: 'greska', tekst: citajGresku(err, 'Zahtjev nije mogao biti poslan.') });
        } finally {
            setSlanje(false);
        }
    };

    const naCekanju = status?.naCekanju;
    const datum = status?.datumPodnosenja ? formatDatum(status.datumPodnosenja) : null;

    return (
        <div className="promjena-sifre">
            <div className="promjena-sifre-header">
                <div className="promjena-sifre-icon">🔒</div>
                <div className="promjena-sifre-naslov">
                    <h3>Promjena šifre</h3>
                    <p>Nova šifra počinje važiti kada je administrator odobri.</p>
                </div>
                {!otvoreno && (
                    <button
                        type="button"
                        className="promjena-sifre-otvori"
                        onClick={() => { setPoruka(null); setOtvoreno(true); }}
                    >
                        Promijeni šifru
                    </button>
                )}
            </div>

            {naCekanju && (
                <div className="promjena-sifre-status">
                    <strong>Zahtjev čeka odobrenje administratora.</strong>
                    <span>
                        {datum ? `Poslan ${datum}. ` : ''}Do odobrenja se prijavljujete dosadašnjom šifrom.
                    </span>
                </div>
            )}

            {otvoreno && (
                <form className="promjena-sifre-forma" onSubmit={posalji}>
                    <label className="puna-sirina">
                        Trenutna šifra
                        <input
                            type="password"
                            name="trenutnaSifra"
                            autoComplete="current-password"
                            value={forma.trenutnaSifra}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Nova šifra
                        <input
                            type="password"
                            name="novaSifra"
                            autoComplete="new-password"
                            minLength={MIN_DUZINA}
                            value={forma.novaSifra}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Ponovite novu šifru
                        <input
                            type="password"
                            name="potvrda"
                            autoComplete="new-password"
                            value={forma.potvrda}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    {naCekanju && (
                        <p className="promjena-sifre-napomena puna-sirina">
                            Novi zahtjev će zamijeniti onaj koji već čeka odobrenje.
                        </p>
                    )}
                    <div className="promjena-sifre-akcije puna-sirina">
                        <button type="submit" className="promjena-sifre-posalji" disabled={slanje}>
                            {slanje ? 'Slanje...' : 'Pošalji zahtjev'}
                        </button>
                        <button type="button" className="promjena-sifre-otkazi" onClick={zatvori} disabled={slanje}>
                            Otkaži
                        </button>
                    </div>
                </form>
            )}

            {poruka && (
                <p className={`promjena-sifre-poruka ${poruka.tip}`}>{poruka.tekst}</p>
            )}
        </div>
    );
}

export default PromjenaSifre;