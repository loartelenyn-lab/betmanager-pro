import React from 'react'

export default function Sidebar({ currentScreen, onNavigate, onLogout, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'betform', label: 'Nueva Apuesta', icon: '➕' },
    { id: 'settlement', label: 'Liquidar Historial', icon: '✅' },
    { id: 'bankroll', label: 'Depósitos y Retiros', icon: '💳' },
    { id: 'calculators', label: 'Calculadoras', icon: '🧮' },
    { id: 'reports', label: 'Reportes y P&L', icon: '📈' },
    { id: 'admin', label: 'Administración', icon: '⚙️' }
  ]

  const sidebarBg = '#07090e'
  const textColor = '#f8fafc'
  const borderColor = '#1e293b'
  const hoverBg = 'rgba(30, 41, 59, 0.6)'
  const activeBg = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'

  const userName = user?.name || user?.user_metadata?.full_name || 'Lenyn'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <aside style={{
      width: '100%',
      minHeight: '100%',
      maxHeight: '100dvh', // Soporte para navegadores móviles
      backgroundColor: sidebarBg,
      color: textColor,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px 32px 14px', // Extra padding inferior para evitar choque con gestos del móvil
      borderRight: `1px solid ${borderColor}`,
      boxSizing: 'border-box',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      userSelect: 'none',
      overflowY: 'auto', // Permite scroll general en caso de pantallas pequeñas
      WebkitOverflowScrolling: 'touch' // Scroll fluido en iOS
    }}>
      
      {/* ESTILOS CSS SCROLLBAR */}
      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .menu-btn {
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .menu-btn:hover {
          transform: translateX(4px);
        }
        .logout-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .logout-card:hover {
          border-color: rgba(239, 68, 68, 0.6) !important;
          background-color: rgba(239, 68, 68, 0.16) !important;
        }
      `}</style>

      {/* CONTENEDOR FLEX PRINCIPAL */}
      <div className="sidebar-scroll" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '100%',
        flex: 1
      }}>
        
        {/* PARTE SUPERIOR: LOGO Y NAVEGACIÓN */}
        <div>
          {/* LOGO DE LA PLATAFORMA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingLeft: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
              flexShrink: 0
            }}>
              🎯
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: textColor, lineHeight: 1.2 }}>
                BetManager Pro
              </h2>
              <span style={{ fontSize: '10px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '700' }}>
                Plataforma Pro
              </span>
            </div>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {menuItems.map((item) => {
              const isActive = currentScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="menu-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                    padding: '12px 14px',
                    background: isActive ? activeBg : 'transparent',
                    color: isActive ? '#ffffff' : textColor,
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? '700' : '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: isActive ? '0 8px 25px rgba(37, 99, 235, 0.4)' : 'none',
                    outline: 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '17px', 
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' : 'none',
                    lineHeight: 1
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* PARTE INFERIOR: TARJETA DE USUARIO Y CERRAR SESIÓN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `1px solid ${borderColor}`, paddingTop: '16px', marginTop: '16px' }}>
          
          {/* INFORMACIÓN DEL USUARIO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: hoverBg, borderRadius: '12px', border: `1px solid ${borderColor}` }}>
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '800', 
              color: '#fff', 
              fontSize: '14px',
              boxShadow: '0 0 12px rgba(37,99,235,0.5)',
              flexShrink: 0
            }}>
              {userInitial}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
                {userName}
              </p>
              <p style={{ fontSize: '11px', color: '#4ade80', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '8px' }}>●</span> Sesión Activa
              </p>
            </div>
          </div>

          {/* BOTÓN CERRAR SESIÓN */}
          <button
            type="button"
            onClick={onLogout}
            className="logout-card"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>🚪</span>
            <span>Cerrar Sesión</span>
          </button>

        </div>

      </div>

    </aside>
  )
}