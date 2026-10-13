import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./RestoranPanel.css";
import "../styles/eatery-styles.css";
import KlijentProfil from './KlijentProfil';
import RecenzijeLista from '../components/RecenzijeLista';
import API from '../api';
import { pretplatiSeNaTopic, odsviraliObavjestenje } from '../ws';
import { formatTerminNarudzbe } from '../kupac/radnoVrijeme';

const RestoranPanel = ({ restoranId, user, onLogout }) => {

    // =========================================================
    // ID RESTORANA
    // =========================================================

    const stvarniRestoranId =
        restoranId ||
        user?.id ||
        user?.idKorisnika;


    // =========================================================
    // STANJA
    // =========================================================

    const [vrecice, setVrecice] = useState([]);
    const [narudzbe, setNarudzbe] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingNarudzbe, setLoadingNarudzbe] = useState(false);

    const [kategorije, setKategorije] = useState([]);
    const [jela, setJela] = useState([]);
    const [statistika, setStatistika] = useState({
        brojProdanihVrecica: 0,
        brojOtkazanihNarudzbi: 0,
        kgSpaseneHrane: 0,
        prosjecnaOcjena: 0,
        ukupanBrojOcjena: 0
    });

    const [novaKategorija, setNovaKategorija] = useState("");
    const [stranicaNarudzbi, setStranicaNarudzbi] = useState(1);
    const NARUDZBI_PO_STRANICI = 5;

    const [novoJelo, setNovoJelo] = useState({
        naziv: "",
        opis: "",
        cijena: "",
        kategorijaId: ""
    });

    // Izmjena postojećeg jela / vrećice koristi iste forme kao dodavanje
    const [urediJeloId, setUrediJeloId] = useState(null);
    const [urediVrecicuId, setUrediVrecicuId] = useState(null);
    const jeloFormaRef = useRef(null);
    const vrecicaFormaRef = useRef(null);

    // =========================================================
    // NOTIFIKACIJE (FEATURE 2) I PIN POTVRDA PREUZIMANJA (FEATURE 1)
    // =========================================================

    const [notifikacija, setNotifikacija] = useState(null); // { naslov, tekst }
    const [pinUnosi, setPinUnosi] = useState({}); // { [narudzbaId]: "1234" }
    const [pinObrada, setPinObrada] = useState(null); // narudzbaId koji se trenutno obrađuje
    const [pinPoruke, setPinPoruke] = useState({}); // { [narudzbaId]: { tip: 'ok'|'err', tekst } }


    // =========================================================
    // NAVIGACIJA
    // =========================================================

    const [aktivnaSekcija, setAktivnaSekcija] =
        useState("pocetna");


    // =========================================================
    // FORMA ZA VREĆICU
    // =========================================================

    const pocetnaForma = {
        naziv: "Vrećica Iznenađenja",
        opis:
            "Ukusna kombinacija naših današnjih specijaliteta po akcijskoj cijeni!",
        originalnaCijena: "",
        akcijskaCijena: "",
        kolicina: 1,
        tezinaKg: "1",
        vrijemePreuzimanjaOd: "20:00",
        vrijemePreuzimanjaDo: "21:30",
        aktivna: true,
        alergije: [],
        dodatnaAlergija: ""
    };

    const ALERGENI = [
        "Gluten",
        "Mlijeko",
        "Jaja",
        "Kikiriki",
        "Orašasti plodovi",
        "Soja",
        "Riba",
        "Školjke",
        "Celer",
        "Senf",
        "Sezam",
        "Sulfiti"
    ];

    const [forma, setForma] = useState(pocetnaForma);


    // =========================================================
    // UČITAVANJE VREĆICA
    // =========================================================

    const ucitajVrecice = async () => {

        if (!stvarniRestoranId) return;

        try {

            setLoading(true);

            const res = await API.get(`/vrecice/restoran/${stvarniRestoranId}`);
            

            setVrecice(res.data);

        } catch (err) {

            console.error(
                "Greška pri učitavanju vrećica:",
                err
            );

        } finally {

            setLoading(false);
        }
    };


    // =========================================================
    // UČITAVANJE NARUDŽBI
    // =========================================================

    const ucitajNarudzbe = async () => {

        if (!stvarniRestoranId) return;

        try {

            setLoadingNarudzbe(true);

            const res = await API.get(`/restoran/${stvarniRestoranId}/narudzbe`);

            setNarudzbe(res.data);

        } catch (err) {

            console.error(
                "Greška pri učitavanju narudžbi:",
                err
            );

        } finally {

            setLoadingNarudzbe(false);
        }
    };


    const ucitajStatistiku = async () => {

        if (!stvarniRestoranId) return;

        try {
const res = await API.get(`/restoran/${stvarniRestoranId}/statistika`);

            const d = res.data || {};
            setStatistika({
                brojProdanihVrecica:
                    d.brojProdanihVrecica || 0,
                brojOtkazanihNarudzbi:
                    d.brojOtkazanihNarudzbi || 0,
                kgSpaseneHrane:
                    d.kgSpaseneHrane || 0,
                prosjecnaOcjena: Number(
                    d.prosjecnaOcjena ?? d.prosjecna_ocjena ?? 0
                ),
                ukupanBrojOcjena: Number(
                    d.ukupanBrojOcjena ?? d.ukupan_broj_ocjena ?? 0
                )
            });

        } catch (err) {

            console.error(
                "Greška pri učitavanju statistike:",
                err
            );
        }
    };


    // =========================================================
    // UČITAVANJE KATEGORIJA I JELA
    // =========================================================

    const ucitajKategorijeIJela = async () => {

        if (!stvarniRestoranId) return;

        try {

            const resKat = await API.get(`/restoran/${stvarniRestoranId}/kategorije`);

setKategorije(resKat.data);

            if (resKat.data.length > 0) {

                setNovoJelo(prev => ({
                    ...prev,
                    kategorijaId: resKat.data[0].id
                }));
            }


           const resJela = await API.get(`/restoran/${stvarniRestoranId}/jela`);

setJela(resJela.data);

        } catch (err) {

            console.error(
                "Greška pri učitavanju kategorija/jela:",
                err
            );
        }
    };


    // =========================================================
    // INICIJALNO UČITAVANJE
    // =========================================================

    useEffect(() => {

        if (stvarniRestoranId) {

            ucitajVrecice();
            ucitajNarudzbe();
            ucitajKategorijeIJela();
            ucitajStatistiku();
        }

    }, [stvarniRestoranId]);


    // =========================================================
    // POLLING NARUDŽBI - 5 SEKUNDI
    // =========================================================

    useEffect(() => {

        if (!stvarniRestoranId) return;

        const intervalId = setInterval(() => {

            ucitajNarudzbe();

        }, 5000);

        return () => clearInterval(intervalId);

    }, [stvarniRestoranId]);


    // =========================================================
    // FEATURE 2: WEBSOCKET - OBAVJEŠTENJE O NOVOJ NARUDŽBI
    // =========================================================

    useEffect(() => {

        if (!stvarniRestoranId) return;

        const client = pretplatiSeNaTopic(
            `/topic/restoran/${stvarniRestoranId}`,
            (poruka) => {
                if (poruka?.tip === "NOVA_NARUDZBA") {
                    odsviraliObavjestenje();

                    setNotifikacija({
                        naslov: "🔔 Nova narudžba!",
                        tekst: `Narudžba ${poruka.sifra || ""} — ${Number(poruka.ukupnaCijena || 0).toFixed(2)} KM`
                    });

                    ucitajNarudzbe();
                    ucitajStatistiku();
                }
            }
        );

        return () => {
            client.deactivate();
        };

    }, [stvarniRestoranId]);


    // Automatsko sklanjanje notifikacije nakon 6 sekundi
    useEffect(() => {
        if (!notifikacija) return;
        const timer = setTimeout(() => setNotifikacija(null), 6000);
        return () => clearTimeout(timer);
    }, [notifikacija]);


    // =========================================================
    // NAVIGACIJA
    // =========================================================

    const idiNaSekciju = (sekcija, id) => {

        setAktivnaSekcija(sekcija);

        setTimeout(() => {

            document
                .getElementById(id)
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        }, 50);
    };


    // =========================================================
    // DODAVANJE KATEGORIJE
    // =========================================================

    const handleDodajKategoriju = async (e) => {

        e.preventDefault();

        if (!novaKategorija.trim()) return;

        try {

            await API.post(`/restoran/${stvarniRestoranId}/kategorije`, {
    naziv: novaKategorija
});

            alert("Kategorija uspešno dodata!");

            setNovaKategorija("");

            ucitajKategorijeIJela();

        } catch (err) {

            console.error(
                "Greška pri dodavanju kategorije:",
                err
            );

            alert("Greška pri dodavanju kategorije.");
        }
    };


    // =========================================================
    // DODAVANJE JELA
    // =========================================================

    const handleDodajJelo = async (e) => {

        e.preventDefault();

        if (
            !novoJelo.naziv ||
            !novoJelo.cijena ||
            !novoJelo.kategorijaId
        ) {

            alert(
                "Molimo popunite sva obavezna polja za jelo!"
            );

            return;
        }

        const podaciJela = {
            naziv: novoJelo.naziv,
            opis: novoJelo.opis,
            cijena: parseFloat(novoJelo.cijena),
            kategorijaId: parseInt(novoJelo.kategorijaId, 10)
        };

        try {

            if (urediJeloId) {
                await API.put(`/restoran/${stvarniRestoranId}/jela/${urediJeloId}`, podaciJela);
                alert("Jelo je uspješno izmijenjeno.");
            } else {
                await API.post(`/restoran/${stvarniRestoranId}/jela`, podaciJela);
                alert("Jelo uspešno dodato na meni!");
            }

            otkaziIzmjenuJela();

            ucitajKategorijeIJela();

        } catch (err) {

            console.error(
                "Greška pri spremanju jela:",
                err
            );

            alert(
                err.response?.data?.message ||
                (urediJeloId ? "Greška pri izmjeni jela." : "Greška pri dodavanju jela.")
            );
        }
    };

    const zapocniIzmjenuJela = (jelo) => {
        setNovoJelo({
            naziv: jelo.naziv || "",
            opis: jelo.opis || "",
            cijena: jelo.cijena != null ? String(jelo.cijena) : "",
            kategorijaId: jelo.kategorija?.id || kategorije[0]?.id || ""
        });
        setUrediJeloId(jelo.id);
        jeloFormaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const otkaziIzmjenuJela = () => {
        setNovoJelo({
            naziv: "",
            opis: "",
            cijena: "",
            kategorijaId: kategorije[0]?.id || ""
        });
        setUrediJeloId(null);
    };

    const ukloniJelo = async (jelo) => {
        if (!window.confirm(`Ukloniti jelo "${jelo.naziv}" sa menija?`)) {
            return;
        }
        try {
            await API.delete(`/restoran/${stvarniRestoranId}/jela/${jelo.id}`);
            if (urediJeloId === jelo.id) {
                otkaziIzmjenuJela();
            }
            ucitajKategorijeIJela();
        } catch (err) {
            console.error("Greška pri uklanjanju jela:", err);
            alert(err.response?.data?.message || "Greška pri uklanjanju jela.");
        }
    };


    // =========================================================
    // FORMA VREĆICE
    // =========================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setForma({
            ...forma,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        });
    };

    const toggleAlergen = (alergen) => {
        setForma((prev) => {
            const postoji = prev.alergije.includes(alergen);
            return {
                ...prev,
                alergije: postoji
                    ? prev.alergije.filter(a => a !== alergen)
                    : [...prev.alergije, alergen]
            };
        });
    };


    // =========================================================
    // KREIRANJE VREĆICE
    // =========================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!stvarniRestoranId) {

            alert(
                "Greška: Nije pronađen ID restorana!"
            );

            return;
        }

        // Satnica preuzimanja vrećice (npr. 18:00 – 19:30) je obavezna
        if (!forma.vrijemePreuzimanjaOd || !forma.vrijemePreuzimanjaDo) {
            alert("Unesite vrijeme preuzimanja (od – do).");
            return;
        }

        if (forma.vrijemePreuzimanjaOd === forma.vrijemePreuzimanjaDo) {
            alert("Vrijeme početka i kraja preuzimanja ne može biti isto.");
            return;
        }

        const payload = {

            naziv: forma.naziv,

            opis: forma.opis,

            originalnaCijena:
                parseFloat(
                    forma.originalnaCijena
                ),

            akcijskaCijena:
                parseFloat(
                    forma.akcijskaCijena
                ),

            kolicina:
                parseInt(
                    forma.kolicina,
                    10
                ),

            tezinaKg:
                parseFloat(
                    forma.tezinaKg
                ) || 1,

            vrijemePreuzimanjaOd:
                forma.vrijemePreuzimanjaOd,

            vrijemePreuzimanjaDo:
                forma.vrijemePreuzimanjaDo,

            aktivna: forma.aktivna,

            alergijskaUpozorenja: [
                ...forma.alergije,
                forma.dodatnaAlergija.trim()
            ].filter(Boolean).join(", ")
        };

        try {

            if (urediVrecicuId) {
                await API.put(`/vrecice/${urediVrecicuId}`, payload);
                alert("Vrećica je uspješno izmijenjena.");
            } else {
                await API.post(`/vrecice/restoran/${stvarniRestoranId}`, payload);
                alert(
                    "🎉 Vrećica iznenađenja je uspešno kreirana!"
                );
            }

            otkaziIzmjenuVrecice();

            ucitajVrecice();

        } catch (err) {

            console.error(
                "Greška pri spremanju vrećice:",
                err
            );

            alert(
                err.response?.data?.message ||
                (urediVrecicuId ? "Greška prilikom izmjene vrećice." : "Greška prilikom kreiranja vrećice.")
            );
        }
    };

    const zapocniIzmjenuVrecice = (v) => {
        const sviAlergeni = (v.alergijskaUpozorenja || "")
            .split(",")
            .map(a => a.trim())
            .filter(Boolean);

        setForma({
            naziv: v.naziv || "",
            opis: v.opis || "",
            originalnaCijena: v.originalnaCijena != null ? String(v.originalnaCijena) : "",
            akcijskaCijena: v.akcijskaCijena != null ? String(v.akcijskaCijena) : "",
            kolicina: v.kolicina ?? 1,
            tezinaKg: v.tezinaKg != null ? String(v.tezinaKg) : "1",
            vrijemePreuzimanjaOd: v.vrijemePreuzimanjaOd || pocetnaForma.vrijemePreuzimanjaOd,
            vrijemePreuzimanjaDo: v.vrijemePreuzimanjaDo || pocetnaForma.vrijemePreuzimanjaDo,
            aktivna: v.aktivna !== false,
            alergije: sviAlergeni.filter(a => ALERGENI.includes(a)),
            dodatnaAlergija: sviAlergeni.filter(a => !ALERGENI.includes(a)).join(", ")
        });
        setUrediVrecicuId(v.id);
        vrecicaFormaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const otkaziIzmjenuVrecice = () => {
        setForma(pocetnaForma);
        setUrediVrecicuId(null);
    };

    const ukloniVrecicu = async (v) => {
        if (!window.confirm(`Ukloniti vrećicu "${v.naziv}" iz ponude? Kupci je više neće vidjeti.`)) {
            return;
        }
        try {
            await API.delete(`/vrecice/${v.id}`);
            if (urediVrecicuId === v.id) {
                otkaziIzmjenuVrecice();
            }
            ucitajVrecice();
        } catch (err) {
            console.error("Greška pri uklanjanju vrećice:", err);
            alert(err.response?.data?.message || "Greška pri uklanjanju vrećice.");
        }
    };


    // =========================================================
    // PROMJENA STATUSA VREĆICE
    // =========================================================

    const PromijeniStatus = async (
        vrecicaId,
        trenutniStatus
    ) => {

        try {

          await API.put(`/vrecice/${vrecicaId}/status?aktivna=${!trenutniStatus}`);
            ucitajVrecice();

        } catch (err) {

            console.error(
                "Greška pri promjeni statusa vrećice:",
                err
            );
        }
    };


    // =========================================================
    // PROMJENA KOLIČINE VREĆICE
    // =========================================================

    const azurirajKolicinu = async (
        vrecicaId,
        novaKolicina
    ) => {

        if (novaKolicina < 0) return;

        try {

           await API.put(`/vrecice/${vrecicaId}/kolicina?kolicina=${novaKolicina}`);

            ucitajVrecice();

        } catch (err) {

            console.error(
                "Greška pri ažuriranju količine:",
                err
            );
        }
    };


    // =========================================================
    // PROMJENA STATUSA NARUDŽBE
    // =========================================================
const PromijeniStatusNarudzbe = async (narudzbaId, noviStatus) => {
    try {
        // Uklonjen prvi '/api' jer ga tvoj API instance već ima u baseURL
        await API.put(`/narudzbe/${narudzbaId}/status?status=${noviStatus}`);

        ucitajNarudzbe();
        ucitajStatistiku();
    } catch (err) {
        console.error(
            "Greška pri promjeni statusa narudžbe:",
            err.response?.data || err.message
        );
    }
};


    // =========================================================
    // FEATURE 1: POTVRDA PREUZIMANJA PIN-OM
    // =========================================================

    const promijeniPinUnos = (narudzbaId, vrijednost) => {
        const samoCifre = vrijednost.replace(/\D/g, "").slice(0, 4);
        setPinUnosi((prev) => ({ ...prev, [narudzbaId]: samoCifre }));
    };

    const potvrdiPreuzimanje = async (narudzbaId) => {
        const pin = (pinUnosi[narudzbaId] || "").trim();

        if (pin.length !== 4) {
            setPinPoruke((prev) => ({
                ...prev,
                [narudzbaId]: { tip: "err", tekst: "Unesite sve 4 cifre PIN-a." }
            }));
            return;
        }

        try {
            setPinObrada(narudzbaId);

            await API.put(`/restoran/narudzba/${narudzbaId}/preuzimanje?pin=${pin}`);

            setPinPoruke((prev) => ({
                ...prev,
                [narudzbaId]: { tip: "ok", tekst: "Preuzimanje potvrđeno!" }
            }));

            setPinUnosi((prev) => ({ ...prev, [narudzbaId]: "" }));

            ucitajNarudzbe();
            ucitajStatistiku();
        } catch (err) {
            console.error("Greška pri potvrdi preuzimanja:", err);

            const poruka =
                err.response?.data?.message ||
                (typeof err.response?.data === "string" ? err.response.data : null) ||
                "Neispravan PIN ili greška servera.";

            setPinPoruke((prev) => ({ ...prev, [narudzbaId]: { tip: "err", tekst: poruka } }));
        } finally {
            setPinObrada(null);
        }
    };


    // =========================================================
    // BROJ NOVIH NARUDŽBI
    // =========================================================

    const noveNarudzbeBroj =
        narudzbe.filter(
            n =>
                !n.status ||
                n.status === "ZAPRIMLJENO"
        ).length;

    const ukupnoStranicaNarudzbi = Math.max(
        1,
        Math.ceil(narudzbe.length / NARUDZBI_PO_STRANICI)
    );

    const prikazaneNarudzbe = narudzbe.slice(
        (stranicaNarudzbi - 1) * NARUDZBI_PO_STRANICI,
        stranicaNarudzbi * NARUDZBI_PO_STRANICI
    );

    useEffect(() => {
        if (stranicaNarudzbi > ukupnoStranicaNarudzbi) {
            setStranicaNarudzbi(ukupnoStranicaNarudzbi);
        }
    }, [stranicaNarudzbi, ukupnoStranicaNarudzbi]);


    // =========================================================
    // STATISTIKA
    // =========================================================

    const brojJela = jela.length;

    const brojKategorija =
        kategorije.length;

    const brojVrecica =
        vrecice.length;


    // =========================================================
    // FEATURE 5: MENI GRUPISAN PO KATEGORIJAMA
    // =========================================================

    const grupisanaJela = (() => {
        const mapa = new Map();

        jela.forEach(j => {
            const kljuc = j.kategorija?.id ?? "bez-kategorije";
            const naziv = j.kategorija?.naziv || "Bez kategorije";

            if (!mapa.has(kljuc)) {
                mapa.set(kljuc, { kljuc, naziv, jela: [] });
            }
            mapa.get(kljuc).jela.push(j);
        });

        return Array.from(mapa.values()).sort((a, b) => {
            if (a.kljuc === "bez-kategorije") return 1;
            if (b.kljuc === "bez-kategorije") return -1;
            return a.naziv.localeCompare(b.naziv);
        });
    })();


    
    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="restoran-page">

            {notifikacija && (
                <div className="eatery-notifikacija" role="alert">
                    <span className="eatery-notifikacija-icon">🔔</span>
                    <div className="eatery-notifikacija-tekst">
                        <strong>{notifikacija.naslov}</strong>
                        <span>{notifikacija.tekst}</span>
                    </div>
                    <button
                        type="button"
                        className="eatery-notifikacija-close"
                        onClick={() => setNotifikacija(null)}
                    >
                        ✕
                    </button>
                </div>
            )}


            {/* =================================================
                NAVBAR
            ================================================= */}

            <header className="restoran-navbar">

                <div className="restoran-navbar-inner">


                    {/* BRAND */}

                    <div
                        className="restoran-brand"
                        onClick={() =>
                            idiNaSekciju(
                                "pocetna",
                                "pocetna"
                            )
                        }
                    >

                        <div className="restoran-brand-logo">
                            E
                        </div>

                        <div>

                            <div className="restoran-brand-name">
                                Eatery
                            </div>

                            <div className="restoran-brand-subtitle">
                                Restaurant
                            </div>

                        </div>

                    </div>


                    {/* NAV */}

                    <nav className="restoran-main-nav">

                        <button
                            className={
                                aktivnaSekcija === "pocetna"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "pocetna",
                                    "pocetna"
                                )
                            }
                        >
                            <span>⌂</span>
                            Početna
                        </button>


                        <button
                            className={
                                aktivnaSekcija === "analitika"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "analitika",
                                    "analitika"
                                )
                            }
                        >
                            <span>▣</span>
                            Analitika
                        </button>


                        <button
                            className={
                                aktivnaSekcija === "narudzbe"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "narudzbe",
                                    "narudzbe"
                                )
                            }
                        >
                            <span>◷</span>
                            Narudžbe

                            {noveNarudzbeBroj > 0 && (
                                <b className="nav-order-badge">
                                    {noveNarudzbeBroj}
                                </b>
                            )}
                        </button>


                        <button
                            className={
                                aktivnaSekcija === "meni"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "meni",
                                    "meni"
                                )
                            }
                        >
                            <span>☷</span>
                            Meni
                        </button>


                        <button
                            className={
                                aktivnaSekcija === "vrecice"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "vrecice",
                                    "vrecice"
                                )
                            }
                        >
                            <span>🎁</span>
                            Vrećice
                        </button>

                        <button
                            className={
                                aktivnaSekcija === "profil"
                                    ? "restoran-nav-link active"
                                    : "restoran-nav-link"
                            }
                            onClick={() =>
                                idiNaSekciju(
                                    "profil",
                                    "profil"
                                )
                            }
                        >
                            <span>👤</span>
                            Profil
                        </button>

                    </nav>

                    <div className="navbar-actions">
                        <div className="restaurant-id-box">
                            <span>
                                Restoran
                            </span>
                            <strong>
                                #{stvarniRestoranId || "—"}
                            </strong>
                        </div>
                        {onLogout && (
                            <button
                                className="navbar-logout"
                                type="button"
                                onClick={onLogout}
                            >
                                Odjava
                            </button>
                        )}
                    </div>

                </div>

            </header>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="restoran-content">


                {/* =================================================
                    HERO / POČETNA
                ================================================= */}

                <section
                    className="restaurant-welcome"
                    id="pocetna"
                >

                    <div>

                        <span className="restaurant-eyebrow">
                            EATERY RESTORAN
                        </span>

                        <h1>
                            Dobrodošli,
                            <span>
                                {" "}
                                {user?.nazivObjekta ||  
                                user?.korisnickoIme || 
                                "restorane"}
                            </span>
                            !
                        </h1>

                        <p>
                            Upravljajte svojim restoranom,
                            narudžbama, menijem i vrećicama
                            iznenađenja na jednom mjestu.
                        </p>

                    </div>


                    <div className="restaurant-stats">

                        <div className="restaurant-mini-stat">

                            <strong>
                                {noveNarudzbeBroj}
                            </strong>

                            <span>
                                nove narudžbe
                            </span>

                        </div>


                        <div className="restaurant-stat-divider" />


                        <div className="restaurant-mini-stat">

                            <strong>
                                {brojJela}
                            </strong>

                            <span>
                                jela na meniju
                            </span>

                        </div>


                        <div className="restaurant-stat-divider" />


                        <div className="restaurant-mini-stat">

                            <strong>
                                {brojVrecica}
                            </strong>

                            <span>
                                vrećica
                            </span>

                        </div>

                    </div>

                </section>


                <section
                    className="restaurant-section restaurant-analytics"
                    id="analitika"
                >

                    <div className="restaurant-section-heading">

                        <div>

                            <span className="section-label">
                                PREGLED POSLOVANJA
                            </span>

                            <h2>
                                Analitika restorana
                            </h2>

                            <p>
                                Prodane vrećice, ocjene kupaca,
                                otkazane narudžbe i kilogrami
                                hrane spašene od bacanja.
                            </p>

                        </div>

                    </div>


                    <div className="analytics-grid">

                        <article className="analytics-card">

                            <span>
                                Prodane vrećice
                            </span>

                            <strong>
                                {statistika.brojProdanihVrecica}
                            </strong>

                            <p>
                                Vrećice iznenađenja iz
                                dostavljenih narudžbi.
                            </p>

                        </article>


                        <article className="analytics-card">

                            <span>
                                Prosječna ocjena
                            </span>

                            <strong>
                                {Number(statistika.ukupanBrojOcjena) > 0 || Number(statistika.prosjecnaOcjena) > 0
                                    ? Number(statistika.prosjecnaOcjena).toFixed(1)
                                    : '—'}
                                {(Number(statistika.ukupanBrojOcjena) > 0 || Number(statistika.prosjecnaOcjena) > 0) && (
                                    <small> / 5</small>
                                )}
                            </strong>

                            <p>
                                {Number(statistika.ukupanBrojOcjena) > 0
                                    ? `Na osnovu ${statistika.ukupanBrojOcjena} ${Number(statistika.ukupanBrojOcjena) === 1 ? 'ocjene kupaca' : 'ocjena kupaca'}.`
                                    : Number(statistika.prosjecnaOcjena) > 0
                                        ? 'Prosjek ocjena kupaca.'
                                        : 'Još nema ocjena od kupaca.'}
                            </p>

                        </article>


                        <article className="analytics-card">

                            <span>
                                Otkazane narudžbe
                            </span>

                            <strong>
                                {statistika.brojOtkazanihNarudzbi}
                            </strong>

                            <p>
                                Narudžbe sa statusom
                                otkazano ili odbijeno.
                            </p>

                        </article>


                        <article className="analytics-card highlight">

                            <span>
                                Spašena hrana
                            </span>

                            <strong>
                                {Number(
                                    statistika.kgSpaseneHrane ||
                                        0
                                ).toFixed(1)}
                                <small> kg</small>
                            </strong>

                            <p>
                                Težina dostavljenih vrećica
                                koje nisu završile kao otpad.
                            </p>

                        </article>

                    </div>

                    <div className="analytics-reviews-card">
                        <div className="analytics-reviews-heading">
                            <span className="section-label">RECENZIJE KUPACA</span>
                            <h3>Šta kupci kažu o vama</h3>
                            <p>Ocjene i komentari koje su kupci ostavili nakon preuzimanja narudžbe.</p>
                        </div>
                        {stvarniRestoranId && (
                            <RecenzijeLista restoranId={stvarniRestoranId} key={statistika.ukupanBrojOcjena} />
                        )}
                    </div>

                </section>


                {/* =================================================
                    DIJAGNOSTIKA
                ================================================= */}

                {!stvarniRestoranId && (

                    <div className="restaurant-error">

                        <div className="restaurant-error-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                Nije pronađen ID restorana
                            </strong>

                            <p>
                                Provjerite da li se
                                restoranId ili korisnički ID
                                pravilno prosljeđuje komponenti.
                            </p>

                        </div>

                    </div>

                )}


                {/* =================================================
                    NARUDŽBE
                ================================================= */}

                <section
                    className="restaurant-section"
                    id="narudzbe"
                >

                    <div className="restaurant-section-heading">

                        <div>

                            <span className="section-label">
                                AKTIVNOST RESTORANA
                            </span>

                            <h2>
                                Primljene narudžbe
                            </h2>

                            <p>
                                Pregledajte i ažurirajte
                                status pristiglih narudžbi.
                            </p>

                        </div>


                        <button
                            className="outline-action"
                            onClick={ucitajNarudzbe}
                            disabled={loadingNarudzbe}
                        >
                            <span>
                                ↻
                            </span>

                            {loadingNarudzbe
                                ? "Osvježavanje..."
                                : "Osvježi"}
                        </button>

                    </div>


                    <div className="orders-panel">

                        <div className="orders-panel-top">

                            <div>

                                <span className="panel-icon">
                                    📋
                                </span>

                                <div>

                                    <h3>
                                        Narudžbe
                                    </h3>

                                    <p>
                                        {narudzbe.length === 0
                                            ? "Trenutno nema narudžbi"
                                            : `Prikaz ${prikazaneNarudzbe.length} od ${narudzbe.length}`}
                                    </p>

                                </div>

                            </div>


                            {noveNarudzbeBroj > 0 && (

                                <div className="new-orders-indicator">

                                    <span />

                                    {noveNarudzbeBroj}
                                    {" "}
                                    {noveNarudzbeBroj === 1
                                        ? "nova"
                                        : "novih"}

                                </div>

                            )}

                        </div>


                        {loadingNarudzbe &&
                        narudzbe.length === 0 ? (

                            <div className="restaurant-empty">

                                <div className="restaurant-empty-icon">
                                    ◌
                                </div>

                                <h3>
                                    Učitavanje narudžbi...
                                </h3>

                            </div>

                        ) : narudzbe.length === 0 ? (

                            <div className="restaurant-empty">

                                <div className="restaurant-empty-icon">
                                    📭
                                </div>

                                <h3>
                                    Nema pristiglih narudžbi
                                </h3>

                                <p>
                                    Kada kupac pošalje
                                    narudžbu, ona će se
                                    pojaviti ovdje.
                                </p>

                            </div>

                        ) : (

                            <>
                          <div className="orders-list">
    {prikazaneNarudzbe.map((n) => {
        // Definisanje statusnih varijabli na vrhu petlje
        const status = n.status?.toUpperCase();

        // Završni statusi - nakon ovih statusa više nema izmjena
        const jeKrajnjiStatus =
            status === "DOSTAVLJENO" ||
            status === "PREUZETO" ||
            status === "OTKAZANA" ||
            status === "OTKAZANO" ||
            status === "ODBIJENA";

        // Ako je narudžba već spremna ili završena, ne može se vraćati na "U pripremi"
        const jeSpremnoIliVise = status === "SPREMNO" || jeKrajnjiStatus;

        return (
            <article className="order-card" key={n.id}>
                {/* ZAGLAVLJE KARTICE */}
                <div className="order-card-header">
                    <div>
                        <span className="order-number-label">NARUDŽBA</span>
                        <h3>#{n.id}</h3>
                    </div>

                    <div
                        className={`order-status ${
                            jeKrajnjiStatus && status !== "PREUZETO" && status !== "DOSTAVLJENO"
                                ? "cancelled"
                                : !status || status === "ZAPRIMLJENO" || status === "KREIRANA"
                                ? "received"
                                : status === "U_PRIPREMI"
                                ? "preparing"
                                : status === "SPREMNO"
                                ? "ready"
                                : "delivered"
                        }`}
                    >
                        <span />
                        {n.status || "ZAPRIMLJENO"}
                    </div>
                </div>

                {/* TIJELO KARTICE */}
                <div className="order-card-body">
                    <div className="order-info">
                        <span>📍 Adresa</span>
                        <strong>{n.adresaDostave || "Nije navedena"}</strong>
                    </div>

                    <div className="order-info">
                        <span>💰 Ukupna cijena</span>
                        <strong className="order-price">
                            {Number(n.ukupnaCijena || 0).toFixed(2)} KM
                        </strong>
                    </div>

                    {n.preuzimanjeOd && n.preuzimanjeDo && (
                        <div className="order-info order-info-pickup">
                            <span>🕒 Termin preuzimanja</span>
                            <strong>{formatTerminNarudzbe(n.preuzimanjeOd, n.preuzimanjeDo)}</strong>
                        </div>
                    )}
                </div>

                <div className="order-items">
                    <span>Narudžba</span>
                    <ul>
                        {n.stavke && n.stavke.length > 0 ? n.stavke.map((s, idx) => (
                            <li key={idx}>
                                <span>
                                    {s.nazivJela || s.naziv || (s.tipStavke === 'VRECICA' ? 'Vrećica iznenađenja' : 'Jelo')}
                                    {s.kolicina ? ` × ${s.kolicina}` : ''}
                                </span>
                                <strong>
                                    {s.cijena != null ? `${Number(s.cijena).toFixed(2)} KM` : ''}
                                </strong>
                            </li>
                        )) : (
                            <li>Nema stavki narudžbe</li>
                        )}
                    </ul>
                </div>

                {/* UNOS PIN-A ZA PREUZIMANJE */}
                {!jeKrajnjiStatus && (
                    <div className="eatery-pin-unos">
                        <span className="action-label">🔐 PIN za preuzimanje:</span>

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="0000"
                            value={pinUnosi[n.id] || ""}
                            onChange={(e) => promijeniPinUnos(n.id, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") potvrdiPreuzimanje(n.id);
                            }}
                        />

                        <button
                            type="button"
                            disabled={pinObrada === n.id}
                            onClick={() => potvrdiPreuzimanje(n.id)}
                        >
                            {pinObrada === n.id ? "Provjera..." : "Potvrdi preuzimanje"}
                        </button>

                        {pinPoruke[n.id] && (
                            <div className={`eatery-pin-poruka ${pinPoruke[n.id].tip}`}>
                                {pinPoruke[n.id].tekst}
                            </div>
                        )}
                    </div>
                )}

                {/* DUGMAD ZA PROMJENU STATUSA */}
               <div className="order-card-actions">
    <span className="action-label">Promijeni status:</span>

    <div className="status-buttons">
    {/* U PRIPREMI */}
    <button
        type="button"
        className={
            status === "U_PRIPREMI"
                ? "status-button selected"
                : "status-button"
        }
        disabled={status !== "ZAPRIMLJENO" && status !== "KREIRANA"}
        onClick={() => PromijeniStatusNarudzbe(n.id, "U_PRIPREMI")}
    >
        U pripremi
    </button>

    {/* SPREMNO */}
    <button
        type="button"
        className={
            status === "SPREMNO"
                ? "status-button selected"
                : "status-button"
        }
        disabled={status !== "U_PRIPREMI"}
        onClick={() => PromijeniStatusNarudzbe(n.id, "SPREMNO")}
    >
        Spremno
    </button>

    {/* DOSTAVLJENO */}
    <button
        type="button"
        className={
            status === "DOSTAVLJENO"
                ? "status-button selected"
                : "status-button"
        }
        disabled={status !== "SPREMNO"}
        onClick={() => PromijeniStatusNarudzbe(n.id, "DOSTAVLJENO")}
    >
        Dostavljeno
    </button>

    {/* OTKAŽI */}
    <button
        type="button"
        className={
            status === "OTKAZANA" || status === "OTKAZANO" || status === "ODBIJENA"
                ? "status-button selected cancel"
                : "status-button cancel"
        }
        disabled={
            status === "DOSTAVLJENO" ||
            status === "OTKAZANA" ||
            status === "OTKAZANO" ||
            status === "ODBIJENA"
        }
        onClick={() => PromijeniStatusNarudzbe(n.id, "OTKAZANA")}
    >
        Otkaži
    </button>
</div>
</div>
            </article>
        );
    })}
</div>

                            {narudzbe.length > NARUDZBI_PO_STRANICI && (
                                <div className="orders-pagination">
                                    <button
                                        type="button"
                                        disabled={stranicaNarudzbi === 1}
                                        onClick={() =>
                                            setStranicaNarudzbi(
                                                stranica => Math.max(1, stranica - 1)
                                            )
                                        }
                                    >
                                        Prethodna
                                    </button>

                                    <span>
                                        Stranica {stranicaNarudzbi} od {ukupnoStranicaNarudzbi}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={stranicaNarudzbi === ukupnoStranicaNarudzbi}
                                        onClick={() =>
                                            setStranicaNarudzbi(
                                                stranica =>
                                                    Math.min(
                                                        ukupnoStranicaNarudzbi,
                                                        stranica + 1
                                                    )
                                            )
                                        }
                                    >
                                        Sljedeća
                                    </button>
                                </div>
                            )}
                            </>

                        )}

                    </div>

                </section>


                {/* =================================================
                    MENI
                ================================================= */}

                <section
                    className="restaurant-section"
                    id="meni"
                >

                    <div className="restaurant-section-heading">

                        <div>

                            <span className="section-label">
                                PONUDA RESTORANA
                            </span>

                            <h2>
                                Upravljanje menijem
                            </h2>

                            <p>
                                Organizujte kategorije i
                                dodajte nova jela u ponudu.
                            </p>

                        </div>

                    </div>


                    <div className="menu-management-grid">


                        {/* KATEGORIJA */}

                        <div className="management-card">

                            <div className="management-card-heading">

                                <div className="management-icon">
                                    ☷
                                </div>

                                <div>

                                    <h3>
                                        Nova kategorija
                                    </h3>

                                    <p>
                                        Organizujte ponudu
                                        restorana.
                                    </p>

                                </div>

                            </div>


                            <form
                                onSubmit={
                                    handleDodajKategoriju
                                }
                                className="styled-form"
                            >

                                <label>
                                    Naziv kategorije
                                </label>

                                <input
                                    type="text"
                                    placeholder="npr. Pizze"
                                    value={
                                        novaKategorija
                                    }
                                    onChange={e =>
                                        setNovaKategorija(
                                            e.target.value
                                        )
                                    }
                                    required
                                />


                                <button
                                    type="submit"
                                    className="primary-button"
                                >
                                    <span>+</span>
                                    Dodaj kategoriju
                                </button>

                            </form>


                            <div className="existing-categories">

                                <div className="sub-heading">

                                    <strong>
                                        Postojeće kategorije
                                    </strong>

                                    <span>
                                        {brojKategorija}
                                    </span>

                                </div>


                                {kategorije.length === 0 ? (

                                    <p className="muted-text">
                                        Još nema kategorija.
                                    </p>

                                ) : (

                                    <div className="category-list">

                                        {kategorije.map(kat => (

                                            <div
                                                className="category-chip"
                                                key={kat.id}
                                            >

                                                <span>
                                                    {kat.naziv}
                                                </span>

                                            </div>

                                        ))}

                                    </div>

                                )}

                            </div>

                        </div>


                        {/* JELA */}

                        <div className="management-card">

                            <div className="management-card-heading">

                                <div className="management-icon">
                                    🍽️
                                </div>

                                <div>

                                    <h3>
                                        {urediJeloId ? "Izmjena jela" : "Novo jelo"}
                                    </h3>

                                    <p>
                                        {urediJeloId
                                            ? "Izmijenite podatke i sačuvajte."
                                            : "Dodajte jelo na svoj meni."}
                                    </p>

                                </div>

                            </div>


                            <form
                                ref={jeloFormaRef}
                                onSubmit={
                                    handleDodajJelo
                                }
                                className="styled-form"
                            >

                                <label>
                                    Kategorija
                                </label>

                                <select
                                    value={
                                        novoJelo.kategorijaId
                                    }
                                    onChange={e =>
                                        setNovoJelo({
                                            ...novoJelo,
                                            kategorijaId:
                                                e.target.value
                                        })
                                    }
                                    required
                                >

                                    <option value="">
                                        -- Izaberi kategoriju --
                                    </option>

                                    {kategorije.map(kat => (

                                        <option
                                            key={kat.id}
                                            value={kat.id}
                                        >
                                            {kat.naziv}
                                        </option>

                                    ))}

                                </select>


                                <label>
                                    Naziv jela
                                </label>

                                <input
                                    type="text"
                                    placeholder="npr. Pizza Margherita"
                                    value={
                                        novoJelo.naziv
                                    }
                                    onChange={e =>
                                        setNovoJelo({
                                            ...novoJelo,
                                            naziv:
                                                e.target.value
                                        })
                                    }
                                    required
                                />


                                <label>
                                    Opis / sastojci
                                </label>

                                <textarea
                                    placeholder="Kratak opis jela..."
                                    rows="3"
                                    value={
                                        novoJelo.opis
                                    }
                                    onChange={e =>
                                        setNovoJelo({
                                            ...novoJelo,
                                            opis:
                                                e.target.value
                                        })
                                    }
                                />


                                <label>
                                    Cijena (KM)
                                </label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={
                                        novoJelo.cijena
                                    }
                                    onChange={e =>
                                        setNovoJelo({
                                            ...novoJelo,
                                            cijena:
                                                e.target.value
                                        })
                                    }
                                    required
                                />


                                <button
                                    type="submit"
                                    className="primary-button"
                                >
                                    <span>{urediJeloId ? "✓" : "+"}</span>
                                    {urediJeloId ? "Sačuvaj izmjene" : "Sačuvaj jelo"}
                                </button>

                                {urediJeloId && (
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={otkaziIzmjenuJela}
                                    >
                                        Otkaži izmjenu
                                    </button>
                                )}

                            </form>

                        </div>

                    </div>


                    {/* POSTOJEĆI MENI */}

                    <div className="existing-menu-card">

                        <div className="existing-menu-heading">

                            <div>

                                <span className="section-label">
                                    TRENUTNA PONUDA
                                </span>

                                <h3>
                                    Postojeći meni
                                </h3>

                                <p>
                                    Sva jela koja su trenutno
                                    dostupna na meniju.
                                </p>

                            </div>


                            <div className="menu-count">

                                <strong>
                                    {brojJela}
                                </strong>

                                <span>
                                    jela
                                </span>

                            </div>

                        </div>


                        {jela.length === 0 ? (

                            <div className="restaurant-empty">

                                <div className="restaurant-empty-icon">
                                    🍽️
                                </div>

                                <h3>
                                    Meni je trenutno prazan
                                </h3>

                                <p>
                                    Dodajte prvo jelo
                                    koristeći formu iznad.
                                </p>

                            </div>

                        ) : (

                            <div className="menu-grouped">

                                {grupisanaJela.map(grupa => (
                                <div className="eatery-kategorija-grupa" key={grupa.kljuc}>

                                    <div className="eatery-kategorija-naslov">
                                        {grupa.naziv}
                                        <span className="broj">{grupa.jela.length}</span>
                                    </div>

                                    <div className="menu-items-grid">

                                {grupa.jela.map(jelo => (

                                    <article
                                        className={
                                            urediJeloId === jelo.id
                                                ? "menu-item-card is-editing"
                                                : "menu-item-card"
                                        }
                                        key={jelo.id}
                                    >

                                        <div className="menu-item-image">
                                            🍽️
                                        </div>


                                        <div className="menu-item-content">

                                            <div className="menu-item-top">

                                                <h4>
                                                    {jelo.naziv}
                                                </h4>

                                                <strong>
                                                    {Number(
                                                        jelo.cijena ||
                                                            0
                                                    ).toFixed(2)}
                                                    {" "}
                                                    KM
                                                </strong>

                                            </div>


                                            <p>
                                                {jelo.opis ||
                                                    "Ukusno pripremljeno jelo."}
                                            </p>

                                            <div className="item-actions">
                                                <button
                                                    type="button"
                                                    className="item-action-button"
                                                    onClick={() => zapocniIzmjenuJela(jelo)}
                                                >
                                                    Izmijeni
                                                </button>
                                                <button
                                                    type="button"
                                                    className="item-action-button danger"
                                                    onClick={() => ukloniJelo(jelo)}
                                                >
                                                    Ukloni
                                                </button>
                                            </div>

                                        </div>

                                    </article>

                                ))}

                                    </div>

                                </div>
                                ))}

                            </div>

                        )}

                    </div>

                </section>


                {/* =================================================
                    VREĆICE
                ================================================= */}

                <section
                    className="restaurant-section"
                    id="vrecice"
                >

                    <div className="restaurant-section-heading">

                        <div>

                            <span className="section-label">
                                SPASITE HRANU
                            </span>

                            <h2>
                                Vrećice iznenađenja
                            </h2>

                            <p>
                                Kreirajte i upravljajte
                                svojim ponudama.
                            </p>

                        </div>

                    </div>


                    {/* FORMA */}

                    <div className="bag-create-card" ref={vrecicaFormaRef}>

                        <div className="bag-create-intro">

                            <div className="bag-big-icon">
                                🎁
                            </div>

                            <div>

                                <span className="section-label">
                                    {urediVrecicuId ? "IZMJENA PONUDE" : "NOVA PONUDA"}
                                </span>

                                <h3>
                                    {urediVrecicuId ? "Izmijeni vrećicu" : "Objavi vrećicu"}
                                </h3>

                                <p>
                                    {urediVrecicuId
                                        ? "Izmjene odmah vide kupci. Već naručene vrećice zadržavaju svoj termin preuzimanja."
                                        : "Ponudite višak hrane kupcima po akcijskoj cijeni."}
                                </p>

                            </div>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="bag-form"
                        >

                            <div className="form-field full">

                                <label>
                                    Naziv vrećice
                                </label>

                                <input
                                    type="text"
                                    name="naziv"
                                    value={
                                        forma.naziv
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                />

                            </div>


                            <div className="form-field full">

                                <label>
                                    Opis
                                </label>

                                <textarea
                                    name="opis"
                                    rows="3"
                                    value={
                                        forma.opis
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                            </div>


                            <div className="bag-form-row">

                                <div className="form-field">

                                    <label>
                                        Originalna cijena (KM)
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        name="originalnaCijena"
                                        value={
                                            forma.originalnaCijena
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Akcijska cijena (KM)
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        name="akcijskaCijena"
                                        value={
                                            forma.akcijskaCijena
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Količina
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        name="kolicina"
                                        value={
                                            forma.kolicina
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Težina (kg)
                                    </label>

                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        name="tezinaKg"
                                        value={
                                            forma.tezinaKg
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            <div className="bag-form-row">

                                <div className="form-field">

                                    <label>
                                        Preuzimanje od
                                    </label>

                                    <input
                                        type="time"
                                        name="vrijemePreuzimanjaOd"
                                        value={
                                            forma.vrijemePreuzimanjaOd
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Preuzimanje do
                                    </label>

                                    <input
                                        type="time"
                                        name="vrijemePreuzimanjaDo"
                                        value={
                                            forma.vrijemePreuzimanjaDo
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>


                                <div className="form-field checkbox-field">

                                    <label className="checkbox-label">

                                        <input
                                            type="checkbox"
                                            name="aktivna"
                                            checked={
                                                forma.aktivna
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                        <span>
                                            Aktivna odmah
                                        </span>

                                    </label>

                                </div>

                            </div>


                            <div className="form-field full">

                                <label>
                                    Alergijska upozorenja
                                </label>

                                <p className="allergen-hint">
                                    Označite alergene koji mogu biti u vrećici.
                                </p>

                                <div className="allergen-grid">
                                    {ALERGENI.map(alergen => (
                                        <label
                                            className="allergen-chip"
                                            key={alergen}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={forma.alergije.includes(alergen)}
                                                onChange={() => toggleAlergen(alergen)}
                                            />
                                            <span>{alergen}</span>
                                        </label>
                                    ))}
                                </div>

                                <input
                                    type="text"
                                    name="dodatnaAlergija"
                                    placeholder="Dodatna napomena (npr. sezamovo ulje)"
                                    value={forma.dodatnaAlergija}
                                    onChange={handleChange}
                                />

                            </div>


                            <button
                                type="submit"
                                className="primary-button bag-submit"
                            >
                                <span>{urediVrecicuId ? "✓" : "🎁"}</span>
                                {urediVrecicuId ? "Sačuvaj izmjene" : "Objavi vrećicu"}
                            </button>

                            {urediVrecicuId && (
                                <button
                                    type="button"
                                    className="secondary-button bag-submit"
                                    onClick={otkaziIzmjenuVrecice}
                                >
                                    Otkaži izmjenu
                                </button>
                            )}

                        </form>

                    </div>


                    {/* POSTOJEĆE VREĆICE */}

                    <div className="published-bags">

                        <div className="existing-menu-heading">

                            <div>

                                <span className="section-label">
                                    VAŠE PONUDE
                                </span>

                                <h3>
                                    Objavljene vrećice
                                </h3>

                                <p>
                                    Upravljajte količinom i
                                    statusom svojih vrećica.
                                </p>

                            </div>


                            <div className="menu-count">

                                <strong>
                                    {brojVrecica}
                                </strong>

                                <span>
                                    vrećica
                                </span>

                            </div>

                        </div>


                        {loading && vrecice.length === 0 ? (

                            <div className="restaurant-empty">

                                <div className="restaurant-empty-icon">
                                    ◌
                                </div>

                                <h3>
                                    Učitavanje vrećica...
                                </h3>

                            </div>

                        ) : vrecice.length === 0 ? (

                            <div className="restaurant-empty">

                                <div className="restaurant-empty-icon">
                                    🎁
                                </div>

                                <h3>
                                    Nemate objavljenih vrećica
                                </h3>

                                <p>
                                    Kreirajte prvu vrećicu
                                    koristeći formu iznad.
                                </p>

                            </div>

                        ) : (

                            <div className="bag-list">

                                {vrecice.map(v => (

                                    <article
                                        className={
                                            (v.aktivna
                                                ? "bag-card"
                                                : "bag-card inactive") +
                                            (urediVrecicuId === v.id ? " is-editing" : "")
                                        }
                                        key={v.id}
                                    >

                                        <div className="bag-card-icon">
                                            🎁
                                        </div>


                                        <div className="bag-card-info">

                                            <div className="bag-card-title">

                                                <h4>
                                                    {v.naziv}
                                                </h4>

                                                <span
                                                    className={
                                                        v.aktivna
                                                            ? "bag-status active"
                                                            : "bag-status"
                                                    }
                                                >

                                                    <span />

                                                    {v.aktivna
                                                        ? "Aktivna"
                                                        : "Neaktivna"}

                                                </span>

                                            </div>


                                            <p>
                                                {v.opis ||
                                                    "Vrećica iznenađenja"}
                                            </p>

                                            {v.alergijskaUpozorenja && (
                                                <div className="allergy-warning">
                                                    <strong>Alergeni:</strong>
                                                    {" "}
                                                    {v.alergijskaUpozorenja}
                                                </div>
                                            )}

                                            {v.vrijemePreuzimanjaOd && v.vrijemePreuzimanjaDo && (
                                                <div className="bag-pickup">
                                                    🕒 Preuzimanje:{" "}
                                                    <strong>
                                                        {v.vrijemePreuzimanjaOd} – {v.vrijemePreuzimanjaDo}
                                                    </strong>
                                                </div>
                                            )}


                                            <div className="bag-price">

                                                <span className="old-price">
                                                    {Number(
                                                        v.originalnaCijena ||
                                                            0
                                                    ).toFixed(2)}
                                                    {" "}
                                                    KM
                                                </span>

                                                <strong>
                                                    {Number(
                                                        v.akcijskaCijena ||
                                                            0
                                                    ).toFixed(2)}
                                                    {" "}
                                                    KM
                                                </strong>

                                                <span className="bag-weight">
                                                    {Number(
                                                        v.tezinaKg ||
                                                            1
                                                    ).toFixed(1)}
                                                    {" "}
                                                    kg
                                                </span>

                                            </div>

                                        </div>


                                        <div className="bag-card-controls">

                                            <span className="control-label">
                                                Količina
                                            </span>


                                            <div className="quantity-control">

                                                <button
                                                    onClick={() =>
                                                        azurirajKolicinu(
                                                            v.id,
                                                            v.kolicina - 1
                                                        )
                                                    }
                                                >
                                                    −
                                                </button>

                                                <strong>
                                                    {v.kolicina}
                                                </strong>

                                                <button
                                                    onClick={() =>
                                                        azurirajKolicinu(
                                                            v.id,
                                                            v.kolicina + 1
                                                        )
                                                    }
                                                >
                                                    +
                                                </button>

                                            </div>


                                            <button
                                                className={
                                                    v.aktivna
                                                        ? "bag-toggle-button deactivate"
                                                        : "bag-toggle-button activate"
                                                }
                                                onClick={() =>
                                                    PromijeniStatus(
                                                        v.id,
                                                        v.aktivna
                                                    )
                                                }
                                            >
                                                {v.aktivna
                                                    ? "Deaktiviraj"
                                                    : "Aktiviraj"}
                                            </button>

                                            <div className="item-actions">
                                                <button
                                                    type="button"
                                                    className="item-action-button"
                                                    onClick={() => zapocniIzmjenuVrecice(v)}
                                                >
                                                    Izmijeni
                                                </button>
                                                <button
                                                    type="button"
                                                    className="item-action-button danger"
                                                    onClick={() => ukloniVrecicu(v)}
                                                >
                                                    Ukloni
                                                </button>
                                            </div>

                                        </div>

                                    </article>

                                ))}

                            </div>

                        )}

                    </div>

                </section>

                <section
                    className="restaurant-section"
                    id="profil"
                >
                    <KlijentProfil user={user} />
                </section>

            </main>


            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="restoran-footer">

                <div>

                    <strong>
                        Eatery
                    </strong>

                    <span>
                        © 2026 — Vaš restoran, dio bolje priče.
                    </span>

                </div>

                <span>
                    Manje otpada. Više hrane. 🍽️
                </span>

            </footer>

        </div>
    );
};

export default RestoranPanel;
