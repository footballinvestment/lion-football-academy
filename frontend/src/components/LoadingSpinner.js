import React from 'react';

const LoadingSpinner = ({ 
    size = 'md', 
    text = 'Betöltés...', 
    overlay = false,
    fullPage = false 
}) => {
    const sizeClasses = {
        sm: 'spinner-border-sm',
        md: '',
        lg: 'spinner-border spinner-border-lg'
    };

    const spinner = (
        <div className={`d-flex ${fullPage ? 'justify-content-center align-items-center min-vh-100' : 'justify-content-center align-items-center'} ${overlay ? 'position-absolute w-100 h-100' : ''}`}>
            <div className={`spinner-border text-primary me-2 ${sizeClasses[size]}`} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            {text && <span className="text-muted">{text}</span>}
        </div>
    );

    if (overlay) {
        return (
            <div className="position-relative">
                <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 1000 }}>
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
};

// Inline loading button
export const LoadingButton = ({ loading, children, ...props }) => (
    <button {...props} disabled={loading || props.disabled}>
        {loading && (
            <span className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
            </span>
        )}
        {children}
    </button>
);

// Loading skeleton for content
export const LoadingSkeleton = ({ lines = 3, height = '1rem' }) => (
    <div className="animate-pulse">
        {Array.from({ length: lines }).map((_, index) => (
            <div 
                key={index}
                className="bg-secondary bg-opacity-25 rounded mb-2"
                style={{ height, width: `${Math.random() * 40 + 60}%` }}
            />
        ))}
    </div>
);

// Loading card placeholder
export const LoadingCard = ({ count = 1 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="card mb-3">
                <div className="card-body">
                    <LoadingSkeleton lines={3} />
                </div>
            </div>
        ))}
    </>
);

export default LoadingSpinner;