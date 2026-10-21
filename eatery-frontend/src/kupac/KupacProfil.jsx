import React, { useEffect, useState } from 'react';
import { User, AtSign, Mail, Pencil, Gift, Wallet, KeyRound, CircleCheck, TriangleAlert, Leaf } from 'lucide-react';
import API from '../api';
import PromjenaSifre from '../components/PromjenaSifre';
import './KupacProfil.css';

const POLJA = [
    { name: 'ime', label: 'Ime i prezime', Icon: User, type: 'text', autoComplete: 'name' },
    { name: 'korisnickoIme', label: 'Korisničko ime', Icon: AtSign, type: 'text', autoComplete: 'username' },
    { name: 'email', label: 'Email', Icon: Mail, type: 'email', autoComplete: 'email' }
];

function KupacProfil({ kupacId, user, onUserUpdate }) {
    const [profil, setProfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [greska, setGreska] = useState('');
    const [uredi, setUredi] = useState(false);
    const [saving, setSaving] = useState(false);
    const [poruka, setPoruka] = useState('');
    const [porukaTip, setPorukaTip] = useState('success');
    const [forma, setForma] = useState({
        ime: '',
        email: '',
        korisnickoIme: ''
    });

    useEffect(() => {
        if (!kupacId) {
            setGreska('Nije pronađen ID kupca.');
            setLoading(false);
            return;
        }

        setLoading(true);
        API.get(`/kupac/profil/${kupacId}`)
            .then(res => {
                const data = res.data || {};
                setProfil(data);
                setForma({
                    ime: data.ime ?? '',
                    email: data.email ?? '',
                    korisnickoIme: data.korisnickoIme ?? ''
                });
                setGreska('');
            })
            .catch(err => {
                console.error('Greška pri učitavanju profila:', err);
                setGreska(
                    err.response?.data?.message ||
                    (typeof err.response?.data === 'string' ? err.response.data : null) ||
                    'Greška pri učitavanju profila.'
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, [kupacId]);

    const handleChange = (e) => {
        setForma({ ...forma, [e.target.name]: e.target.value });
    };

    const otkaziIzmjene = () => {
        setForma({
            ime: profil?.ime ?? '',
            email: profil?.email ?? '',
            korisnickoIme: profil?.korisnickoIme ?? ''
        });
        setPoruka('');
        setUredi(false);
    };

    const sacuvajProfil = async (e) => {
        e.preventDefault();
        setPoruka('');
        setSaving(true);

        try {
            const res = await API.put(`/kupac/profil/${kupacId}`, forma);
            const updatedData = res.data;

            setProfil(updatedData);
            setUredi(false);
            setPorukaTip('success');
            setPoruka('Profil je uspješno sačuvan.');

            const azuriraniUser = {
                ...(user || {}),
                korisnickoIme: updatedData.korisnickoIme,
                email: updatedData.email,
                ime: updatedData.ime
            };

            localStorage.setItem('user', JSON.stringify(azuriraniUser));
            if (onUserUpdate) {
                onUserUpdate(azuriraniUser);
            }
        } catch (err) {
            setPorukaTip('error');
            setPoruka(
                err.response?.data?.message ||
                (typeof err.response?.data === 'string' ? err.response.data : null) ||
                'Greška pri čuvanju profila.'
            );
        } finally {
            setSaving(false);
        }
    };

    const zaglavlje = (
        <div className="page-heading">
            <span className="section-label">Moj nalog</span>
            <h1>Moj profil</h1>
            <p>Pregledajte statistiku i ažurirajte podatke svog Eatery naloga.</p>
        </div>
    );

    if (loading) {
        return (
            <section className="profile-section" id="profil">
                {zaglavlje}
                <div className="profile-layout" aria-busy="true">
                    <div className="profile-card profile-skeleton tall" />
                    <div className="profile-card profile-skeleton" />
                </div>
            </section>
        );
    }

    if (greska) {
        return (
            <section className="profile-section" id="profil">
                {zaglavlje}
                <div className="profil-error" role="alert">
                    <span className="profil-error-icon" aria-hidden="true"><TriangleAlert size={22} /></span>
                    <h3>Profil nije moguće učitati</h3>
                    <p>{String(greska)}</p>
                </div>
            </section>
        );
    }

    if (!profil) {
        return null;
    }

    const ime = profil.ime?.trim() || profil.korisnickoIme || 'Korisnik';
    const korisnickoIme = profil.korisnickoIme || 'korisnik';
    const inicijal = ime.charAt(0).toUpperCase();
    const brojVrecica = Number(profil.ukupnoVrecica || 0);
    const ukupnaUsteda = Number(profil.ukupnaUstedaKM || 0);

    const vrijednostPolja = (name) => {
        if (name === 'ime') return profil.ime || 'Nije uneseno';
        if (name === 'korisnickoIme') return korisnickoIme;
        return profil.email || 'Email nije dostupan';
    };

    return (
        <section className="profile-section" id="profil">
            {zaglavlje}

            <div className="profile-layout">
                <aside className="profile-card profile-summary">
                    <div className="profile-summary-cover" aria-hidden="true" />
                    <div className="profile-avatar" aria-hidden="true">{inicijal}</div>
                    <h2>{ime}</h2>
                    <p className="profile-handle">@{korisnickoIme}</p>
                    <span className="profile-role">Kupac</span>

                    <div className="profile-stats">
                        <div className="profile-stat">
                            <span className="profile-stat-icon amber" aria-hidden="true"><Gift size={16} /></span>
                            <strong>{brojVrecica}</strong>
                            <span>Kupljenih vrećica</span>
                        </div>
                        <div className="profile-stat">
                            <span className="profile-stat-icon" aria-hidden="true"><Wallet size={16} /></span>
                            <strong>{ukupnaUsteda.toFixed(2)} KM</strong>
                            <span>Ukupna ušteda</span>
                        </div>
                    </div>

                    {brojVrecica > 0 && (
                        <p className="profile-impact">
                            <Leaf size={14} aria-hidden="true" />
                            Spasili ste {brojVrecica} {brojVrecica === 1 ? 'obrok' : 'obroka'} od bacanja.
                        </p>
                    )}
                </aside>

                <div className="profile-main">
                    <div className="profile-card">
                        <div className="profile-card-title">
                            <span className="profile-card-icon" aria-hidden="true"><User size={18} /></span>
                            <div>
                                <h3>Podaci naloga</h3>
                                <p>{uredi ? 'Izmijenite podatke i sačuvajte' : 'Vaše lične informacije'}</p>
                            </div>
                            {!uredi && (
                                <button
                                    className="profile-edit-button"
                                    type="button"
                                    onClick={() => {
                                        setPoruka('');
                                        setUredi(true);
                                    }}
                                >
                                    <Pencil size={14} aria-hidden="true" /> Uredi
                                </button>
                            )}
                        </div>

                        {uredi ? (
                            <form className="profile-edit-form" onSubmit={sacuvajProfil}>
                                <div className="profile-edit-grid">
                                    {POLJA.map(({ name, label, type, autoComplete }) => (
                                        <label key={name} className={name === 'email' ? 'full' : undefined}>
                                            {label}
                                            <input
                                                name={name}
                                                type={type}
                                                value={forma[name]}
                                                onChange={handleChange}
                                                autoComplete={autoComplete}
                                                required
                                            />
                                        </label>
                                    ))}
                                </div>
                                {poruka && porukaTip === 'error' && (
                                    <p className="profile-edit-message error" role="alert">{poruka}</p>
                                )}
                                <div className="profile-edit-actions">
                                    <button
                                        className="profile-cancel-button"
                                        type="button"
                                        onClick={otkaziIzmjene}
                                        disabled={saving}
                                    >
                                        Otkaži
                                    </button>
                                    <button className="profile-save-button" type="submit" disabled={saving}>
                                        {saving ? 'Spremanje...' : 'Sačuvaj izmjene'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <dl className="profile-info-list">
                                    {POLJA.map(({ name, label, Icon }) => (
                                        <div className="profile-info-row" key={name}>
                                            <span className="profile-info-icon" aria-hidden="true"><Icon size={16} /></span>
                                            <div>
                                                <dt>{label}</dt>
                                                <dd>{vrijednostPolja(name)}</dd>
                                            </div>
                                        </div>
                                    ))}
                                </dl>
                                {poruka && (
                                    <p className={`profile-edit-message ${porukaTip}`} role="status">
                                        {porukaTip === 'success' && <CircleCheck size={15} aria-hidden="true" />}
                                        {poruka}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="profile-card profile-password-card">
                        <div className="profile-card-title">
                            <span className="profile-card-icon" aria-hidden="true"><KeyRound size={18} /></span>
                            <div>
                                <h3>Sigurnost</h3>
                                <p>Promijenite lozinku svog naloga</p>
                            </div>
                        </div>
                        <PromjenaSifre />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default KupacProfil;
