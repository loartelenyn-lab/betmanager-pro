import { useState, useEffect } from 'react'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import BetForm from './components/BetForm'
import Settlement from './components/Settlement'
import Bankroll from './components/bankroll'
import Calculators from './components/Calculators'
import Reports from './components/Reports'
import Admin from './components/Admin'

const INACTIVITY_LIMIT = 15 * 60 * 1000 

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('betManager_user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('betManager_screen') || 'landing'
  })
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('betManager_theme') || 'dark'
  })

  // NUEVO: Estados para manejar la adaptabilidad móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // NUEVO: Detectar cambios de tamaño de pantalla en tiempo real
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    setUser(null)
    setCurrentScreen('landing')
    localStorage.removeItem('betManager_user')
    localStorage.removeItem('betManager_screen')
    localStorage.removeItem('betManager_lastActivity')
  }

  // 1. CONTROL DE INACTIVIDAD Y RECARGA
  useEffect(() => {
    if (!user) return

    const lastActivity = localStorage.getItem('betManager_lastActivity')
    const now = Date.now()

    if (lastActivity && now - parseInt(lastActivity, 10) > INACTIVITY_LIMIT) {
      handleLogout()
      return
    }

    const updateActivity = () => {
      localStorage.setItem('betManager_lastActivity', Date.now().toString())
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    const interval = setInterval(() => {
      const storedActivity = localStorage.getItem('betManager_lastActivity')
      if (storedActivity && Date.now() - parseInt(storedActivity, 10) > INACTIVITY_LIMIT) {
        handleLogout()
      }
    }, 30000)

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
      clearInterval(interval)
    }
  }, [user])

  // 2. SINCRONIZACIÓN CON LOCALSTORAGE
  useEffect(() => {
    if (user) {
      localStorage.setItem('betManager_user', JSON.stringify(user))
      if (!localStorage.getItem('betManager_lastActivity')) {
        localStorage.setItem('betManager_lastActivity', Date.now().toString())
      }
    } else {
      localStorage.removeItem('betManager_user')
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('betManager_screen', currentScreen)
  }, [currentScreen])

  useEffect(() => {
    localStorage.setItem('betManager_theme', theme)
  }, [theme])

  const themes = {
    dark: {
      bgMain: '#07090e',
      bgContainer: '#0f172a',
      textMain: '#ffffff',
      textMuted: '#94a3b8',
      border: '#1e293b'
    },
    light: {
      bgMain: '#f1f5f9',
      bgContainer: '#ffffff',
      textMain: '#0f172a',
      textMuted: '#64748b',
      border: '#cbd5e1'
    }
  }

  const currentTheme = themes[theme]

  if (!user) {
    if (currentScreen === 'login') {
      return (
        <Login 
          onLoginSuccess={(userData) => { 
            setUser(userData)
            setCurrentScreen('dashboard') 
            localStorage.setItem('betManager_lastActivity', Date.now().toString())
          }} 
          onGoToLanding={() => setCurrentScreen('landing')}
        />
      )
    }
    return <LandingPage onGoToLogin={() => setCurrentScreen('login')} />
  }

  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: currentTheme.bgMain, 
      color: currentTheme.textMain, 
      overflow: 'hidden', 
      boxSizing: 'border-box' 
    }}>
      
      {/* ESTILOS DE SCROLLBAR GLOBAL Y COMPONENTES MÓVILES */}
      <style>{`
        .main-content-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .main-content-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .main-content-scroll::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#1e293b' : '#cbd5e1'};
          border-radius: 6px;
        }
        .main-content-scroll::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#334155' : '#94a3b8'};
        }
      `}</style>

      {/* CONTENEDOR LATERAL DEL SIDEBAR (Solo se muestra en PC / pantallas grandes) */}
      {!isMobile && (
        <div style={{ width: '260px', flexShrink: 0, height: '100vh', borderRight: `1px solid ${currentTheme.border}` }}>
          <Sidebar 
            currentScreen={currentScreen} 
            onNavigate={setCurrentScreen} 
            onLogout={handleLogout} 
            user={user}
            theme={theme}
            setTheme={setTheme}
          />
        </div>
      )}

      {/* ÁREA DE CONTENIDO PRINCIPAL CON SCROLL INDEPENDIENTE */}
      <main className="main-content-scroll" style={{ 
        flex: 1, 
        height: '100vh', 
        overflowY: 'auto', 
        backgroundColor: currentTheme.bgMain, 
        color: currentTheme.textMain,
        paddingBottom: isMobile ? '80px' : '0', // Espacio reservado para que la barra inferior no tape contenido en móvil
        boxSizing: 'border-box'
      }}>
        {currentScreen === 'dashboard' && <Dashboard userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'betform' && <BetForm userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'settlement' && <Settlement userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'bankroll' && <Bankroll userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'calculators' && <Calculators userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'reports' && <Reports userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'admin' && <Admin userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={theme} setTheme={setTheme} />}
      </main>

      {/* NUEVO: BARRA INFERIOR MÓVIL (Solo se muestra en pantallas pequeñas / celulares) */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '65px',
          backgroundColor: currentTheme.bgContainer,
          borderTop: `1px solid ${currentTheme.border}`,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 999,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
        }}>
          <button onClick={() => setCurrentScreen('dashboard')} style={navBtnStyle(currentScreen === 'dashboard', currentTheme)}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <span style={{ fontSize: '10px' }}>Dashboard</span>
          </button>
          
          <button onClick={() => setCurrentScreen('betform')} style={navBtnStyle(currentScreen === 'betform', currentTheme)}>
            <span style={{ fontSize: '18px' }}>➕</span>
            <span style={{ fontSize: '10px' }}>Nueva</span>
          </button>
          
          <button onClick={() => setCurrentScreen('settlement')} style={navBtnStyle(currentScreen === 'settlement', currentTheme)}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span style={{ fontSize: '10px' }}>Liquidar</span>
          </button>
          
          <button onClick={() => setMobileMenuOpen(true)} style={navBtnStyle(false, currentTheme)}>
            <span style={{ fontSize: '18px' }}>☰</span>
            <span style={{ fontSize: '10px' }}>Más</span>
          </button>
        </nav>
      )}

      {/* NUEVO: MENÚ DESPLEGABLE LATERAL "MÁS" (Drawer móvil) */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '280px',
            height: '100%',
            backgroundColor: currentTheme.bgContainer,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderLeft: `1px solid ${currentTheme.border}`,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '16px', color: currentTheme.textMain }}>Menú de Opciones</span>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                style={{ background: 'none', border: 'none', color: currentTheme.textMain, fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <hr style={{ borderColor: currentTheme.border, margin: 0 }} />

            {/* Opciones restantes para el celular */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { setCurrentScreen('bankroll'); setMobileMenuOpen(false); }} style={drawerItemStyle(currentTheme)}>💳 Depósitos y Retiros</button>
              <button onClick={() => { setCurrentScreen('calculators'); setMobileMenuOpen(false); }} style={drawerItemStyle(currentTheme)}>🧮 Calculadoras</button>
              <button onClick={() => { setCurrentScreen('reports'); setMobileMenuOpen(false); }} style={drawerItemStyle(currentTheme)}>📈 Reportes y P&L</button>
              <button onClick={() => { setCurrentScreen('admin'); setMobileMenuOpen(false); }} style={drawerItemStyle(currentTheme)}>⚙️ Administración</button>
            </div>

            {/* Controles de Tema y Sesión dentro del menú móvil */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: `1px solid ${currentTheme.border}` }}>
              
              {/* Botón rápido para cambiar tema desde el celular */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                style={{
                  width: '100%', padding: '10px', backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                  border: `1px solid ${currentTheme.border}`, borderRadius: '10px',
                  color: currentTheme.textMain, fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
              </button>

              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                style={{
                  width: '100%', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px',
                  color: '#f87171', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                🚪 Cerrar Sesión
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// Estilos de apoyo para la barra de navegación inferior móvil
const navBtnStyle = (isActive, currentTheme) => ({
  background: 'none',
  border: 'none',
  color: isActive ? '#38bdf8' : currentTheme.textMuted,
  fontSize: '11px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  cursor: 'pointer',
  fontWeight: isActive ? '700' : '500',
  outline: 'none',
  flex: 1
})

const drawerItemStyle = (currentTheme) => ({
  background: 'transparent',
  border: 'none',
  color: currentTheme.textMain,
  textAlign: 'left',
  fontSize: '14px',
  padding: '12px',
  cursor: 'pointer',
  borderRadius: '8px',
  fontWeight: '500'
})