import React from 'react';

// API hibák kezelése
export const handleApiError = (error) => {
    if (error.response) {
        // Szerver válaszolt hibával
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
            case 400:
                // Validációs hibák
                if (data.errors && Array.isArray(data.errors)) {
                    return data.errors.join(', ');
                }
                return data.error || 'Hibás adatok';
            case 401:
                return 'Nincs jogosultság a művelethez';
            case 403:
                return 'Hozzáférés megtagadva';
            case 404:
                return 'Az erőforrás nem található';
            case 409:
                return 'Konfliktus: ' + (data.error || 'Az adatok ütköznek');
            case 422:
                return 'Feldolgozási hiba: ' + (data.error || 'Érvénytelen adatok');
            case 500:
                return 'Belső szerverhiba történt';
            case 502:
                return 'A szerver nem elérhető';
            case 503:
                return 'A szolgáltatás átmenetileg nem elérhető';
            default:
                return `Ismeretlen hiba (${status}): ` + (data.error || 'Ismeretlen ok');
        }
    } else if (error.request) {
        // Nem érkezett válasz
        return 'Kapcsolati hiba - nincs válasz a szervertől. Ellenőrizze az internetkapcsolatot.';
    } else {
        // Egyéb hiba
        return 'Hiba a kérés feldolgozásában: ' + error.message;
    }
};

// Loading komponens
export const LoadingSpinner = ({ size = 'md', text = 'Betöltés...' }) => {
    const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
    
    return (
        <div className="d-flex justify-content-center align-items-center">
            <div className={`spinner-border ${sizeClass}`} role="status">
                <span className="visually-hidden">{text}</span>
            </div>
            {text && size !== 'sm' && (
                <span className="ms-2">{text}</span>
            )}
        </div>
    );
};

// Error Alert komponens
export const ErrorAlert = ({ message, onClose, variant = 'danger' }) => (
    <div className={`alert alert-${variant} alert-dismissible fade show`} role="alert">
        <strong>Hiba!</strong> {message}
        {onClose && (
            <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Bezárás"
            ></button>
        )}
    </div>
);

// Success Alert komponens
export const SuccessAlert = ({ message, onClose }) => (
    <div className="alert alert-success alert-dismissible fade show" role="alert">
        <strong>Siker!</strong> {message}
        {onClose && (
            <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Bezárás"
            ></button>
        )}
    </div>
);

// Warning Alert komponens
export const WarningAlert = ({ message, onClose }) => (
    <div className="alert alert-warning alert-dismissible fade show" role="alert">
        <strong>Figyelem!</strong> {message}
        {onClose && (
            <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Bezárás"
            ></button>
        )}
    </div>
);

// Info Alert komponens
export const InfoAlert = ({ message, onClose }) => (
    <div className="alert alert-info alert-dismissible fade show" role="alert">
        <strong>Információ:</strong> {message}
        {onClose && (
            <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Bezárás"
            ></button>
        )}
    </div>
);

// Confirmation Modal komponens
export const ConfirmationModal = ({ 
    show, 
    title = 'Megerősítés', 
    message, 
    onConfirm, 
    onCancel,
    confirmText = 'Igen',
    cancelText = 'Mégse',
    variant = 'danger'
}) => {
    if (!show) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onCancel}
                        ></button>
                    </div>
                    <div className="modal-body">
                        <p>{message}</p>
                    </div>
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                        <button 
                            type="button" 
                            className={`btn btn-${variant}`} 
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Empty State komponens
export const EmptyState = ({ 
    icon = '📂', 
    title = 'Nincsenek adatok', 
    description, 
    actionButton 
}) => (
    <div className="text-center py-5">
        <div className="mb-3" style={{ fontSize: '3rem' }}>
            {icon}
        </div>
        <h4 className="text-muted">{title}</h4>
        {description && (
            <p className="text-muted">{description}</p>
        )}
        {actionButton && (
            <div className="mt-3">
                {actionButton}
            </div>
        )}
    </div>
);

// Network Error komponens
export const NetworkError = ({ onRetry }) => (
    <div className="text-center py-5">
        <div className="mb-3" style={{ fontSize: '3rem' }}>
            🌐❌
        </div>
        <h4 className="text-danger">Kapcsolati hiba</h4>
        <p className="text-muted">
            Nem sikerült kapcsolatot létesíteni a szerverrel.<br/>
            Ellenőrizze az internetkapcsolatot és próbálja újra.
        </p>
        {onRetry && (
            <button className="btn btn-primary" onClick={onRetry}>
                🔄 Újrapróbálás
            </button>
        )}
    </div>
);

// Retry wrapper hook
export const useRetry = (asyncFunction, maxRetries = 3) => {
    const [retryCount, setRetryCount] = React.useState(0);
    
    const retry = async () => {
        if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            try {
                await asyncFunction();
                setRetryCount(0); // Reset on success
            } catch (error) {
                if (retryCount >= maxRetries - 1) {
                    throw error; // Re-throw if max retries reached
                }
            }
        }
    };
    
    return { retry, retryCount, canRetry: retryCount < maxRetries };
};