import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import API from '../api';
import PromjenaSifre from '../components/PromjenaSifre';
import L from 'leaflet';
import axios from 'axios';
import './KlijentProfil.css';

// Leaflet CSS i popravka ikone pina
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Pomoćna provera: da li imamo ISPRAVNE koordinate (null/undefined/0 sve znače "nije uneseno")
function jeValidnaKoordinata(vrijednost) {
    return vrijednost !== null && vrijednost !== undefined && vrijednost !== 0;
}

// Pomoćna komponenta za re-centriranje mape kada se koordinate promijene
function CentrirajMapu({ lat, lng, isActive }) {
    const map = useMap();
    useEffect(() => {
        if (!isActive) return;
        map.invalidateSize();
        if (jeValidnaKoordinata(lat) && jeValidnaKoordinata(lng)) {
            map.setView([lat, lng], 16);
        }
        const frameId = requestAnimationFrame(() => map.invalidateSize());
        return () => cancelAnimationFrame(frameId);
    }, [lat, lng, map, isActive]);
    return null;
}

// Komponenta za obradu klika na mapu
function KlikNaMapuHandler({ onSelectCoordinates }) {
    useMapEvents({
        click(e) {
            onSelectCoordinates(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

const KlijentProfil = ({ user, isActive = true }) => {
    const [profil, setProfil] = useState({ nazivObjekta: '', adresa: '', lat: 0, lng: 0, radnoVrijemeOd: '', radnoVrijemeDo: '' });
    const [nazivObjekta, setNazivObjekta] = useState('');
    const [novaAdresa, setNovaAdresa] = useState('');
    const [radnoVrijemeOd, setRadnoVrijemeOd] = useState('');
    const [radnoVrijemeDo, setRadnoVrijemeDo] = useState('');
    const [korisnikInfo, setKorisnikInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [poruka, setPoruka] = useState('');
    const [greska, setGreska] = useState('');
    const [saving, setSaving] = useState(false);

    // Flag koji spriječava da se prekucava adresa dok korisnik vuče pin
    const isManualPinMove = useRef(false);
    const markerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        let korisnikData = null;

        try {
            const sacuvano = localStorage.getItem('user') || localStorage.getItem('korisnik');
            if (sacuvano) {
                korisnikData = JSON.parse(sacuvano);
            }
            korisnikData = user || korisnikData;
            if (korisnikData && isMounted) setKorisnikInfo(korisnikData);
        } catch (e) {
            console.error("Greška pri čitanju korisnika:", e);
        }

        if (!korisnikData || !korisnikData.id) {
            if (isMounted) {
                setGreska("Niste prijavljeni ili ID korisnika nije pronađen.");
                setLoading(false);
            }
            return;
        }

        // Učitavanje postojeće lokacije i naziva restorana (Zahtijeva JWT preko API instance)
        API.get(`/restoran/${korisnikData.id}/profil`)
            .then(res => {
                if (isMounted && res.data) {
                    setProfil(res.data);
                    if (res.data.nazivObjekta) setNazivObjekta(res.data.nazivObjekta);
                    if (res.data.adresa) setNovaAdresa(res.data.adresa);
                    if (res.data.radnoVrijemeOd) setRadnoVrijemeOd(res.data.radnoVrijemeOd);
                    if (res.data.radnoVrijemeDo) setRadnoVrijemeDo(res.data.radnoVrijemeDo);
                }
            })
            .catch(err => {
                console.warn("Restoran još nema unesene podatke o profilu:", err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // 1. AUTOMATSKO POMJERANJE PINA KADA KORISNIK UTIPKA ADRESU (Debounce 700ms)
    useEffect(() => {
        if (isManualPinMove.current) {
            isManualPinMove.current = false;
            return;
        }

        if (!novaAdresa || novaAdresa.trim().length < 3) return;

        const timer = setTimeout(async () => {
            try {
                // Poziv eksternom OpenStreetMap servisu (BEZ JWT-a)
                const res = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(novaAdresa)}`,
                    { headers: { 'Accept-Language': 'bs,hr,sr' } }
                );
                if (res.data && res.data.length > 0) {
                    const prviRezultat = res.data[0];
                    const newLat = parseFloat(prviRezultat.lat);
                    const newLng = parseFloat(prviRezultat.lon);

                    setProfil(prev => ({
                        ...prev,
                        lat: newLat,
                        lng: newLng
                    }));
                }
            } catch (err) {
                console.warn("Greška pri automatskom pronalasku adrese na mapi:", err);
            }
        }, 700);

        return () => clearTimeout(timer);
    }, [novaAdresa]);

    // 2. REVERSE GEOCODING (Iz koordinata u naziv adrese pri kliku/prevlačenju pina)
    const azurirajAdresuPrekoKoordinata = async (lat, lng) => {
        try {
            // Poziv eksternom OpenStreetMap servisu (BEZ JWT-a)
            const res = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { 'Accept-Language': 'bs,hr,sr' } }
            );
            if (res.data && res.data.display_name) {
                isManualPinMove.current = true;
                setNovaAdresa(res.data.display_name);
            }
        } catch (e) {
            console.warn("Nije moguće preuzeti naziv adrese za izabrane koordinate", e);
        }
    };

    // Rukovanje kada klijent klikne na mapu
    const handleMapClick = (noviLat, noviLng) => {
        isManualPinMove.current = true;
        setProfil(prev => ({ ...prev, lat: noviLat, lng: noviLng }));
        azurirajAdresuPrekoKoordinata(noviLat, noviLng);
    };

    // Rukovanje kada klijent prevuče pin (Drag and Drop)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    isManualPinMove.current = true;
                    setProfil(prev => ({ ...prev, lat, lng }));
                    azurirajAdresuPrekoKoordinata(lat, lng);
                }
            },
        }),
        [],
    );

    const handleSpremiProfil = async (e) => {
        if (e) e.preventDefault();
        setPoruka('');
        setGreska('');

        if (!nazivObjekta.trim()) {
            setGreska("Molimo unesite naziv objekta.");
            return;
        }

        if (!novaAdresa.trim()) {
            setGreska("Molimo unesite adresu.");
            return;
        }

        setSaving(true);

        try {
            // Slanje na tvoj backend (Zahtijeva JWT preko API instance)
            const res = await API.put(`/restoran/${korisnikInfo.id}/profil`, {
                nazivObjekta: nazivObjekta,
                adresa: novaAdresa,
                lat: profil.lat !== 0 ? profil.lat : null,
                lng: profil.lng !== 0 ? profil.lng : null,
                radnoVrijemeOd: radnoVrijemeOd || null,
                radnoVrijemeDo: radnoVrijemeDo || null
            });

            // Ažuriranje lokalnih stanja odgovorom iz baze
            setProfil({
                nazivObjekta: res.data.nazivObjekta || nazivObjekta,
                adresa: res.data.adresa,
                lat: res.data.lat,
                lng: res.data.lng,
                radnoVrijemeOd: res.data.radnoVrijemeOd || '',
                radnoVrijemeDo: res.data.radnoVrijemeDo || ''
            });
            setNazivObjekta(res.data.nazivObjekta || nazivObjekta);
            setRadnoVrijemeOd(res.data.radnoVrijemeOd || '');
            setRadnoVrijemeDo(res.data.radnoVrijemeDo || '');

            setPoruka("Podaci profila i lokacija su uspješno sačuvani!");
        } catch (err) {
            console.error("Greška pri čuvanju profila:", err);

            let errData = err.response?.data;
            if (typeof errData === 'object' && errData !== null) {
                setGreska(errData.poruka || errData.message || JSON.stringify(errData));
            } else if (typeof errData === 'string') {
                setGreska(errData);
            } else {
                setGreska("Došlo je do greške pri čuvanju profila.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="klijent-profil-loading">Učitavanje profila...</div>;
    }

    const lokacijaJePostavljena = jeValidnaKoordinata(profil.lat) && jeValidnaKoordinata(profil.lng);
    const mapCenter = lokacijaJePostavljena
        ? [profil.lat, profil.lng]
        : [44.77218, 17.19100];

    return (
        <div className="klijent-profil">
            <div className="klijent-profil-heading">
                <span>LOKACIJA I PODACI</span>
                <h2>Profil objekta</h2>
                <p>Ažurirajte naziv, lokaciju i radno vrijeme kako bi kupci znali kada ste otvoreni.</p>
            </div>

            <div className="klijent-profil-card">
                {korisnikInfo && (
                    <div className="klijent-profil-meta">
                        <div>
                            <span>Korisničko ime</span>
                            <strong>{korisnikInfo.korisnickoIme}</strong>
                        </div>
                        <div>
                            <span>Email</span>
                            <strong>{korisnikInfo.email || 'Nije unesen'}</strong>
                        </div>
                        <div>
                            <span>Naziv objekta</span>
                            <strong>{profil.nazivObjekta || 'Još nije unesen'}</strong>
                        </div>
                    </div>
                )}

                <form className="klijent-profil-form" onSubmit={handleSpremiProfil}>
                    <div>
                        <label htmlFor="naziv-objekta">Naziv objekta</label>
                        <input
                            id="naziv-objekta"
                            type="text"
                            value={nazivObjekta}
                            onChange={(e) => setNazivObjekta(e.target.value)}
                            placeholder="npr. Pekara Sunce"
                        />
                    </div>

                    <div>
                        <label htmlFor="adresa-objekta">Adresa</label>
                        <input
                            id="adresa-objekta"
                            type="text"
                            value={novaAdresa}
                            onChange={(e) => setNovaAdresa(e.target.value)}
                            placeholder="npr. Kralja Petra I, Banja Luka"
                        />
                    </div>

                    <div className="klijent-profil-hours">
                        <div>
                            <label htmlFor="radno-od">Radno vrijeme od</label>
                            <input
                                id="radno-od"
                                type="time"
                                value={radnoVrijemeOd}
                                onChange={(e) => setRadnoVrijemeOd(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="radno-do">Radno vrijeme do</label>
                            <input
                                id="radno-do"
                                type="time"
                                value={radnoVrijemeDo}
                                onChange={(e) => setRadnoVrijemeDo(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="klijent-profil-hint">
                        Kupci će vidjeti ovo radno vrijeme i da li je vaš objekat trenutno otvoren.
                    </p>

                    {jeValidnaKoordinata(profil.lat) && jeValidnaKoordinata(profil.lng) && (
                        <p className="klijent-profil-hint">
                            Koordinate: {profil.lat.toFixed(6)}, {profil.lng.toFixed(6)}
                        </p>
                    )}

                    {poruka && <p className="klijent-profil-message ok">{poruka}</p>}
                    {greska && <p className="klijent-profil-message err">{String(greska)}</p>}

                    <button className="klijent-profil-submit" type="submit" disabled={saving}>
                        {saving ? 'Spremanje...' : 'Sačuvaj podatke i adresu'}
                    </button>
                </form>

                <p className="klijent-profil-map-note">
                    Unesite adresu ili kliknite / prevucite pin na mapi.
                </p>
                <div className="klijent-profil-map">
                    <MapContainer center={mapCenter} zoom={lokacijaJePostavljena ? 16 : 13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <CentrirajMapu lat={profil.lat} lng={profil.lng} isActive={isActive} />
                        <KlikNaMapuHandler onSelectCoordinates={handleMapClick} />

                        {lokacijaJePostavljena && (
                            <Marker
                                draggable={true}
                                eventHandlers={eventHandlers}
                                position={[profil.lat, profil.lng]}
                                ref={markerRef}
                            >
                                <Popup>
                                    <strong>{nazivObjekta || korisnikInfo?.korisnickoIme || 'Objekat'}</strong><br />
                                    {novaAdresa || 'Izabrana lokacija'}
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>
            </div>

            <div className="klijent-profil-sifra">
                <PromjenaSifre />
            </div>
        </div>
    );
};

export default KlijentProfil;
