import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from './navigation/Navbar';
import Sidebar from './navigation/Sidebar';
import MobileNav from './navigation/MobileNav';
import './ResponsiveNavbar.css';

const ResponsiveNavbar = () => {
    const { isAuthenticated } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    };

    if (!isAuthenticated) {
        return <Navbar />;
    }

    return (
        <div className="responsive-navbar">
            <Navbar 
                onSidebarToggle={handleSidebarToggle}
                sidebarOpen={sidebarOpen}
            />
            <Sidebar 
                isOpen={sidebarOpen}
                onClose={handleSidebarClose}
            />
            <MobileNav />
        </div>
    );
};

export default ResponsiveNavbar;