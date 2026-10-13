import React, { useEffect, useState } from 'react';
import API from '../api';
import StarRating from './StarRating';
import './Recenzije.css';

const formatDatum = (vrijednost) => {
    const d = new Date(vrijednost);
    if (isNaN(d)) return '';
    const dva = (n) => String(n).padStart(2, '0');
    return `${dva(d.getDate())}.${dva(d.getMonth() + 1)}.${d.getFullYear()}.`;
};

const rijecRecenzija = (n) => {
    const zadnja = n % 10;
    const zadnjeDvije = n % 100;
    return zadnja >= 2 && zadnja <= 4 && (zadnjeDvije < 12 || zadnjeDvije > 14) ? 'recenzije' : 'recenzija';
};

function RecenzijeLista({ restoranId }) {
    const [podaci, setPodaci] = useState(null);
    const [greska, setGreska] = useState('');

    useEffect(() => {
        if (!restoranId) return undefined;
        let aktivno = true;
        API.get(`/recenzije/restoran/${restoranId}`)
            .then((res) => { if (aktivno) setPodaci(res.data); })
            .catch(() => { if (aktivno) setGreska('Recenzije trenutno nije moguće učitati.'); });
        return () => { aktivno = false; };
    }, [restoranId]);

    if (greska) return <p className="recenzije-stanje greska">{greska}</p>;
    if (!podaci) return <p className="recenzije-stanje">Učitavanje recenzija...</p>;

    const recenzije = podaci.recenzije || [];
    const ukupno = recenzije.length;
    const prosjek = Number(podaci.prosjecnaOcjena) || 0;
    const raspodjela = [5, 4, 3, 2, 1].map((zvjezdice) => ({
        zvjezdice,
        broj: recenzije.filter((r) => r.ocjena === zvjezdice).length
    }));

    return (
        <div className="recenzije">
            <div className="recenzije-sazetak">
                <div className="recenzije-prosjek">
                    <strong>{ukupno > 0 ? prosjek.toFixed(1) : '—'}</strong>
                    <StarRating rating={Math.round(prosjek)} readOnly size={16} />
                    <span>{ukupno} {rijecRecenzija(ukupno)}</span>
                </div>

                <div className="recenzije-raspodjela">
                    {raspodjela.map(({ zvjezdice, broj }) => (
                        <div className="recenzije-red" key={zvjezdice}>
                            <span>{zvjezdice} ★</span>
                            <div className="recenzije-traka">
                                <div style={{ width: ukupno > 0 ? `${(broj / ukupno) * 100}%` : '0%' }} />
                            </div>
                            <span>{broj}</span>
                        </div>
                    ))}
                </div>
            </div>

            {ukupno === 0 ? (
                <p className="recenzije-stanje">Još nema recenzija.</p>
            ) : (
                <ul className="recenzije-lista">
                    {recenzije.map((r) => (
                        <li key={r.id} className="recenzija">
                            <div className="recenzija-zaglavlje">
                                <div className="recenzija-avatar">{(r.kupac || 'K').charAt(0).toUpperCase()}</div>
                                <div className="recenzija-autor">
                                    <strong>{r.kupac || 'Kupac'}</strong>
                                    <span>{formatDatum(r.datumKreiranja)}</span>
                                </div>
                                <StarRating rating={r.ocjena} readOnly size={14} />
                            </div>
                            {r.komentar ? (
                                <p className="recenzija-komentar">{r.komentar}</p>
                            ) : (
                                <p className="recenzija-komentar bez-komentara">Kupac je ostavio samo ocjenu.</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default RecenzijeLista;
