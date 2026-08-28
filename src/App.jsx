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
      
      {/* ESTILOS DE SCROLLBAR GLOBAL PARA EL CONTENEDOR DE CONTENIDO */}
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

      {/* CONTENEDOR LATERAL DEL SIDEBAR */}
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

      {/* ÁREA DE CONTENIDO PRINCIPAL CON SCROLL INDEPENDIENTE */}
      <main className="main-content-scroll" style={{ 
        flex: 1, 
        height: '100vh', 
        overflowY: 'auto', 
        backgroundColor: currentTheme.bgMain, 
        color: currentTheme.textMain 
      }}>
        {currentScreen === 'dashboard' && <Dashboard userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'betform' && <BetForm userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'settlement' && <Settlement userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'bankroll' && <Bankroll userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'calculators' && <Calculators userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'reports' && <Reports userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={currentTheme} />}
        {currentScreen === 'admin' && <Admin userId={user?.id} user={user} onNavigate={setCurrentScreen} theme={theme} setTheme={setTheme} />}
      </main>
      
    </div>
  )
}