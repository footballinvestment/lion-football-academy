import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="container mt-4">
                    <div className="alert alert-danger" role="alert">
                        <div className="d-flex align-items-center">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            <div>
                                <h5 className="alert-heading mb-2">Hiba történt!</h5>
                                <p className="mb-3">
                                    Sajnos egy váratlan hiba lépett fel. Kérjük, próbálja meg újra, vagy jelentse a problémát az adminisztrátornak.
                                </p>
                                {process.env.NODE_ENV === 'development' && (
                                    <details className="mb-3">
                                        <summary className="fw-bold">Hiba részletei (fejlesztői információ)</summary>
                                        <pre className="mt-2 small text-muted">
                                            {this.state.error && this.state.error.toString()}
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                                <div className="d-flex gap-2">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={this.handleReset}
                                    >
                                        <i className="fas fa-redo me-1"></i>
                                        Újrapróbálás
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary"
                                        onClick={() => window.location.reload()}
                                    >
                                        <i className="fas fa-refresh me-1"></i>
                                        Oldal újratöltése
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook version for functional components
export const useErrorHandler = () => {
    const [error, setError] = React.useState(null);

    const resetError = React.useCallback(() => {
        setError(null);
    }, []);

    const handleError = React.useCallback((error) => {
        console.error('Handled error:', error);
        setError(error);
    }, []);

    React.useEffect(() => {
        const handleUnhandledRejection = (event) => {
            handleError(new Error(event.reason));
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [handleError]);

    return { error, handleError, resetError };
};

export default ErrorBoundary;