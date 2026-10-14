import React, { useEffect } from 'react';
import RecenzijeLista from './RecenzijeLista';
import './Recenzije.css';

function RecenzijeModal({ restoranId, naziv, onClose }) {
    useEffect(() => {
        const naEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', naEscape);
        return () => window.removeEventListener('keydown', naEscape);
    }, [onClose]);

    return (
        <div className="recenzije-modal-pozadina" onClick={onClose}>
            <div
                className="recenzije-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Recenzije: ${naziv || 'restoran'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="recenzije-modal-zaglavlje">
                    <div>
                        <span>RECENZIJE KUPACA</span>
                        <h3>{naziv || 'Restoran'}</h3>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Zatvori">✕</button>
                </div>
                <div className="recenzije-modal-sadrzaj">
                    <RecenzijeLista restoranId={restoranId} />
                </div>
            </div>
        </div>
    );
}

export default RecenzijeModal;
