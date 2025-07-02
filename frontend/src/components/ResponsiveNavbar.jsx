import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Navbar, 
  Nav, 
  NavDropdown, 
  Container, 
  Button,
  Offcanvas 
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthContext } from '../context/AuthContext';

const ResponsiveNavbar = () => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { 
    user, 
    logout, 
    isAuthenticated, 
    canViewStatistics, 
    canViewAI, 
    canManageUsers,
    canManageTeams,
    canUseQRCheckin,
    canViewAllPlayers,
    canAccessFeature
  } = useContext(AuthContext);

  const handleClose = () => setShowOffcanvas(false);
  const handleShow = () => setShowOffcanvas(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const handleNavClick = () => {
    handleClose();
  };

  return (
    <>
      {/* Fő Navbar */}
      <Navbar bg="primary" variant="dark" expand="lg" fixed="top" className="academy-navbar">
        <Container fluid>
          <Navbar.Brand as={Link} to="/">
            🦁 Football Academy
          </Navbar.Brand>
          
          {isAuthenticated && (
            <>
              {/* Desktop Navigation */}
              <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                  <Nav.Link as={Link} to="/" active={isActive('/')}>
                    📊 Dashboard
                  </Nav.Link>
                  
                  {/* Admin Panel - csak admin */}
                  {canManageUsers() && (
                    <Nav.Link as={Link} to="/admin" active={isActive('/admin')}>
                      👨‍💼 Admin Panel
                    </Nav.Link>
                  )}
                  
                  {/* Csapataim - csak coach */}
                  {canManageTeams() && (
                    <Nav.Link as={Link} to="/my-teams" active={isActive('/my-teams')}>
                      🏆 Csapataim
                    </Nav.Link>
                  )}
                  
                  {/* Játékosok - admin és coach */}
                  {canViewAllPlayers() && (
                    <Nav.Link as={Link} to="/players" active={isActive('/players')}>
                      👥 Játékosok
                    </Nav.Link>
                  )}
                  
                  {/* Csapatok - admin és coach */}
                  {canViewAllPlayers() && (
                    <Nav.Link as={Link} to="/teams" active={isActive('/teams')}>
                      🏆 Csapatok
                    </Nav.Link>
                  )}
                  
                  <Nav.Link as={Link} to="/trainings" active={isActive('/trainings')}>
                    🏃 Edzések
                  </Nav.Link>
                  
                  <Nav.Link as={Link} to="/announcements" active={isActive('/announcements')}>
                    📢 Hírek
                  </Nav.Link>
                  
                  <Nav.Link as={Link} to="/matches" active={isActive('/matches')}>
                    ⚽ Mérkőzések
                  </Nav.Link>
                  
                  {/* Statisztikák Dropdown */}
                  {(canViewStatistics() || canViewAI()) && (
                    <NavDropdown title="📈 Statisztikák" id="stats-dropdown">
                      {canViewStatistics() && (
                        <NavDropdown.Item as={Link} to="/statistics">
                          📈 Statisztikák
                        </NavDropdown.Item>
                      )}
                      {canViewAI() && (
                        <NavDropdown.Item as={Link} to="/ai-analytics">
                          🤖 AI Analytics
                        </NavDropdown.Item>
                      )}
                    </NavDropdown>
                  )}
                  
                  {/* Fejlesztés Dropdown */}
                  {(canAccessFeature('canManageInjuries') || (user?.role === 'admin' || user?.role === 'coach') || canUseQRCheckin()) && (
                    <NavDropdown title="⚙️ Fejlesztés" id="dev-dropdown">
                      {canAccessFeature('canManageInjuries') && (
                        <NavDropdown.Item as={Link} to="/injuries">
                          🩹 Sérülések
                        </NavDropdown.Item>
                      )}
                      {(user?.role === 'admin' || user?.role === 'coach') && (
                        <NavDropdown.Item as={Link} to="/development-plans">
                          📋 Fejlesztési Tervek
                        </NavDropdown.Item>
                      )}
                      {canUseQRCheckin() && (
                        <NavDropdown.Item as={Link} to="/qr-checkin">
                          📱 QR Check-in
                        </NavDropdown.Item>
                      )}
                    </NavDropdown>
                  )}
                  
                  <Nav.Link as={Link} to="/billing" active={isActive('/billing')}>
                    💰 Pénzügyek
                  </Nav.Link>
                </Nav>
                
                {/* User Menu */}
                <Nav className="ms-auto">
                  <NavDropdown 
                    title={
                      <span>
                        👤 {user?.full_name || user?.username}
                        <small className="d-block text-light opacity-75">
                          {user?.role === 'admin' ? 'Adminisztrátor' : 
                           user?.role === 'coach' ? 'Edző' : 
                           user?.role === 'parent' ? 'Szülő' :
                           user?.role === 'player' ? 'Játékos' : 'Felhasználó'}
                        </small>
                      </span>
                    } 
                    id="user-dropdown"
                    align="end"
                  >
                    <NavDropdown.Item as={Link} to="/profile">
                      👤 Profil
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleLogout}>
                      🚪 Kijelentkezés
                    </NavDropdown.Item>
                  </NavDropdown>
                </Nav>
              </Navbar.Collapse>

              {/* Mobile Menu Gomb */}
              <Button
                variant="outline-light"
                className="d-lg-none ms-2"
                onClick={handleShow}
              >
                ☰
              </Button>
            </>
          )}
          
          {!isAuthenticated && (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login">
                Bejelentkezés
              </Nav.Link>
            </Nav>
          )}
        </Container>
      </Navbar>

      {/* Mobile Offcanvas Menu */}
      {isAuthenticated && (
        <Offcanvas show={showOffcanvas} onHide={handleClose} placement="start">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>🦁 Academy Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/" onClick={handleNavClick}>
                📊 Dashboard
              </Nav.Link>
              
              {/* Admin Panel - csak admin */}
              {canManageUsers() && (
                <Nav.Link as={Link} to="/admin" onClick={handleNavClick}>
                  👨‍💼 Admin Panel
                </Nav.Link>
              )}
              
              {/* Csapataim - csak coach */}
              {canManageTeams() && (
                <Nav.Link as={Link} to="/my-teams" onClick={handleNavClick}>
                  🏆 Csapataim
                </Nav.Link>
              )}
              
              {/* Játékosok - admin és coach */}
              {canViewAllPlayers() && (
                <Nav.Link as={Link} to="/players" onClick={handleNavClick}>
                  👥 Játékosok
                </Nav.Link>
              )}
              
              {/* Csapatok - admin és coach */}
              {canViewAllPlayers() && (
                <Nav.Link as={Link} to="/teams" onClick={handleNavClick}>
                  🏆 Csapatok
                </Nav.Link>
              )}
              
              <Nav.Link as={Link} to="/trainings" onClick={handleNavClick}>
                🏃 Edzések
              </Nav.Link>
              
              <Nav.Link as={Link} to="/announcements" onClick={handleNavClick}>
                📢 Hírek
              </Nav.Link>
              
              <Nav.Link as={Link} to="/matches" onClick={handleNavClick}>
                ⚽ Mérkőzések
              </Nav.Link>
              
              {/* Statisztikák */}
              {canViewStatistics() && (
                <Nav.Link as={Link} to="/statistics" onClick={handleNavClick}>
                  📈 Statisztikák
                </Nav.Link>
              )}
              
              {canViewAI() && (
                <Nav.Link as={Link} to="/ai-analytics" onClick={handleNavClick}>
                  🤖 AI Analytics
                </Nav.Link>
              )}
              
              {/* Fejlesztés */}
              {canAccessFeature('canManageInjuries') && (
                <Nav.Link as={Link} to="/injuries" onClick={handleNavClick}>
                  🩹 Sérülések
                </Nav.Link>
              )}
              
              {(user?.role === 'admin' || user?.role === 'coach') && (
                <Nav.Link as={Link} to="/development-plans" onClick={handleNavClick}>
                  📋 Fejlesztési Tervek
                </Nav.Link>
              )}
              
              {canUseQRCheckin() && (
                <Nav.Link as={Link} to="/qr-checkin" onClick={handleNavClick}>
                  📱 QR Check-in
                </Nav.Link>
              )}
              
              <Nav.Link as={Link} to="/billing" onClick={handleNavClick}>
                💰 Pénzügyek
              </Nav.Link>
              
              <hr />
              
              <Nav.Link as={Link} to="/profile" onClick={handleNavClick}>
                👤 Profil
              </Nav.Link>
              
              <Nav.Link onClick={handleLogout}>
                🚪 Kijelentkezés
              </Nav.Link>
              
              <div className="mt-3 p-2 bg-light rounded">
                <small className="text-muted">
                  <strong>{user?.full_name || user?.username}</strong><br/>
                  {user?.role === 'admin' ? 'Adminisztrátor' : 
                   user?.role === 'coach' ? 'Edző' : 
                   user?.role === 'parent' ? 'Szülő' :
                   user?.role === 'player' ? 'Játékos' : 'Felhasználó'}
                </small>
              </div>
            </Nav>
          </Offcanvas.Body>
        </Offcanvas>
      )}
    </>
  );
};

export default ResponsiveNavbar;