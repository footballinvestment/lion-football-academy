import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { Button, Alert, LoadingSpinner } from '../../components/ui';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError, isAuthenticated } = useLogin();
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    
    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const validateForm = () => {
        const errors = {};
        
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }
        
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear validation error when user starts typing
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
        
        // Clear login error when user changes input
        if (error) {
            clearError();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('🔧 Form Submit Debug:', formData);
        
        if (!validateForm()) {
            return;
        }

        const result = await login(formData.username, formData.password, formData.rememberMe);
        
        if (result.success) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo and Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <img 
                            src="/images/lion-logo.png" 
                            alt="Lion Football Academy" 
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <div className="logo-fallback" style={{ display: 'none' }}>
                            🦁
                        </div>
                    </div>
                    <h1 className="login-title">Lion Football Academy</h1>
                    <p className="login-subtitle">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {error && (
                        <Alert 
                            variant="error" 
                            dismissible 
                            onClose={clearError}
                            className="mb-6"
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Username Field */}
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Username
                        </label>
                        <div className="input-container">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                className={`form-input ${validationErrors.username ? 'form-input--error' : ''}`}
                                placeholder="Enter your username"
                                disabled={isLoading}
                                autoComplete="username"
                                autoFocus
                            />
                            <div className="input-icon">
                                <svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>
                        {validationErrors.username && (
                            <div className="form-error">
                                {validationErrors.username}
                            </div>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <div className="input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className={`form-input ${validationErrors.password ? 'form-input--error' : ''}`}
                                placeholder="Enter your password"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            <div className="input-icon">
                                <svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <circle cx="12" cy="16" r="1"></circle>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                                disabled={isLoading}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                        {validationErrors.password && (
                            <div className="form-error">
                                {validationErrors.password}
                            </div>
                        )}
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                className="checkbox-input"
                            />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-text">Remember me</span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={isLoading}
                        disabled={isLoading}
                        className="login-submit"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register" className="login-link">
                            Contact your administrator
                        </Link>
                    </p>
                    <p className="login-help">
                        <Link to="/forgot-password" className="login-link">
                            Forgot your password?
                        </Link>
                    </p>
                </div>
            </div>

            {/* Background */}
            <div className="login-background">
                <div className="background-overlay"></div>
                <div className="background-pattern"></div>
            </div>
        </div>
    );
};

export default Login;