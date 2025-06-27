import React, { useState, useEffect } from 'react';
import '../styles/mobile.css';

const MobileNavigation = ({ children, sidebarItems = [] }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.keyCode === 27) {
                setSidebarOpen(false);
            }
        };

        if (sidebarOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <>
            {/* Mobile Sidebar */}
            <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="p-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Menü</h5>
                        <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={closeSidebar}
                            aria-label="Menü bezárása"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div className="p-0">
                    {sidebarItems.map((item, index) => (
                        <div key={index}>
                            {item.type === 'link' && (
                                <a 
                                    href={item.href}
                                    className="d-block p-3 text-decoration-none text-dark border-bottom"
                                    onClick={closeSidebar}
                                >
                                    {item.icon && <i className={`${item.icon} me-2`}></i>}
                                    {item.label}
                                </a>
                            )}
                            {item.type === 'button' && (
                                <button 
                                    className="btn btn-link d-block w-100 text-start p-3 text-dark border-bottom text-decoration-none"
                                    onClick={() => {
                                        item.onClick();
                                        closeSidebar();
                                    }}
                                >
                                    {item.icon && <i className={`${item.icon} me-2`}></i>}
                                    {item.label}
                                </button>
                            )}
                            {item.type === 'divider' && (
                                <hr className="my-2" />
                            )}
                            {item.type === 'header' && (
                                <div className="px-3 py-2 text-muted small fw-bold">
                                    {item.label}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar Overlay */}
            <div 
                className={`mobile-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            ></div>

            {/* Main Content */}
            <div className="main-content">
                {children}
            </div>

            {/* Mobile Menu Trigger Button (FAB) */}
            <button 
                className="btn btn-primary btn-fab d-md-none"
                onClick={toggleSidebar}
                aria-label="Menü megnyitása"
            >
                <i className="fas fa-bars"></i>
            </button>
        </>
    );
};

// Touch gesture hook for swipe functionality
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = threshold;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        }
        if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};

// Pull to refresh hook
export const usePullToRefresh = (onRefresh, threshold = 100) => {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            setIsPulling(true);
        }
    };

    const handleTouchMove = (e) => {
        if (isPulling && window.scrollY === 0) {
            const touch = e.touches[0];
            const distance = Math.max(0, touch.clientY - (touch.target.offsetTop || 0));
            setPullDistance(Math.min(distance, threshold * 2));
        }
    };

    const handleTouchEnd = async () => {
        if (isPulling && pullDistance > threshold) {
            setIsRefreshing(true);
            if (onRefresh) {
                await onRefresh();
            }
            setIsRefreshing(false);
        }
        setIsPulling(false);
        setPullDistance(0);
    };

    return {
        isPulling,
        pullDistance,
        isRefreshing,
        pullToRefreshHandlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd
        }
    };
};

// Mobile-friendly confirmation dialog
export const MobileConfirmDialog = ({ 
    show, 
    title, 
    message, 
    confirmText = 'Igen', 
    cancelText = 'Mégse',
    onConfirm, 
    onCancel,
    variant = 'danger' 
}) => {
    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title">{title}</h5>
                    </div>
                    <div className="modal-body">
                        <p className="mb-0">{message}</p>
                    </div>
                    <div className="modal-footer border-0 pt-0">
                        <button 
                            type="button" 
                            className="btn btn-outline-secondary mobile-btn"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                        <button 
                            type="button" 
                            className={`btn btn-${variant} mobile-btn`}
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

export default MobileNavigation;