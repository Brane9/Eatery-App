import React, { useState, useEffect } from 'react';
import API from '../api';
import MojeNarudzbe from './MojeNarudzbe';
import KupacProfil from './KupacProfil';
import HeroVrecice from './HeroVrecice';
import './KupacPanel.css';
import '../styles/eatery-styles.css';
import KupacMapa from './KupacMapa';
import { formatRadnoVrijeme, statusRadnogVremena, statusTerminaNarudzbe, formatTerminNarudzbe } from './radnoVrijeme';
import { pretplatiSeNaTopic, odsviraliObavjestenje } from '../ws';
import StarRating from '../components/StarRating';
import RecenzijeModal from '../components/RecenzijeModal';

// Helper funkcija za pouzdano čitanje ocjene iz bilo koje strukture objekta restorana
const dohvatiPodatkeOOcjeni = (restoran) => {
    if (!restoran) return { ocjena: 0, brojOcjena: 0 };

    const ocjena = Number(
        restoran.prosjecnaOcjena ??
        restoran.ocjenaDto?.prosjecnaOcjena ??
        restoran.prosjecnaOcjenaDto?.prosjecnaOcjena ??
        restoran.ocjena ??
        0
    );

    const brojOcjena = Number(
        restoran.ukupanBrojOcjena ??
        restoran.ocjenaDto?.ukupanBrojOcjena ??
        restoran.prosjecnaOcjenaDto?.ukupanBrojOcjena ??
        restoran.brojOcjena ??
        0
    );

    return { ocjena, brojOcjena };
};

const porukaZatvorenogRestorana = (status) => {
    if (status?.hours) {
        return `Restoran je trenutno zatvoren. Narudžba nije moguća. Radno vrijeme: ${status.hours}.`;
    }
    return 'Restoran je trenutno zatvoren. Narudžba nije moguća.';
};

const citajGreskuApi = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data?.message) return data.message;
    return fallback || err?.message || 'Greška prilikom slanja narudžbe.';
};

