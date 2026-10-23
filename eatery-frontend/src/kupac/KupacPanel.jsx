import React, { useState, useEffect } from 'react';
import {
    Store,
    ReceiptText,
    User,
    ShoppingBag,
    LogOut,
    Gift,
    MapPin,
    ArrowRight,
    ChevronLeft,
    Plus,
    Minus,
    Trash2,
    X,
    Bell,
    Lock,
    Search,
    Utensils,
    CircleCheck,
    Clock,
    Package,
    KeyRound
} from 'lucide-react';
import API from '../api';
import MojeNarudzbe from './MojeNarudzbe';
import KupacProfil from './KupacProfil';
import HeroVrecice from './HeroVrecice';
import './KupacPanel.css';
import '../styles/eatery-styles.css';
import KupacMapa from './KupacMapa';
import { statusRadnogVremena, statusTerminaNarudzbe, formatTerminNarudzbe } from './radnoVrijeme';
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

const idRestorana = (r) => r?.id || r?.idKorisnika;
const jeVrecicaId = (id) => String(id || '').startsWith('vrecica');

const NAVIGACIJA = [
    { id: 'restorani', label: 'Restorani', Icon: Store },
    { id: 'narudzbe', label: 'Moje narudžbe', kratko: 'Narudžbe', Icon: ReceiptText },
    { id: 'profil', label: 'Moj profil', kratko: 'Profil', Icon: User }
];

const IKONE_NOTIFIKACIJA = {
    status: Package,
    vrecica: Gift,
    zatvoreno: Lock,
    info: Bell
};

