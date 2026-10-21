import React, { useEffect, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap
} from 'react-leaflet';
import { MapPin, Search, Utensils, ArrowRight, TriangleAlert, Navigation, List, Map as MapIcon, Clock } from 'lucide-react';

import API from '../api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './KupacMapa.css';
import { formatRadnoVrijeme, statusRadnogVremena } from './radnoVrijeme';
import StarRating from '../components/StarRating';
import RecenzijeModal from '../components/RecenzijeModal';

// =========================================================
// IKONE MARKERA
// =========================================================

const SVG_RESTORAN = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';

const KupacIcon = L.divIcon({
    className: 'custom-map-icon-wrapper',
    html: '<div class="kupac-map-dot"><span></span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
});

const napraviRestoranIcon = (aktivan, zatvoren) => L.divIcon({
    className: 'custom-map-icon-wrapper',
    html: `
        <div class="restoran-map-marker${aktivan ? ' active' : ''}${zatvoren ? ' closed' : ''}">
            <div class="restoran-map-marker-inner"><span>${SVG_RESTORAN}</span></div>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

// =========================================================
// POMJERANJE MAPE
// =========================================================

function CentrirajMapu({ lat, lng }) {
    const map = useMap();

    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], 13, { animate: true });
        }
    }, [lat, lng, map]);

    return null;
}

function FokusirajRestoran({ restoran }) {
    const map = useMap();

    useEffect(() => {
        if (restoran?.lat != null && restoran?.lng != null) {
            map.flyTo([restoran.lat, restoran.lng], 15, { duration: 0.6 });
        }
    }, [restoran, map]);

    return null;
}

// Leaflet mora preračunati veličinu kad mapa postane vidljiva (prebacivanje Lista/Mapa na mobilnom)
function OsvjeziVelicinu({ okidac }) {
    const map = useMap();

    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 60);
        return () => clearTimeout(t);
    }, [okidac, map]);

    return null;
}

const nazivRestorana = (r) => r.nazivObjekta || r.naziv || 'Restoran';
const formatUdaljenost = (km) => (km != null ? Number(km).toFixed(1) : '0.0');

// =========================================================
// GLAVNA KOMPONENTA
// =========================================================

const KupacMapa = ({ onIzaberiRestoran }) => {
    // Banja Luka fallback
    const [kupacLokacija, setKupacLokacija] = useState({
        lat: 44.7722,
        lng: 17.1910
    });

    const [restorani, setRestorani] = useState([]);
    const [loadingLokacije, setLoadingLokacije] = useState(true);
    const [loadingRestorana, setLoadingRestorana] = useState(false);
    const [greska, setGreska] = useState('');
    const [lokacijaAktivna, setLokacijaAktivna] = useState(false);

    const [pretraga, setPretraga] = useState('');
    const [samoOtvoreni, setSamoOtvoreni] = useState(false);
    const [fokusiran, setFokusiran] = useState(null);
    const [recenzijeRestoran, setRecenzijeRestoran] = useState(null);
    const [mobilniPrikaz, setMobilniPrikaz] = useState('lista');

    const RADIJUS_KM = 5;

    // 1. LOKACIJA KUPCA
    useEffect(() => {
        if (!navigator.geolocation) {
            setGreska('Vaš browser ne podržava određivanje lokacije. Koristi se podrazumijevana lokacija.');
            setLoadingLokacije(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setKupacLokacija({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setGreska('');
                setLokacijaAktivna(true);
                setLoadingLokacije(false);
            },
            (error) => {
                console.warn('Lokacija nije dostupna:', error);
                setGreska('Lokacija nije odobrena. Koristi se podrazumijevana lokacija.');
                setLoadingLokacije(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }, []);

    // 2. RESTORANI U BLIZINI
    useEffect(() => {
        if (!kupacLokacija.lat || !kupacLokacija.lng) return;

        setLoadingRestorana(true);

        API.get('/restorani/u-blizini', {
            params: {
                lat: kupacLokacija.lat,
                lng: kupacLokacija.lng,
                radijusKm: RADIJUS_KM
            }
        })
            .then((res) => {
                setRestorani(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => {
                console.error('Greška pri dohvatanju restorana:', err);
                setRestorani([]);
                setGreska('Nije moguće učitati restorane u blizini.');
            })
            .finally(() => {
                setLoadingRestorana(false);
            });
    }, [kupacLokacija]);

    // 3. OTVORI RESTORAN
    const otvoriRestoran = (restoran) => {
        if (onIzaberiRestoran) {
            onIzaberiRestoran({
                ...restoran,
                nazivObjekta: restoran.nazivObjekta || restoran.naziv
            });
        }
    };

    const prikaziNaMapi = (restoran) => {
        setFokusiran({ ...restoran });
        setMobilniPrikaz('mapa');
    };

    const upit = pretraga.trim().toLowerCase();
    const prikazaniRestorani = restorani
        .filter((r) => {
            if (upit && !`${nazivRestorana(r)} ${r.adresa || ''}`.toLowerCase().includes(upit)) return false;
            if (samoOtvoreni && statusRadnogVremena(r.radnoVrijemeOd, r.radnoVrijemeDo).open === false) return false;
            return true;
        })
        .sort((a, b) => (Number(a.udaljenostKm) || 0) - (Number(b.udaljenostKm) || 0));

    const brojOtvorenih = restorani.filter(
        (r) => statusRadnogVremena(r.radnoVrijemeOd, r.radnoVrijemeDo).open !== false
    ).length;

    const ucitavanje = loadingRestorana || loadingLokacije;

    return (
        <section className="kupac-mapa-section" aria-labelledby="mapa-naslov">
            <div className="kupac-mapa-header">
                <div>
                    <span className="kupac-mapa-eyebrow">Istražite ponudu</span>
                    <h2 id="mapa-naslov">Restorani u vašoj blizini</h2>
                    <p>
                        {ucitavanje
                            ? 'Pronalazimo restorane u vašoj okolini...'
                            : `${restorani.length} restorana u krugu od ${RADIJUS_KM} km · ${brojOtvorenih} trenutno otvoreno`}
                    </p>
                </div>

                <div className="kupac-mapa-view-toggle" role="tablist" aria-label="Način prikaza">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobilniPrikaz === 'lista'}
                        className={mobilniPrikaz === 'lista' ? 'active' : ''}
                        onClick={() => setMobilniPrikaz('lista')}
                    >
                        <List size={15} aria-hidden="true" /> Lista
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobilniPrikaz === 'mapa'}
                        className={mobilniPrikaz === 'mapa' ? 'active' : ''}
                        onClick={() => setMobilniPrikaz('mapa')}
                    >
                        <MapIcon size={15} aria-hidden="true" /> Mapa
                    </button>
                </div>
            </div>

            {greska && (
                <div className="kupac-mapa-message" role="status">
                    <TriangleAlert size={16} aria-hidden="true" />
                    {greska}
                </div>
            )}

            <div className="kupac-mapa-filters">
                <label className="kupac-mapa-search">
                    <Search size={16} aria-hidden="true" />
                    <span className="sr-only">Pretraži restorane</span>
                    <input
                        type="search"
                        placeholder="Pretraži po nazivu ili adresi..."
                        value={pretraga}
                        onChange={(e) => setPretraga(e.target.value)}
                    />
                </label>
                <button
                    type="button"
                    className={samoOtvoreni ? 'kupac-mapa-chip active' : 'kupac-mapa-chip'}
                    aria-pressed={samoOtvoreni}
                    onClick={() => setSamoOtvoreni((v) => !v)}
                >
                    <Clock size={14} aria-hidden="true" /> Otvoreno sada
                </button>
            </div>

            <div className={`kupac-mapa-layout view-${mobilniPrikaz}`}>
                {/* LISTA */}
                <div className="kupac-map-results">
                    {ucitavanje ? (
                        <div className="kupac-map-restaurant-grid" aria-busy="true">
                            {[0, 1, 2].map((i) => (
                                <div className="kupac-map-restaurant-card skeleton" key={i}>
                                    <div className="map-skeleton icon" />
                                    <div className="map-card-info">
                                        <div className="map-skeleton line" />
                                        <div className="map-skeleton line short" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : prikazaniRestorani.length === 0 ? (
                        <div className="kupac-map-empty">
                            <span className="kupac-map-empty-icon" aria-hidden="true"><Utensils size={22} /></span>
                            <div>
                                <h3>{restorani.length === 0 ? 'Nema restorana u vašoj blizini' : 'Nema rezultata'}</h3>
                                <p>
                                    {restorani.length === 0
                                        ? `Trenutno nema registrovanih restorana u krugu od ${RADIJUS_KM} km.`
                                        : 'Pokušajte s drugim pojmom ili uklonite filter.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ul className="kupac-map-restaurant-grid">
                            {prikazaniRestorani.map((restoran) => {
                                const numericRating = Number(restoran.prosjecnaOcjena) || 0;
                                const brojOcjena = Number(restoran.ukupanBrojOcjena) || 0;
                                const hasRating = numericRating > 0;
                                const status = statusRadnogVremena(restoran.radnoVrijemeOd, restoran.radnoVrijemeDo);
                                const hours = formatRadnoVrijeme(restoran.radnoVrijemeOd, restoran.radnoVrijemeDo);
                                const jeFokusiran = fokusiran?.id === restoran.id;
                                const imaKoordinate = restoran.lat != null && restoran.lng != null;

                                return (
                                    <li
                                        className={jeFokusiran ? 'kupac-map-restaurant-card focused' : 'kupac-map-restaurant-card'}
                                        key={restoran.id}
                                    >
                                        <span className="map-card-icon" aria-hidden="true"><Utensils size={22} /></span>

                                        <div className="map-card-info">
                                            <div className="map-card-title-row">
                                                <h3>{nazivRestorana(restoran)}</h3>
                                                <span className={status.open === false ? 'map-card-status closed' : 'map-card-status'}>
                                                    {status.open === null ? 'N/A' : status.label}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                className="map-card-rating ocjena-dugme"
                                                title="Pogledaj recenzije kupaca"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRecenzijeRestoran(restoran);
                                                }}
                                            >
                                                <StarRating rating={numericRating} readOnly={true} />
                                                <span>
                                                    {hasRating
                                                        ? `${numericRating.toFixed(1)}${brojOcjena > 0 ? ` (${brojOcjena})` : ''}`
                                                        : 'Nema ocjena'}
                                                </span>
                                                <span className="ocjena-dugme-link">Recenzije</span>
                                            </button>

                                            <p className="map-card-meta">
                                                <MapPin size={13} aria-hidden="true" />
                                                <span>{restoran.adresa || 'Adresa nije unesena'}</span>
                                            </p>
                                            {hours && (
                                                <p className="map-card-meta">
                                                    <Clock size={13} aria-hidden="true" />
                                                    <span>{hours}</span>
                                                </p>
                                            )}

                                            <div className="map-card-bottom">
                                                <span className="map-card-distance">
                                                    <Navigation size={12} aria-hidden="true" />
                                                    {formatUdaljenost(restoran.udaljenostKm)} km
                                                </span>

                                                <div className="map-card-actions">
                                                    {imaKoordinate && (
                                                        <button
                                                            type="button"
                                                            className="map-card-secondary"
                                                            onClick={() => prikaziNaMapi(restoran)}
                                                            aria-label={`Prikaži ${nazivRestorana(restoran)} na mapi`}
                                                        >
                                                            <MapPin size={14} aria-hidden="true" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="map-card-primary"
                                                        onClick={() => otvoriRestoran(restoran)}
                                                    >
                                                        Pogledaj meni <ArrowRight size={14} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* MAPA */}
                <div className="kupac-map-container">
                    <MapContainer
                        center={[kupacLokacija.lat, kupacLokacija.lng]}
                        zoom={13}
                        scrollWheelZoom={true}
                        className="kupac-leaflet-map"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <CentrirajMapu lat={kupacLokacija.lat} lng={kupacLokacija.lng} />
                        <FokusirajRestoran restoran={fokusiran} />
                        <OsvjeziVelicinu okidac={mobilniPrikaz} />

                        <Marker position={[kupacLokacija.lat, kupacLokacija.lng]} icon={KupacIcon}>
                            <Popup className="premium-map-popup">
                                <div className="map-popup-content">
                                    <strong>Vaša lokacija</strong>
                                    <span>{lokacijaAktivna ? 'Trenutna pozicija' : 'Podrazumijevana lokacija'}</span>
                                </div>
                            </Popup>
                        </Marker>

                        <Circle
                            center={[kupacLokacija.lat, kupacLokacija.lng]}
                            radius={RADIJUS_KM * 1000}
                            pathOptions={{
                                className: 'kupac-radius-circle',
                                color: '#0f766e',
                                fillColor: '#0f766e',
                                fillOpacity: 0.05,
                                weight: 1,
                                opacity: 0.35
                            }}
                        />

                        {prikazaniRestorani
                            .filter((r) => r.lat != null && r.lng != null)
                            .map((restoran) => {
                                const status = statusRadnogVremena(restoran.radnoVrijemeOd, restoran.radnoVrijemeDo);
                                const hours = formatRadnoVrijeme(restoran.radnoVrijemeOd, restoran.radnoVrijemeDo);
                                return (
                                    <Marker
                                        key={restoran.id}
                                        position={[restoran.lat, restoran.lng]}
                                        icon={napraviRestoranIcon(fokusiran?.id === restoran.id, status.open === false)}
                                        eventHandlers={{ click: () => setFokusiran(restoran) }}
                                    >
                                        <Popup className="premium-map-popup">
                                            <div className="restaurant-map-popup">
                                                <h3>{nazivRestorana(restoran)}</h3>
                                                <p className="restaurant-popup-address">
                                                    {restoran.adresa || 'Adresa nije unesena'}
                                                </p>
                                                <div className="restaurant-popup-row">
                                                    <span className={status.open === false ? 'closed' : 'open'}>
                                                        {status.label}
                                                    </span>
                                                    {hours ? <span>{hours}</span> : null}
                                                    <span>{formatUdaljenost(restoran.udaljenostKm)} km</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="map-popup-button"
                                                    onClick={() => otvoriRestoran(restoran)}
                                                >
                                                    Pogledaj meni <ArrowRight size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                    </MapContainer>

                    <div className="map-location-badge">
                        <span className={lokacijaAktivna ? 'map-location-badge-dot' : 'map-location-badge-dot off'} />
                        {lokacijaAktivna ? 'Lokacija aktivna' : 'Približna lokacija'}
                    </div>
                </div>
            </div>

            {recenzijeRestoran && (
                <RecenzijeModal
                    restoranId={recenzijeRestoran.id || recenzijeRestoran.idKorisnika}
                    naziv={nazivRestorana(recenzijeRestoran)}
                    onClose={() => setRecenzijeRestoran(null)}
                />
            )}
        </section>
    );
};

export default KupacMapa;