function KupacPanel({ user, onLogout, onUserUpdate }) {

    const [restorani, setRestorani] = useState([]);
    const [izabraniRestoran, setIzabraniRestoran] = useState(null);
    const [jela, setJela] = useState([]);
    const [korpa, setKorpa] = useState([]);
    const [adresa, setAdresa] = useState('');
    const [poruka, setPoruka] = useState('');
    const [osveziNarudzbe, setOsveziNarudzbe] = useState(0);

    const [notifikacija, setNotifikacija] = useState(null);
    const [poslednjiPin, setPoslednjiPin] = useState(null);
    const [aktivnaStranica, setAktivnaStranica] = useState('restorani');
    const [narudzbaGreska, setNarudzbaGreska] = useState('');
    const [prikaziRecenzije, setPrikaziRecenzije] = useState(false);

    useEffect(() => {
        API.get('/kupac/restorani')
            .then(res => setRestorani(res.data))
            .catch(err => console.error('Greška pri učitavanju restorana:', err));
    }, []);

    useEffect(() => {
        const kupacId = user?.id || user?.idKorisnika;
        if (!kupacId) return;

        const client = pretplatiSeNaTopic(
            `/topic/kupac/${kupacId}`,
            (poruka) => {
                if (poruka?.tip === 'STATUS_PROMIJENJEN') {
                    odsviraliObavjestenje();
                    setNotifikacija({
                        naslov: '📦 Status narudžbe promijenjen',
                        tekst: `Narudžba ${poruka.sifra || ''} — novi status: ${poruka.noviStatus}`
                    });
                    setOsveziNarudzbe(prev => prev + 1);
                }

                // Počeo je termin preuzimanja vrećice iznenađenja koji je definisao restoran
                if (poruka?.tip === 'VRECICA_SPREMNA') {
                    odsviraliObavjestenje();
                    setNotifikacija({
                        ikona: '🎁',
                        naslov: 'Možete doći po vrećicu iznenađenja!',
                        tekst: `${poruka.restoranNaziv || 'Restoran'} vas očekuje od ${poruka.preuzimanjeOd} do ${poruka.preuzimanjeDo}.`
                            + (poruka.pin ? ` PIN za preuzimanje: ${poruka.pin}` : ''),
                        trajna: true
                    });
                    setOsveziNarudzbe(prev => prev + 1);
                }
            }
        );

        return () => client.deactivate();
    }, [user]);

    useEffect(() => {
        if (!notifikacija || notifikacija.trajna) return; // obavještenje o preuzimanju ostaje dok ga kupac ne zatvori
        const timer = setTimeout(() => setNotifikacija(null), 6000);
        return () => clearTimeout(timer);
    }, [notifikacija]);

    const izaberiRestoran = async (restoran) => {
        const rId = restoran.id || restoran.idKorisnika;
        const izListe = restorani.find(x => (x.id || x.idKorisnika) === rId);
        setIzabraniRestoran({
            ...izListe,
            ...restoran,
            nazivObjekta: restoran.nazivObjekta || restoran.naziv || izListe?.nazivObjekta,
            radnoVrijemeOd: restoran.radnoVrijemeOd ?? izListe?.radnoVrijemeOd ?? '',
            radnoVrijemeDo: restoran.radnoVrijemeDo ?? izListe?.radnoVrijemeDo ?? ''
        });
        setKorpa([]);
        setNarudzbaGreska('');
        setAktivnaStranica('restorani');

        try {
            const res = await API.get(`/restoran/${rId}/jela`);
            setJela(res.data);
        } catch (err) {
            console.error('Greška pri učitavanju jela:', err);
        }
    };

    const dodajUKorpu = (jelo) => {
        const postojeca = korpa.find(item => item.jelo.id === jelo.id);
        if (postojeca) {
            setKorpa(korpa.map(item => item.jelo.id === jelo.id ? { ...item, kolicina: item.kolicina + 1 } : item));
        } else {
            setKorpa([...korpa, { jelo, kolicina: 1 }]);
        }
    };

    const povecajKolicinu = (id) => {
        setKorpa(korpa.map(item => item.jelo.id === id ? { ...item, kolicina: item.kolicina + 1 } : item));
    };

    const smanjiKolicinu = (id) => {
        setKorpa(korpa.map(item => item.jelo.id === id ? { ...item, kolicina: item.kolicina - 1 } : item).filter(item => item.kolicina > 0));
    };

    const ukloniIzKorpe = (id) => {
        setKorpa(korpa.filter(item => item.jelo.id !== id));
    };

    const rukujDodavanjemVrecice = (vrecica) => {
        if (!izabraniRestoran || (izabraniRestoran.id !== vrecica.restoran?.id && izabraniRestoran.idKorisnika !== vrecica.restoran?.idKorisnika)) {
            const restoran = vrecica.restoran || {};
            const rId = restoran.id || restoran.idKorisnika;
            const izListe = restorani.find(x => (x.id || x.idKorisnika) === rId);
            setIzabraniRestoran({
                ...izListe,
                ...restoran,
                nazivObjekta: restoran.nazivObjekta || restoran.naziv || izListe?.nazivObjekta,
                radnoVrijemeOd: restoran.radnoVrijemeOd ?? izListe?.radnoVrijemeOd ?? '',
                radnoVrijemeDo: restoran.radnoVrijemeDo ?? izListe?.radnoVrijemeDo ?? ''
            });
        }

        const vrecicaJelo = {
            id: `vrecica_${vrecica.id}`,
            naziv: `🎁 ${vrecica.naziv}`,
            cijena: vrecica.akcijskaCijena,
            opis: vrecica.alergijskaUpozorenja ? `${vrecica.opis || ''} Alergeni: ${vrecica.alergijskaUpozorenja}`.trim() : vrecica.opis
        };

        dodajUKorpu(vrecicaJelo);
        setPoruka(`Dodato u korpu: ${vrecica.naziv}`);
        setTimeout(() => setPoruka(''), 3000);
    };

    const ukupnaCijenaKorpe = korpa.reduce((sum, item) => sum + item.jelo.cijena * item.kolicina, 0);
    const brojArtikala = korpa.reduce((sum, item) => sum + item.kolicina, 0);

    const posaljiNarudzbu = async (e) => {
        if (e) e.preventDefault();
        if (korpa.length === 0) return alert('Vaša korpa je prazna!');
        const statusSada = statusRadnogVremena(izabraniRestoran?.radnoVrijemeOd, izabraniRestoran?.radnoVrijemeDo);
        if (statusSada.open === false) {
            const tekst = porukaZatvorenogRestorana(statusSada);
            setNarudzbaGreska(tekst);
            setNotifikacija({ naslov: 'Restoran je zatvoren', tekst: 'Narudžba nije moguća.' });
            return;
        }

        const kId = user?.id || user?.idKorisnika;
        const rId = izabraniRestoran?.id || izabraniRestoran?.idKorisnika;

        if (!kId || !rId) return alert('Nedostaje ID kupca ili restorana!');

        const stavkeDTO = korpa.map(item => {
            const artikal = item.jelo || item.vrecica || item;
            let siroviId = artikal.id || artikal.idJela || artikal.vrecicaId;
            const jeVrecica = (typeof siroviId === 'string' && siroviId.includes('vrecica')) || artikal.akcijskaCijena !== undefined;

            if (typeof siroviId === 'string' && siroviId.includes('_')) {
                siroviId = siroviId.split('_')[1];
            }

            const konvertovanId = Number(siroviId);
            const cijena = artikal.cijena || artikal.akcijskaCijena || 0;

            return {
                jeloId: !isNaN(konvertovanId) ? konvertovanId : null,
                tipStavke: jeVrecica ? 'VRECICA' : 'JELO',
                kolicina: Number(item.kolicina || 1),
                cijena: Number(cijena)
            };
        });

        if (stavkeDTO.some(s => s.jeloId === null)) {
            return alert('Greška: Jedan od artikala nema ispravan ID!');
        }

        const dto = {
            kupacId: Number(kId),
            restoranId: Number(rId),
            adresaDostave: adresa || 'Preuzimanje u restoranu',
            ukupnaCijena: Number(ukupnaCijenaKorpe),
            stavke: stavkeDTO
        };

        try {
            const odgovor = await API.post('/narudzbe', dto);
            const noviPin = odgovor.data?.pin;
            if (noviPin) setPoslednjiPin(noviPin);

            let tekstPotvrde = noviPin ? `🎉 Narudžba poslata! PIN za preuzimanje: ${noviPin}` : '🎉 Narudžba uspešno poslata!';
            const { preuzimanjeOd, preuzimanjeDo } = odgovor.data || {};
            const statusTermina = statusTerminaNarudzbe(preuzimanjeOd, preuzimanjeDo);
            if (statusTermina) {
                const termin = formatTerminNarudzbe(preuzimanjeOd, preuzimanjeDo);
                tekstPotvrde += statusTermina === 'sada'
                    ? `\n\n🕒 Preuzimanje je u toku (${termin}) — možete doći odmah.`
                    : `\n\n🕒 Vrećicu preuzimate ${termin}. Dobićete obavještenje kad možete doći.`;
            }
            alert(tekstPotvrde);
            setKorpa([]);
            setAdresa('');
            setNarudzbaGreska('');
            setOsveziNarudzbe(prev => prev + 1);
        } catch (err) {
            console.error('Greška:', err.response?.data || err.message);
            const tekst = citajGreskuApi(err, 'Greška prilikom slanja narudžbe.');
            setNarudzbaGreska(tekst);
            if (/zatvoren/i.test(tekst)) {
                setNotifikacija({ naslov: 'Restoran je zatvoren', tekst: 'Narudžba nije moguća.' });
            } else {
                alert(`Greška prilikom slanja: ${tekst}`);
            }
        }
    };

    const nazivRestorana = izabraniRestoran?.nazivObjekta || izabraniRestoran?.korisnickoIme;
    const statusIzabranog = statusRadnogVremena(izabraniRestoran?.radnoVrijemeOd, izabraniRestoran?.radnoVrijemeDo);
    const ocjenaIzabranog = dohvatiPodatkeOOcjeni(izabraniRestoran);

    const grupisanaJela = (() => {
        const mapa = new Map();
        jela.forEach(j => {
            const kljuc = j.kategorija?.id ?? 'bez-kategorije';
            const naziv = j.kategorija?.naziv || 'Ostalo';
            if (!mapa.has(kljuc)) mapa.set(kljuc, { kljuc, naziv, jela: [] });
            mapa.get(kljuc).jela.push(j);
        });
        return Array.from(mapa.values()).sort((a, b) => {
            if (a.kljuc === 'bez-kategorije') return 1;
            if (b.kljuc === 'bez-kategorije') return -1;
            return a.naziv.localeCompare(b.naziv);
        });
    })();

    const restoranZatvoren = statusIzabranog.open === false;

    const idiNaRestorane = () => {
        setAktivnaStranica('restorani');
        setIzabraniRestoran(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const idiNaNarudzbe = () => {
        setAktivnaStranica('narudzbe');
        setIzabraniRestoran(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const idiNaProfil = () => {
        setAktivnaStranica('profil');
        setIzabraniRestoran(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const idiNaKorpu = () => {
        if (!izabraniRestoran) {
            if (korpa.length > 0) {
                setPoruka('Otvorite restoran da biste pregledali korpu.');
                setTimeout(() => setPoruka(''), 3000);
            }
            return;
        }
        setAktivnaStranica('restorani');
        setTimeout(() => {
            document.getElementById('korpa')?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    return (
        <div className="kupac-page">
            {notifikacija && (
                <div className="eatery-notifikacija" role="alert">
                    <span className="eatery-notifikacija-icon">{notifikacija.ikona || '📦'}</span>
                    <div className="eatery-notifikacija-tekst">
                        <strong>{notifikacija.naslov}</strong>
                        <span>{notifikacija.tekst}</span>
                    </div>
                    <button type="button" className="eatery-notifikacija-close" onClick={() => setNotifikacija(null)}>✕</button>
                </div>
            )}

            <header className="kupac-navbar">
                <div className="kupac-navbar-inner">
                    <div className="brand" onClick={idiNaRestorane}>
                        <div className="brand-logo">E</div>
                        <div>
                            <div className="brand-name">Eatery</div>
                            <div className="brand-subtitle">Food delivery</div>
                        </div>
                    </div>

                    <nav className="main-nav">
                        <button onClick={idiNaRestorane} className={aktivnaStranica === 'restorani' ? 'nav-link active' : 'nav-link'}>
                            <span>⌂</span> Restorani
                        </button>
                        <button onClick={idiNaNarudzbe} className={aktivnaStranica === 'narudzbe' ? 'nav-link active' : 'nav-link'}>
                            <span>◷</span> Moje narudžbe
                        </button>
                        <button onClick={idiNaProfil} className={aktivnaStranica === 'profil' ? 'nav-link active' : 'nav-link'}>
                            <span>👤</span> Moj profil
                        </button>
                    </nav>

                    <div className="navbar-actions">
                        <button className="navbar-cart" onClick={idiNaKorpu}>
                            <span className="cart-icon">🛒</span>
                            <span>Korpa</span>
                            {brojArtikala > 0 && <span className="cart-badge">{brojArtikala}</span>}
                        </button>
                        {onLogout && (
                            <button className="navbar-logout" type="button" onClick={onLogout}>
                                Odjava
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="kupac-content">
                {aktivnaStranica === 'profil' && (
                    <KupacProfil kupacId={user?.id || user?.idKorisnika} user={user} onUserUpdate={onUserUpdate} />
                )}

                {aktivnaStranica === 'narudzbe' && (
                    <section className="orders-section orders-page" id="narudzbe">
                        <div className="orders-heading">
                            <div>
                                <span className="section-label">MOJA AKTIVNOST</span>
                                <h2>Moje narudžbe</h2>
                                <p>Pregledajte svoje prethodne i trenutne narudžbe.</p>
                            </div>
                        </div>
                        <div className="orders-container">
                            <MojeNarudzbe kupacId={user?.id || user?.idKorisnika} key={osveziNarudzbe} />
                        </div>
                    </section>
                )}

                {aktivnaStranica === 'restorani' && (
                    <>
                        {!izabraniRestoran && (
                            <section className="welcome-section">
                                <div className="welcome-text">
                                    <span className="eyebrow">DOBRODOŠLI NA EATERY</span>
                                    <h1>Zdravo, <span>{user?.ime || user?.korisnickoIme || 'goste'}</span>!</h1>
                                    <p>Pronađite omiljeni restoran na mapi, izaberite jelo i uživajte u brzoj dostavi.</p>
                                </div>
                                <div className="welcome-stats">
                                    <div className="mini-stat">
                                        <strong>{restorani.length}</strong>
                                        <span>dostupnih restorana</span>
                                    </div>
                                    <div className="mini-stat-divider" />
                                    <div className="mini-stat">
                                        <strong>24/7</strong>
                                        <span>brza dostava</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {!izabraniRestoran && (
                            <section className="hero-vrecice-wrapper">
                                <HeroVrecice onDodajUVrecicu={rukujDodavanjemVrecice} />
                            </section>
                        )}

                        {/* PRIKAZ SAMO MAPA I RESTORANA U BLIZINI */}
                        {!izabraniRestoran && (
                            <section className="map-section">
                                <div className="section-heading">
                                    <div>
                                        <span className="section-label">LOKACIJA & PONUDA</span>
                                        <h2>Restorani u vašoj blizini</h2>
                                        <p>Učitajte svoju lokaciju na mapi da vidite dostupne restorane u radijusu sa ocjenama i radnim vremenom.</p>
                                    </div>
                                </div>

                                <KupacMapa onIzaberiRestoran={izaberiRestoran} />
                            </section>
                        )}

                        {poruka && (
                            <div className="success-message">
                                <span className="success-icon">✓</span>
                                <span>{poruka}</span>
                                <button onClick={() => setPoruka('')}>×</button>
                            </div>
                        )}

                        {/* SEKCIJA MENIJA ODABRANOG RESTORANA */}
                        {izabraniRestoran && (
                            <section className="menu-layout-section" id="meni">
                                <button className="back-button" onClick={() => { setIzabraniRestoran(null); setKorpa([]); }}>
                                    <span>←</span> Svi restorani u blizini
                                </button>

                                <div className="restaurant-header">
                                    <div className="restaurant-header-icon">🍽️</div>
                                    <div>
                                        <span className="section-label">MENI RESTORANA</span>
                                        <h2>{nazivRestorana}</h2>

                                        <button
                                            type="button"
                                            className="ocjena-dugme"
                                            style={{ marginTop: '6px' }}
                                            onClick={() => setPrikaziRecenzije(true)}
                                            title="Pogledaj recenzije kupaca"
                                        >
                                            <StarRating rating={ocjenaIzabranog.ocjena} readOnly={true} />
                                            <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827' }}>
                                                {ocjenaIzabranog.ocjena > 0 ? ocjenaIzabranog.ocjena.toFixed(1) : 'Nema ocjena'}
                                            </span>
                                            {ocjenaIzabranog.brojOcjena > 0 && (
                                                <span style={{ color: '#6b7280', fontSize: '13px' }}>
                                                    ({ocjenaIzabranog.brojOcjena} {ocjenaIzabranog.brojOcjena === 1 ? 'ocjena' : 'ocjena'})
                                                </span>
                                            )}
                                            <span className="ocjena-dugme-link">Recenzije</span>
                                        </button>
                                        {prikaziRecenzije && (
                                            <RecenzijeModal
                                                restoranId={izabraniRestoran?.id || izabraniRestoran?.idKorisnika}
                                                naziv={nazivRestorana}
                                                onClose={() => setPrikaziRecenzije(false)}
                                            />
                                        )}
                                        {statusIzabranog.hours && (
                                            <p className={statusIzabranog.open === false ? 'eatery-status-zatvoren' : 'eatery-status-otvoren'}>
                                                {statusIzabranog.label} · {statusIzabranog.hours}
                                            </p>
                                        )}
                                    </div>

                                    <div className="header-cart-info">
                                        <span>Vaša korpa</span>
                                        <strong>{brojArtikala} artikala</strong>
                                    </div>
                                </div>

                                <div className="menu-content">
                                    <div className="food-list">
                                        <div className="food-list-heading">
                                            <div>
                                                <h3>Ponuda jela</h3>
                                                <p>{jela.length} dostupnih stavki</p>
                                            </div>
                                        </div>

                                        {restoranZatvoren && (
                                            <div className="eatery-zatvoreno-upozorenje">
                                                🔒 Restoran je trenutno zatvoren. Naručivanje nije moguće.
                                            </div>
                                        )}

                                        {jela.length === 0 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">🍽️</div>
                                                <h3>Meni je trenutno prazan</h3>
                                            </div>
                                        ) : (
                                            <div className="menu-grouped">
                                                {grupisanaJela.map(grupa => (
                                                    <div className="eatery-kategorija-grupa" key={grupa.kljuc}>
                                                        <div className="eatery-kategorija-naslov">
                                                            {grupa.naziv}
                                                            <span className="broj">{grupa.jela.length}</span>
                                                        </div>
                                                        <div className="food-items">
                                                            {grupa.jela.map(j => (
                                                                <article className="food-card" key={j.id || j.idJela}>
                                                                    <div className="food-image">🍽</div>
                                                                    <div className="food-details">
                                                                        <h4>{j.naziv}</h4>
                                                                        <p>{j.opis || 'Ukusno pripremljeno jelo.'}</p>
                                                                        <strong className="food-price">{Number(j.cijena).toFixed(2)} KM</strong>
                                                                    </div>
                                                                    <button className="add-food-button" onClick={() => dodajUKorpu(j)}>
                                                                        <span>+</span> Dodaj
                                                                    </button>
                                                                </article>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <aside className="cart-card" id="korpa">
                                        <div className="cart-header">
                                            <div>
                                                <span className="cart-header-icon">🛒</span>
                                                <div>
                                                    <h3>Vaša korpa</h3>
                                                    <p>{brojArtikala === 0 ? 'Nema artikala' : `${brojArtikala} artikala`}</p>
                                                </div>
                                            </div>
                                            {korpa.length > 0 && (
                                                <button className="clear-cart" onClick={() => setKorpa([])}>Očisti</button>
                                            )}
                                        </div>

                                        {korpa.length === 0 ? (
                                            <div className="empty-cart">
                                                <div className="empty-cart-icon">🛍️</div>
                                                <h4>Korpa je prazna</h4>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="cart-items">
                                                    {korpa.map(item => (
                                                        <div className="cart-item" key={item.jelo.id}>
                                                            <div className="cart-item-main">
                                                                <div className="cart-item-icon">{item.jelo.naziv.startsWith('🎁') ? '🎁' : '🍴'}</div>
                                                                <div className="cart-item-info">
                                                                    <h4>{item.jelo.naziv}</h4>
                                                                    <span>{Number(item.jelo.cijena).toFixed(2)} KM</span>
                                                                </div>
                                                            </div>
                                                            <div className="cart-item-bottom">
                                                                <div className="quantity-control">
                                                                    <button onClick={() => smanjiKolicinu(item.jelo.id)}>−</button>
                                                                    <strong>{item.kolicina}</strong>
                                                                    <button onClick={() => povecajKolicinu(item.jelo.id)}>+</button>
                                                                </div>
                                                                <strong>{(item.jelo.cijena * item.kolicina).toFixed(2)} KM</strong>
                                                            </div>
                                                            <button className="remove-item" onClick={() => ukloniIzKorpe(item.jelo.id)}>Ukloni</button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="cart-summary">
                                                    <div className="summary-line">
                                                        <span>Ukupno</span>
                                                        <strong>{ukupnaCijenaKorpe.toFixed(2)} KM</strong>
                                                    </div>
                                                </div>

                                                <form className="order-form" onSubmit={posaljiNarudzbu}>
                                                    <label>Adresa dostave</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Unesite adresu dostave..."
                                                        value={adresa}
                                                        onChange={e => setAdresa(e.target.value)}
                                                        required
                                                    />
                                                    {(restoranZatvoren || narudzbaGreska) && (
                                                        <div className="eatery-zatvoreno-upozorenje">
                                                            {narudzbaGreska || porukaZatvorenogRestorana(statusIzabranog)}
                                                        </div>
                                                    )}
                                                    <button type="submit" className="order-button">
                                                        Potvrdi i naruči <span>→</span>
                                                    </button>
                                                </form>
                                            </>
                                        )}
                                    </aside>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            <footer className="kupac-footer">
                <div>
                    <strong>Eatery</strong>
                    <span>© 2026 — Vaša hrana, na vašim vratima.</span>
                </div>
            </footer>
        </div>
    );
}

export default KupacPanel;