function KupacPanel({ user, onLogout, onUserUpdate }) {

    const [restorani, setRestorani] = useState([]);
    const [izabraniRestoran, setIzabraniRestoran] = useState(null);
    const [zadnjiRestoran, setZadnjiRestoran] = useState(null);
    const [prikaziRecenzije, setPrikaziRecenzije] = useState(false);
    const [jela, setJela] = useState([]);
    const [korpa, setKorpa] = useState([]);
    const [adresa, setAdresa] = useState('');
    const [poruka, setPoruka] = useState('');
    const [osveziNarudzbe, setOsveziNarudzbe] = useState(0);
    const [pretragaJela, setPretragaJela] = useState('');

    const [notifikacija, setNotifikacija] = useState(null);
    const [potvrda, setPotvrda] = useState(null);
    const [aktivnaStranica, setAktivnaStranica] = useState('restorani');
    const [narudzbaGreska, setNarudzbaGreska] = useState('');
    const [slanjeNarudzbe, setSlanjeNarudzbe] = useState(false);
    const [blizina, setBlizina] = useState({ broj: null, ucitavanje: true, imaLokaciju: false });

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
                        tip: 'status',
                        naslov: 'Status narudžbe promijenjen',
                        tekst: `Narudžba ${poruka.sifra || ''} — novi status: ${poruka.noviStatus}`,
                        akcija: 'narudzbe'
                    });
                    setOsveziNarudzbe(prev => prev + 1);
                }

                // Počeo je termin preuzimanja vrećice iznenađenja koji je definisao restoran
                if (poruka?.tip === 'VRECICA_SPREMNA') {
                    odsviraliObavjestenje();
                    setNotifikacija({
                        tip: 'vrecica',
                        naslov: 'Možete doći po vrećicu iznenađenja!',
                        tekst: `${poruka.restoranNaziv || 'Restoran'} vas očekuje od ${poruka.preuzimanjeOd} do ${poruka.preuzimanjeDo}.`
                            + (poruka.pin ? ` PIN za preuzimanje: ${poruka.pin}` : ''),
                        trajna: true,
                        akcija: 'narudzbe'
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

    useEffect(() => {
        if (!poruka) return;
        const timer = setTimeout(() => setPoruka(''), 3500);
        return () => clearTimeout(timer);
    }, [poruka]);

    useEffect(() => {
        if (!potvrda) return;
        const zatvoriNaEscape = (e) => {
            if (e.key === 'Escape') setPotvrda(null);
        };
        window.addEventListener('keydown', zatvoriNaEscape);
        return () => window.removeEventListener('keydown', zatvoriNaEscape);
    }, [potvrda]);

    const ucitajJela = async (rId) => {
        try {
            const res = await API.get(`/restoran/${rId}/jela`);
            setJela(res.data);
        } catch (err) {
            console.error('Greška pri učitavanju jela:', err);
            setJela([]);
        }
    };

    const pripremiRestoran = (restoran) => {
        const rId = idRestorana(restoran);
        const izListe = restorani.find(x => idRestorana(x) === rId);
        return {
            ...izListe,
            ...restoran,
            nazivObjekta: restoran.nazivObjekta || restoran.naziv || izListe?.nazivObjekta,
            radnoVrijemeOd: restoran.radnoVrijemeOd ?? izListe?.radnoVrijemeOd ?? '',
            radnoVrijemeDo: restoran.radnoVrijemeDo ?? izListe?.radnoVrijemeDo ?? ''
        };
    };

    // Korpa se prazni samo kad kupac pređe u drugi restoran, jer narudžba ide jednom restoranu
    const otvoriRestoran = (restoran, { zadrziKorpu = false } = {}) => {
        const rId = idRestorana(restoran);
        const drugiRestoran = idRestorana(zadnjiRestoran) !== rId;
        const pripremljen = pripremiRestoran(restoran);

        if (drugiRestoran && !zadrziKorpu) {
            if (korpa.length > 0) setPoruka('Korpa je ispražnjena jer ste otvorili drugi restoran.');
            setKorpa([]);
        }

        setIzabraniRestoran(pripremljen);
        setZadnjiRestoran(pripremljen);
        setNarudzbaGreska('');
        setPretragaJela('');
        setAktivnaStranica('restorani');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (drugiRestoran || jela.length === 0) {
            setJela([]);
            ucitajJela(rId);
        }
        return drugiRestoran;
    };

    const izaberiRestoran = (restoran) => {
        otvoriRestoran(restoran);
    };

    const dodajUKorpu = (jelo, { zamijeniKorpu = false } = {}) => {
        const novaJeVrecica = jeVrecicaId(jelo.id);
        let dodato = true;

        setKorpa(prev => {
            const izvor = zamijeniKorpu ? [] : prev;
            const konflikt = izvor.some(item => jeVrecicaId(item.jelo.id) !== novaJeVrecica);
            if (konflikt) {
                dodato = false;
                return prev;
            }
            const postojeca = izvor.find(item => item.jelo.id === jelo.id);
            if (postojeca) {
                return izvor.map(item => item.jelo.id === jelo.id ? { ...item, kolicina: item.kolicina + 1 } : item);
            }
            return [...izvor, { jelo, kolicina: 1 }];
        });

        if (!dodato) {
            setPoruka(
                novaJeVrecica
                    ? 'Vrećica se preuzima u restoranu, a jela iz korpe se dostavljaju na adresu. Naručite ih odvojeno — prvo završite ili očistite korpu.'
                    : 'U korpi je vrećica za preuzimanje u restoranu. Jela naručite kao posebnu narudžbu (dostava na adresu).'
            );
        }
        return dodato;
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
        const restoran = vrecica.restoran || {};
        const istiRestoran = izabraniRestoran && idRestorana(izabraniRestoran) === idRestorana(restoran);

        let korpaIspraznjena = false;
        if (!istiRestoran) {
            const drugiRestoran = idRestorana(zadnjiRestoran) !== idRestorana(restoran);
            korpaIspraznjena = drugiRestoran && korpa.length > 0;
            otvoriRestoran(restoran);
        }

        const vrecicaJelo = {
            id: `vrecica_${vrecica.id}`,
            naziv: `🎁 ${vrecica.naziv}`,
            cijena: vrecica.akcijskaCijena,
            opis: vrecica.alergijskaUpozorenja ? `${vrecica.opis || ''} Alergeni: ${vrecica.alergijskaUpozorenja}`.trim() : vrecica.opis
        };

        const dodato = dodajUKorpu(vrecicaJelo, { zamijeniKorpu: !istiRestoran });
        if (!dodato) return;
        setPoruka(
            korpaIspraznjena
                ? `Dodato u korpu: ${vrecica.naziv}. Prethodna korpa iz drugog restorana je ispražnjena.`
                : `Dodato u korpu: ${vrecica.naziv}`
        );
    };

    const ukupnaCijenaKorpe = korpa.reduce((sum, item) => sum + item.jelo.cijena * item.kolicina, 0);
    const brojArtikala = korpa.reduce((sum, item) => sum + item.kolicina, 0);
    const korpaSamoVrecice = korpa.length > 0 && korpa.every(item => jeVrecicaId(item.jelo.id));
    const korpaSamoJela = korpa.length > 0 && korpa.every(item => !jeVrecicaId(item.jelo.id));

    const posaljiNarudzbu = async (e) => {
        if (e) e.preventDefault();
        if (korpa.length === 0) {
            setNarudzbaGreska('Vaša korpa je prazna.');
            return;
        }
        const statusSada = statusRadnogVremena(izabraniRestoran?.radnoVrijemeOd, izabraniRestoran?.radnoVrijemeDo);
        if (statusSada.open === false) {
            const tekst = porukaZatvorenogRestorana(statusSada);
            setNarudzbaGreska(tekst);
            setNotifikacija({ tip: 'zatvoreno', naslov: 'Restoran je zatvoren', tekst: 'Narudžba nije moguća.' });
            return;
        }

        const kId = user?.id || user?.idKorisnika;
        const rId = idRestorana(izabraniRestoran);

        if (!kId || !rId) {
            setNarudzbaGreska('Nedostaje ID kupca ili restorana.');
            return;
        }

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
            setNarudzbaGreska('Greška: Jedan od artikala nema ispravan ID.');
            return;
        }

        if (!korpaSamoVrecice && !korpaSamoJela) {
            setNarudzbaGreska('Jela i vrećica iznenađenja ne mogu u istoj narudžbi. Naručite ih odvojeno.');
            return;
        }

        if (korpaSamoJela && !adresa.trim()) {
            setNarudzbaGreska('Unesite adresu dostave za jela.');
            return;
        }

        const dto = {
            kupacId: Number(kId),
            restoranId: Number(rId),
            adresaDostave: korpaSamoVrecice ? 'Preuzimanje u restoranu' : adresa.trim(),
            ukupnaCijena: Number(ukupnaCijenaKorpe),
            stavke: stavkeDTO
        };

        try {
            setSlanjeNarudzbe(true);
            const odgovor = await API.post('/narudzbe', dto);
            const { pin, preuzimanjeOd, preuzimanjeDo } = odgovor.data || {};
            const statusTermina = statusTerminaNarudzbe(preuzimanjeOd, preuzimanjeDo);

            setPotvrda({
                pin: pin || null,
                restoran: nazivRestorana,
                ukupno: ukupnaCijenaKorpe,
                statusTermina,
                termin: statusTermina ? formatTerminNarudzbe(preuzimanjeOd, preuzimanjeDo) : ''
            });
            setKorpa([]);
            setAdresa('');
            setNarudzbaGreska('');
            setOsveziNarudzbe(prev => prev + 1);
        } catch (err) {
            console.error('Greška:', err.response?.data || err.message);
            const tekst = citajGreskuApi(err, 'Greška prilikom slanja narudžbe.');
            setNarudzbaGreska(tekst);
            if (/zatvoren/i.test(tekst)) {
                setNotifikacija({ tip: 'zatvoreno', naslov: 'Restoran je zatvoren', tekst: 'Narudžba nije moguća.' });
            }
        } finally {
            setSlanjeNarudzbe(false);
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

    const upit = pretragaJela.trim().toLowerCase();
    const filtriranaJela = upit
        ? grupisanaJela
            .map(g => ({
                ...g,
                jela: g.jela.filter(j =>
                    `${j.naziv || ''} ${j.opis || ''}`.toLowerCase().includes(upit)
                )
            }))
            .filter(g => g.jela.length > 0)
        : grupisanaJela;

    const kolicinaUKorpi = (jeloId) => korpa.find(item => item.jelo.id === jeloId)?.kolicina || 0;

    const restoranZatvoren = statusIzabranog.open === false;

    const idiNa = (stranica) => {
        setAktivnaStranica(stranica);
        setIzabraniRestoran(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const skrolujDo = (id) => {
        setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    const idiNaSekciju = (id) => {
        if (aktivnaStranica !== 'restorani' || izabraniRestoran) {
            setAktivnaStranica('restorani');
            setIzabraniRestoran(null);
        }
        skrolujDo(id);
    };

    const nastaviNarudzbu = () => {
        if (!zadnjiRestoran) return;
        setIzabraniRestoran(zadnjiRestoran);
        setAktivnaStranica('restorani');
        skrolujDo('korpa');
    };

    const idiNaKorpu = () => {
        if (izabraniRestoran) {
            setAktivnaStranica('restorani');
            skrolujDo('korpa');
            return;
        }
        if (korpa.length > 0 && zadnjiRestoran) {
            nastaviNarudzbu();
            return;
        }
        setPoruka('Korpa je prazna. Izaberite restoran ili vrećicu iznenađenja.');
        idiNaSekciju('mapa');
    };

    const NotifikacijaIkona = IKONE_NOTIFIKACIJA[notifikacija?.tip] || Bell;
    const imeKupca = user?.ime || user?.korisnickoIme || 'goste';
    const prikaziNastavak = !izabraniRestoran && korpa.length > 0 && zadnjiRestoran;

    return (
        <div className="kupac-page">
            {notifikacija && (
                <div className={`eatery-toast ${notifikacija.tip || ''}`} role="alert">
                    <span className="eatery-toast-icon" aria-hidden="true">
                        <NotifikacijaIkona size={18} />
                    </span>
                    <div className="eatery-toast-text">
                        <strong>{notifikacija.naslov}</strong>
                        <span>{notifikacija.tekst}</span>
                        {notifikacija.akcija === 'narudzbe' && (
                            <button
                                type="button"
                                className="eatery-toast-link"
                                onClick={() => {
                                    setNotifikacija(null);
                                    idiNa('narudzbe');
                                }}
                            >
                                Pogledaj narudžbe <ArrowRight size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        className="eatery-toast-close"
                        onClick={() => setNotifikacija(null)}
                        aria-label="Zatvori obavještenje"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <aside className="kupac-sidebar" aria-label="Bočni meni">
                <button type="button" className="brand" onClick={() => idiNa('restorani')} aria-label="Eatery početna">
                    <span className="brand-logo" aria-hidden="true">E</span>
                    <span className="brand-text">
                        <span className="brand-name">Eatery</span>
                        <span className="brand-subtitle">Kupac panel</span>
                    </span>
                </button>

                <nav className="sidebar-nav" aria-label="Glavna navigacija">
                    <div>
                        <span className="sidebar-group-label">Navigacija</span>
                        <ul className="sidebar-list">
                            {NAVIGACIJA.map(({ id, label, Icon }) => (
                                <li key={id}>
                                    <button
                                        type="button"
                                        onClick={() => idiNa(id)}
                                        className={aktivnaStranica === id ? 'sidebar-link active' : 'sidebar-link'}
                                        aria-current={aktivnaStranica === id ? 'page' : undefined}
                                    >
                                        <Icon size={20} aria-hidden="true" />
                                        <span className="sidebar-link-label">{label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <span className="sidebar-group-label">Kupovina</span>
                        <ul className="sidebar-list">
                            <li>
                                <button
                                    type="button"
                                    className="sidebar-link"
                                    onClick={idiNaKorpu}
                                    aria-label={`Korpa, ${brojArtikala} artikala`}
                                >
                                    <ShoppingBag size={20} aria-hidden="true" />
                                    <span className="sidebar-link-label">
                                        {brojArtikala > 0 ? `Korpa · ${ukupnaCijenaKorpe.toFixed(2)} KM` : 'Korpa'}
                                    </span>
                                    {brojArtikala > 0 && <span className="sidebar-badge">{brojArtikala}</span>}
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    {user && (
                        <div className="sidebar-user">
                            <span className="sidebar-user-avatar" aria-hidden="true">
                                {(user.ime || user.korisnickoIme || 'K').charAt(0).toUpperCase()}
                            </span>
                            <span className="sidebar-user-text">
                                <strong>{user.ime || user.korisnickoIme || 'Kupac'}</strong>
                                <span>Kupac</span>
                            </span>
                        </div>
                    )}
                    {onLogout && (
                        <button className="sidebar-logout" type="button" onClick={onLogout}>
                            <LogOut size={18} aria-hidden="true" />
                            <span>Odjava</span>
                        </button>
                    )}
                </div>
            </aside>

            <div className="kupac-main">
            <header className="kupac-mobilebar">
                <button type="button" className="brand" onClick={() => idiNa('restorani')} aria-label="Eatery početna">
                    <span className="brand-logo" aria-hidden="true">E</span>
                    <span className="brand-name">Eatery</span>
                </button>
                {onLogout && (
                    <button className="mobilebar-logout" type="button" onClick={onLogout} aria-label="Odjava">
                        <LogOut size={18} aria-hidden="true" />
                    </button>
                )}
            </header>

            <main className="kupac-content">
                {poruka && (
                    <div className="success-message" role="status">
                        <CircleCheck size={18} aria-hidden="true" />
                        <span>{poruka}</span>
                        <button type="button" onClick={() => setPoruka('')} aria-label="Zatvori poruku">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {aktivnaStranica === 'profil' && (
                    <KupacProfil kupacId={user?.id || user?.idKorisnika} user={user} onUserUpdate={onUserUpdate} />
                )}

                {aktivnaStranica === 'narudzbe' && (
                    <section className="page-section" id="narudzbe">
                        <div className="page-heading">
                            <span className="section-label">Moja aktivnost</span>
                            <h1>Moje narudžbe</h1>
                            <p>Pratite status trenutnih narudžbi i ocijenite završene.</p>
                        </div>
                        <MojeNarudzbe
                            kupacId={user?.id || user?.idKorisnika}
                            key={osveziNarudzbe}
                            onNovaNarudzba={() => idiNaSekciju('mapa')}
                        />
                    </section>
                )}

                {aktivnaStranica === 'restorani' && !izabraniRestoran && (
                    <>
                        <section className="welcome-section">
                            <div className="welcome-text">
                                <span className="section-label">Dobrodošli na Eatery</span>
                                <h1>Zdravo, <span>{imeKupca}</span>!</h1>
                                <p>Šta vam se jede danas? Izaberite restoran u blizini ili spasite hranu uz vrećicu iznenađenja.</p>
                            </div>

                            <div className="quick-actions" role="list">
                                <button type="button" className="quick-action amber" onClick={() => idiNaSekciju('vrecice')} role="listitem">
                                    <span className="quick-action-icon" aria-hidden="true"><Gift size={20} /></span>
                                    <span className="quick-action-text">
                                        <strong>Vrećice iznenađenja</strong>
                                        <span>Hrana po sniženoj cijeni</span>
                                    </span>
                                    <ArrowRight size={16} className="quick-action-arrow" aria-hidden="true" />
                                </button>
                                <button type="button" className="quick-action" onClick={() => idiNaSekciju('mapa')} role="listitem">
                                    <span className="quick-action-icon" aria-hidden="true"><MapPin size={20} /></span>
                                    <span className="quick-action-text">
                                        <strong>Restorani u blizini</strong>
                                        <span>
                                            {blizina.ucitavanje
                                                ? 'Tražimo restorane u blizini...'
                                                : !blizina.imaLokaciju
                                                    ? 'Uključite lokaciju da vidite ponudu'
                                                    : blizina.broj === 0
                                                        ? 'Nema restorana u krugu od 5 km'
                                                        : `${blizina.broj} ${blizina.broj === 1 ? 'restoran' : 'restorana'} u krugu od 5 km`}
                                        </span>
                                    </span>
                                    <ArrowRight size={16} className="quick-action-arrow" aria-hidden="true" />
                                </button>
                                <button type="button" className="quick-action slate" onClick={() => idiNa('narudzbe')} role="listitem">
                                    <span className="quick-action-icon" aria-hidden="true"><ReceiptText size={20} /></span>
                                    <span className="quick-action-text">
                                        <strong>Moje narudžbe</strong>
                                        <span>Status i PIN za preuzimanje</span>
                                    </span>
                                    <ArrowRight size={16} className="quick-action-arrow" aria-hidden="true" />
                                </button>
                            </div>
                        </section>

                        {prikaziNastavak && (
                            <div className="resume-banner">
                                <span className="resume-banner-icon" aria-hidden="true"><ShoppingBag size={20} /></span>
                                <div>
                                    <strong>Imate nedovršenu narudžbu</strong>
                                    <span>
                                        {brojArtikala} {brojArtikala === 1 ? 'artikal' : 'artikala'} iz restorana{' '}
                                        {zadnjiRestoran.nazivObjekta || 'Restoran'} · {ukupnaCijenaKorpe.toFixed(2)} KM
                                    </span>
                                </div>
                                <button type="button" onClick={nastaviNarudzbu}>
                                    Nastavi <ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <section className="hero-vrecice-wrapper" id="vrecice">
                            <HeroVrecice onDodajUVrecicu={rukujDodavanjemVrecice} />
                        </section>

                        <section className="map-section" id="mapa">
                            <KupacMapa onIzaberiRestoran={izaberiRestoran} onBrojUBlizini={setBlizina} />
                        </section>
                    </>
                )}

                {/* SEKCIJA MENIJA ODABRANOG RESTORANA */}
                {aktivnaStranica === 'restorani' && izabraniRestoran && (
                    <section className="menu-layout-section" id="meni">
                        <nav className="breadcrumb" aria-label="Putanja">
                            <button type="button" onClick={() => setIzabraniRestoran(null)}>
                                <ChevronLeft size={16} aria-hidden="true" /> Restorani
                            </button>
                            <span aria-hidden="true">/</span>
                            <span aria-current="page">{nazivRestorana}</span>
                        </nav>

                        <div className="restaurant-header">
                            <div className="restaurant-header-icon" aria-hidden="true">
                                <Utensils size={26} />
                            </div>
                            <div className="restaurant-header-info">
                                <h1>{nazivRestorana}</h1>
                                <div className="restaurant-meta">
                                    <button
                                        type="button"
                                        className="restaurant-rating ocjena-dugme"
                                        onClick={() => setPrikaziRecenzije(true)}
                                        title="Pogledaj recenzije kupaca"
                                    >
                                        <StarRating rating={ocjenaIzabranog.ocjena} readOnly={true} />
                                        <strong>
                                            {ocjenaIzabranog.ocjena > 0 ? ocjenaIzabranog.ocjena.toFixed(1) : 'Nema ocjena'}
                                        </strong>
                                        {ocjenaIzabranog.brojOcjena > 0 && (
                                            <span>({ocjenaIzabranog.brojOcjena})</span>
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
                                        <span className={restoranZatvoren ? 'status-pill closed' : 'status-pill open'}>
                                            <Clock size={13} aria-hidden="true" />
                                            {statusIzabranog.label} · {statusIzabranog.hours}
                                        </span>
                                    )}
                                    {izabraniRestoran.adresa && (
                                        <span className="restaurant-address">
                                            <MapPin size={13} aria-hidden="true" />
                                            {izabraniRestoran.adresa}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button type="button" className="header-cart-info" onClick={() => skrolujDo('korpa')}>
                                <span>Vaša korpa</span>
                                <strong>
                                    {brojArtikala} {brojArtikala === 1 ? 'artikal' : 'artikala'}
                                    {brojArtikala > 0 && ` · ${ukupnaCijenaKorpe.toFixed(2)} KM`}
                                </strong>
                            </button>
                        </div>

                        {restoranZatvoren && (
                            <div className="closed-warning" role="status">
                                <Lock size={16} aria-hidden="true" />
                                Restoran je trenutno zatvoren. Možete pregledati meni, ali naručivanje nije moguće.
                            </div>
                        )}

                        <div className="menu-content">
                            <div className="food-list">
                                <div className="menu-toolbar">
                                    <label className="menu-search">
                                        <Search size={16} aria-hidden="true" />
                                        <span className="sr-only">Pretraži meni</span>
                                        <input
                                            type="search"
                                            placeholder="Pretraži jela..."
                                            value={pretragaJela}
                                            onChange={(e) => setPretragaJela(e.target.value)}
                                        />
                                    </label>

                                    {grupisanaJela.length > 1 && !upit && (
                                        <div className="category-chips" role="list" aria-label="Kategorije">
                                            {grupisanaJela.map(grupa => (
                                                <button
                                                    type="button"
                                                    role="listitem"
                                                    key={grupa.kljuc}
                                                    className="category-chip"
                                                    onClick={() => skrolujDo(`kategorija-${grupa.kljuc}`)}
                                                >
                                                    {grupa.naziv}
                                                    <span>{grupa.jela.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {jela.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon" aria-hidden="true"><Utensils size={26} /></span>
                                        <h3>Meni je trenutno prazan</h3>
                                        <p>Ovaj restoran još nije dodao jela u ponudu.</p>
                                    </div>
                                ) : filtriranaJela.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon" aria-hidden="true"><Search size={26} /></span>
                                        <h3>Nema rezultata za „{pretragaJela}”</h3>
                                        <button type="button" className="text-button" onClick={() => setPretragaJela('')}>
                                            Očisti pretragu
                                        </button>
                                    </div>
                                ) : (
                                    <div className="menu-grouped">
                                        {filtriranaJela.map(grupa => (
                                            <div className="menu-category" key={grupa.kljuc} id={`kategorija-${grupa.kljuc}`}>
                                                <h2 className="menu-category-title">
                                                    {grupa.naziv}
                                                    <span>{grupa.jela.length}</span>
                                                </h2>
                                                <div className="food-items">
                                                    {grupa.jela.map(j => {
                                                        const uKorpi = kolicinaUKorpi(j.id);
                                                        return (
                                                            <article className={uKorpi > 0 ? 'food-card in-cart' : 'food-card'} key={j.id || j.idJela}>
                                                                <div className="food-details">
                                                                    <h3>{j.naziv}</h3>
                                                                    <p>{j.opis || 'Ukusno pripremljeno jelo.'}</p>
                                                                    <strong className="food-price">{Number(j.cijena).toFixed(2)} KM</strong>
                                                                </div>
                                                                {uKorpi > 0 ? (
                                                                    <div className="quantity-control" aria-label={`Količina za ${j.naziv}`}>
                                                                        <button type="button" onClick={() => smanjiKolicinu(j.id)} aria-label="Smanji količinu">
                                                                            <Minus size={15} />
                                                                        </button>
                                                                        <strong>{uKorpi}</strong>
                                                                        <button type="button" onClick={() => povecajKolicinu(j.id)} aria-label="Povećaj količinu">
                                                                            <Plus size={15} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        className="add-food-button"
                                                                        onClick={() => dodajUKorpu(j)}
                                                                        aria-label={`Dodaj ${j.naziv} u korpu`}
                                                                    >
                                                                        <Plus size={16} aria-hidden="true" />
                                                                        <span>Dodaj</span>
                                                                    </button>
                                                                )}
                                                            </article>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <aside className="cart-card" id="korpa" aria-label="Korpa">
                                <div className="cart-header">
                                    <div>
                                        <span className="cart-header-icon" aria-hidden="true"><ShoppingBag size={18} /></span>
                                        <div>
                                            <h2>Vaša korpa</h2>
                                            <p>{brojArtikala === 0 ? 'Nema artikala' : `${brojArtikala} ${brojArtikala === 1 ? 'artikal' : 'artikala'}`}</p>
                                        </div>
                                    </div>
                                    {korpa.length > 0 && (
                                        <button type="button" className="clear-cart" onClick={() => setKorpa([])}>Očisti</button>
                                    )}
                                </div>

                                {korpa.length === 0 ? (
                                    <div className="empty-cart">
                                        <span className="empty-cart-icon" aria-hidden="true"><ShoppingBag size={24} /></span>
                                        <h3>Korpa je prazna</h3>
                                        <p>Dodajte jela iz menija da biste napravili narudžbu.</p>
                                    </div>
                                ) : (
                                    <>
                                        <ul className="cart-items">
                                            {korpa.map(item => {
                                                const jeVrecica = String(item.jelo.id).startsWith('vrecica');
                                                return (
                                                    <li className="cart-item" key={item.jelo.id}>
                                                        <span className={jeVrecica ? 'cart-item-icon amber' : 'cart-item-icon'} aria-hidden="true">
                                                            {jeVrecica ? <Gift size={15} /> : <Utensils size={15} />}
                                                        </span>
                                                        <div className="cart-item-info">
                                                            <h3>{item.jelo.naziv.replace(/^🎁\s*/, '')}</h3>
                                                            <span>{Number(item.jelo.cijena).toFixed(2)} KM / kom</span>
                                                            <div className="cart-item-bottom">
                                                                <div className="quantity-control small">
                                                                    <button type="button" onClick={() => smanjiKolicinu(item.jelo.id)} aria-label="Smanji količinu">
                                                                        <Minus size={13} />
                                                                    </button>
                                                                    <strong>{item.kolicina}</strong>
                                                                    <button type="button" onClick={() => povecajKolicinu(item.jelo.id)} aria-label="Povećaj količinu">
                                                                        <Plus size={13} />
                                                                    </button>
                                                                </div>
                                                                <strong>{(item.jelo.cijena * item.kolicina).toFixed(2)} KM</strong>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="remove-item"
                                                            onClick={() => ukloniIzKorpe(item.jelo.id)}
                                                            aria-label={`Ukloni ${item.jelo.naziv}`}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        <form className="order-form" onSubmit={posaljiNarudzbu}>
                                            {korpaSamoVrecice ? (
                                                <div className="cart-fulfillment-note pickup">
                                                    <Gift size={15} aria-hidden="true" />
                                                    <div>
                                                        <strong>Preuzimanje u restoranu</strong>
                                                        <span>Vrećicu preuzimate u lokalu u terminu restorana. PIN dobijate nakon narudžbe.</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="cart-fulfillment-note">
                                                        <MapPin size={15} aria-hidden="true" />
                                                        <div>
                                                            <strong>Dostava na adresu</strong>
                                                            <span>Jela stižu na unesenu adresu. Vrećicu iznenađenja naručite odvojeno (preuzimanje u lokalu).</span>
                                                        </div>
                                                    </div>
                                                    <label htmlFor="adresa-dostave">Adresa dostave</label>
                                                    <input
                                                        id="adresa-dostave"
                                                        type="text"
                                                        placeholder="Ulica i broj, grad"
                                                        value={adresa}
                                                        onChange={e => setAdresa(e.target.value)}
                                                        autoComplete="street-address"
                                                        required
                                                    />
                                                </>
                                            )}

                                            <div className="summary-total">
                                                <span>Ukupno</span>
                                                <strong>{ukupnaCijenaKorpe.toFixed(2)} KM</strong>
                                            </div>

                                            {(restoranZatvoren || narudzbaGreska) && (
                                                <div className="closed-warning compact" role="alert">
                                                    {narudzbaGreska || porukaZatvorenogRestorana(statusIzabranog)}
                                                </div>
                                            )}
                                            <button type="submit" className="order-button" disabled={slanjeNarudzbe || restoranZatvoren}>
                                                {slanjeNarudzbe ? 'Slanje narudžbe...' : 'Potvrdi i naruči'}
                                                {!slanjeNarudzbe && <ArrowRight size={17} aria-hidden="true" />}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </aside>
                        </div>

                        {brojArtikala > 0 && (
                            <button type="button" className="mobile-cart-bar" onClick={() => skrolujDo('korpa')}>
                                <span className="mobile-cart-count">{brojArtikala}</span>
                                <span>Pogledaj korpu</span>
                                <strong>{ukupnaCijenaKorpe.toFixed(2)} KM</strong>
                            </button>
                        )}
                    </section>
                )}
            </main>

            <footer className="kupac-footer">
                <strong>Eatery</strong>
                <span>© 2026</span>
                <span className="kupac-footer-tagline">Vaša hrana, na vašim vratima.</span>
            </footer>
            </div>

            <nav className="bottom-nav" aria-label="Navigacija">
                {NAVIGACIJA.slice(0, 2).map(({ id, label, kratko, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => idiNa(id)}
                        className={aktivnaStranica === id ? 'bottom-nav-item active' : 'bottom-nav-item'}
                        aria-current={aktivnaStranica === id ? 'page' : undefined}
                    >
                        <Icon size={21} aria-hidden="true" />
                        <span>{kratko || label}</span>
                    </button>
                ))}
                <button type="button" className="bottom-nav-item" onClick={idiNaKorpu}>
                    <span className="bottom-nav-icon">
                        <ShoppingBag size={21} aria-hidden="true" />
                        {brojArtikala > 0 && <span className="cart-badge">{brojArtikala}</span>}
                    </span>
                    <span>Korpa</span>
                </button>
                {NAVIGACIJA.slice(2).map(({ id, label, kratko, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => idiNa(id)}
                        className={aktivnaStranica === id ? 'bottom-nav-item active' : 'bottom-nav-item'}
                        aria-current={aktivnaStranica === id ? 'page' : undefined}
                    >
                        <Icon size={21} aria-hidden="true" />
                        <span>{kratko || label}</span>
                    </button>
                ))}
            </nav>

            {potvrda && (
                <div className="order-dialog-backdrop" onClick={() => setPotvrda(null)}>
                    <div
                        className="order-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="potvrda-naslov"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="order-dialog-icon" aria-hidden="true"><CircleCheck size={30} /></span>
                        <h2 id="potvrda-naslov">Narudžba je poslata!</h2>
                        <p>
                            {potvrda.restoran ? `${potvrda.restoran} je primio vašu narudžbu` : 'Restoran je primio vašu narudžbu'}
                            {' '}u iznosu od {potvrda.ukupno.toFixed(2)} KM.
                        </p>

                        {potvrda.pin && (
                            <div className="order-dialog-pin">
                                <span><KeyRound size={14} aria-hidden="true" /> PIN za preuzimanje</span>
                                <strong>{potvrda.pin}</strong>
                            </div>
                        )}

                        {potvrda.statusTermina && (
                            <div className={`order-dialog-termin ${potvrda.statusTermina}`}>
                                <Clock size={16} aria-hidden="true" />
                                <span>
                                    {potvrda.statusTermina === 'sada'
                                        ? `Preuzimanje je u toku (${potvrda.termin}) — možete doći odmah.`
                                        : `Vrećicu preuzimate ${potvrda.termin}. Dobićete obavještenje kad možete doći.`}
                                </span>
                            </div>
                        )}

                        <div className="order-dialog-actions">
                            <button
                                type="button"
                                className="order-button"
                                onClick={() => {
                                    setPotvrda(null);
                                    idiNa('narudzbe');
                                }}
                            >
                                Prati narudžbu <ArrowRight size={17} aria-hidden="true" />
                            </button>
                            <button type="button" className="secondary-button" onClick={() => setPotvrda(null)}>
                                Nastavi pregled
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KupacPanel;
