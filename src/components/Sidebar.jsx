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
      height: '100dvh', // Altura exacta del puerto de visión móvil
      maxHeight: '100dvh',
      backgroundColor: sidebarBg,
      color: textColor,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 14px',
      borderRight: `1px solid ${borderColor}`,
      boxSizing: 'border-box',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      userSelect: 'none',
      overflow: 'hidden' // Desactiva el scroll global molesto
    }}>
      
      {/* ESTILOS CSS ANIMADOS Y SCROLLBAR DE LA NAVEGACIÓN */}
      <style>{`
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .menu-btn {
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .menu-btn:hover {
          transform: translateX(4px);
        }
        .menu-btn:active {
          transform: translateX(2px) scale(0.98);
        }
        .logout-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .logout-card:hover {
          border-color: rgba(239, 68, 68, 0.6) !important;
          background-color: rgba(239, 68, 68, 0.16) !important;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25);
        }
      `}</style>

      {/* 1. SECCIÓN SUPERIOR: LOGO (ANCLADO ARRIBA) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingLeft: '6px', flexShrink: 0 }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
          flexShrink: 0
        }}>
          🎯
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: textColor, lineHeight: 1.2 }}>
            BetManager Pro
          </h2>
          <span style={{ fontSize: '10px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '700' }}>
            Plataforma Pro
          </span>
        </div>
      </div>

      {/* 2. SECCIÓN MEDIA: MENÚ DE NAVEGACIÓN (CON SCROLL FLUIDO SI ES NECESARIO) */}
      <nav 
        className="sidebar-nav-scroll"
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px',
          paddingRight: '4px',
          marginBottom: '12px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
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
                gap: '12px',
                width: '100%',
                padding: '10px 12px',
                background: isActive ? activeBg : 'transparent',
                color: isActive ? '#ffffff' : textColor,
                border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isActive ? '0 8px 25px rgba(37, 99, 235, 0.4)' : 'none',
                outline: 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = hoverBg
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ 
                fontSize: '16px', 
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

      {/* 3. SECCIÓN INFERIOR: USUARIO Y CERRAR SESIÓN (ANCLADO ABAJO, NUNCA SE OCULTA) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        borderTop: `1px solid ${borderColor}`, 
        paddingTop: '12px', 
        flexShrink: 0 // Garantiza que no se reduzca de tamaño ni se oculte
      }}>
        
        {/* INFORMACIÓN DEL USUARIO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: hoverBg, borderRadius: '10px', border: `1px solid ${borderColor}` }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: '800', 
            color: '#fff', 
            fontSize: '13px',
            boxShadow: '0 0 12px rgba(37,99,235,0.5)',
            flexShrink: 0
          }}>
            {userInitial}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
              {userName}
            </p>
            <p style={{ fontSize: '10px', color: '#4ade80', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '7px' }}>●</span> Sesión Activa
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
            gap: '8px',
            padding: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            color: '#f87171',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>🚪</span>
          <span>Cerrar Sesión</span>
        </button>

      </div>

    </aside>
  )
}