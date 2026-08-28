import { useState } from 'react'

export default function LandingPage({ onGoToLogin }) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#07090e',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflowY: 'auto',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* ANIMACIONES Y EFECTOS VISUALES AVANZADOS */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: translate(-50%, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(-50%, -20px) scale(1.15); opacity: 0.45; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 0.25; }
        }
        @keyframes floatOrb {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmerBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glowPulseText {
          0% { text-shadow: 0 0 15px rgba(56, 189, 248, 0.4), 0 0 30px rgba(37, 99, 235, 0.2); }
          50% { text-shadow: 0 0 25px rgba(56, 189, 248, 0.8), 0 0 50px rgba(37, 99, 235, 0.5); }
          100% { text-shadow: 0 0 15px rgba(56, 189, 248, 0.4), 0 0 30px rgba(37, 99, 235, 0.2); }
        }
        .animate-fade-in {
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glow-title-accent {
          background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glowPulseText 4s infinite ease-in-out;
        }
        .badge-pill-glow {
          background: linear-gradient(90deg, rgba(37, 99, 235, 0.15), rgba(56, 189, 248, 0.25), rgba(37, 99, 235, 0.15));
          background-size: 200% 200%;
          animation: shimmerBorder 4s infinite linear;
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.25), inset 0 0 12px rgba(56, 189, 248, 0.15);
        }
      `}</style>

      {/* Luces de Fondo Ambientales Futuristas */}
      <div style={{
        position: 'absolute',
        width: '650px',
        height: '650px',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(56, 189, 248, 0.08) 45%, rgba(7, 9, 14, 0) 70%)',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'pulseGlow 7s infinite ease-in-out'
      }} />

      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(7, 9, 14, 0) 70%)',
        top: '20%',
        right: '10%',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'floatOrb 10s infinite ease-in-out'
      }} />

      {/* 1. NAVEGACIÓN SUPERIOR (HEADER) */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 48px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: 'rgba(7, 9, 14, 0.85)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.7))' }}>🎯</span>
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px', background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BetManager Pro
          </span>
        </div>

        <button
          onClick={onGoToLogin}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}
        >
          Acceder al Sistema
        </button>
      </header>

      {/* 2. SECCIÓN HERO CON ANIMACIONES MEJORADAS */}
      <main className="animate-fade-in" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '70px 20px',
        maxWidth: '960px',
        margin: '0 auto',
        zIndex: 10,
        position: 'relative'
      }}>
        
        {/* Badge Flotante con Brillo Estilo Neón */}
        <div className="badge-pill-glow" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 22px',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          borderRadius: '50px',
          fontSize: '13.5px',
          fontWeight: '700',
          color: '#38bdf8',
          marginBottom: '30px',
          backdropFilter: 'blur(12px)',
          letterSpacing: '0.3px'
        }}>
          <span style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }}>⚡</span> 
          <span>Plataforma de Gestión Financiera y Apuestas Profesionales</span>
        </div>

        {/* Título Principal */}
        <h1 style={{
          fontSize: 'clamp(40px, 5.5vw, 68px)',
          fontWeight: '900',
          lineHeight: '1.12',
          marginBottom: '26px',
          letterSpacing: '-1.5px',
          color: '#ffffff',
          filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))'
        }}>
          Controla tu Bankroll como un <br />
          <span className="glow-title-accent">Inversor Profesional</span>
        </h1>

        {/* Subtítulo Descriptivo */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: '#94a3b8',
          lineHeight: '1.65',
          marginBottom: '44px',
          maxWidth: '740px',
          fontWeight: '400'
        }}>
          Deja atrás las apuestas impulsivas. Audita tu rendimiento, calcula probabilidades implícitas en tiempo real, bloquea pérdidas con disciplina y lleva tu rentabilidad al siguiente nivel.
        </p>

        {/* Botón de Acción Principal */}
        <button
          onClick={onGoToLogin}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '18px 40px',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: isHovered 
              ? '0 16px 35px rgba(37, 99, 235, 0.65), 0 0 25px rgba(56, 189, 248, 0.4)' 
              : '0 6px 20px rgba(37, 99, 235, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            letterSpacing: '0.4px'
          }}
        >
          <span>Comenzar Ahora</span>
          <span style={{ transition: 'transform 0.3s', transform: isHovered ? 'translateX(8px)' : 'translateX(0)', fontSize: '20px' }}>→</span>
        </button>

        {/* 3. CARDS FLOTANTES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '22px',
          width: '100%',
          marginTop: '85px',
          textAlign: 'left'
        }}>
          
          {/* Card 1 */}
          <div 
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${hoveredCard === 1 ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
              padding: '30px',
              borderRadius: '18px',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === 1 ? 'translateY(-8px)' : 'translateY(0)',
              boxShadow: hoveredCard === 1 
                ? '0 20px 40px rgba(56, 189, 248, 0.2), 0 0 15px rgba(56, 189, 248, 0.1)' 
                : '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.5))' }}>📊</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' }}>P&L y Reportes Avanzados</h3>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>Filtra por calendarios interactivos, evalúa tu ROI y audita ganancias milimétricamente.</p>
          </div>

          {/* Card 2 */}
          <div 
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${hoveredCard === 2 ? '#22c55e' : 'rgba(255, 255, 255, 0.08)'}`,
              padding: '30px',
              borderRadius: '18px',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === 2 ? 'translateY(-8px)' : 'translateY(0)',
              boxShadow: hoveredCard === 2 
                ? '0 20px 40px rgba(34, 197, 94, 0.2), 0 0 15px rgba(34, 197, 94, 0.1)' 
                : '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.5))' }}>🛡️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' }}>Juego Responsable</h3>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>Sistema de cierre de caja diario para proteger tu capital ante rachas negativas.</p>
          </div>

          {/* Card 3 */}
          <div 
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${hoveredCard === 3 ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}`,
              padding: '30px',
              borderRadius: '18px',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === 3 ? 'translateY(-8px)' : 'translateY(0)',
              boxShadow: hoveredCard === 3 
                ? '0 20px 40px rgba(168, 85, 247, 0.2), 0 0 15px rgba(168, 85, 247, 0.1)' 
                : '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))' }}>🧮</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' }}>Calculadoras de Valor</h3>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>Herramientas de probabilidad implícita y arbitraje para detectar cuotas rentables.</p>
          </div>

        </div>

      </main>

      {/* 4. FOOTER */}
      <footer style={{
        padding: '24px 48px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        fontSize: '13px',
        color: '#64748b',
        backgroundColor: '#07090e',
        zIndex: 10
      }}>
        © 2026 BetManager Pro. Todos los derechos reservados. Diseñado para inversores de alto rendimiento.
      </footer>

    </div>
  )
}