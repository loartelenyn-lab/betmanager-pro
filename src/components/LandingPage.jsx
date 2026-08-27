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
      
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
          100% { transform: scale(1); opacity: 0.15; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .bg-glow-blob {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(7, 9, 14, 0) 70%);
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 0;
          pointer-events: none;
          animation: pulseGlow 6s infinite ease-in-out;
        }
      `}</style>

      {/* Efecto de luz ambiental en el fondo */}
      <div className="bg-glow-blob" />

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
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))' }}>🎯</span>
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

      {/* 2. SECCIÓN HERO (PRINCIPAL CON EFECTOS Y LLAMADO A LA ACCIÓN) */}
      <main className="animate-fade-in" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 20px',
        maxWidth: '900px',
        margin: '0 auto',
        zIndex: 10,
        position: 'relative'
      }}>
        
        {/* Badge superior llamativo con brillo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: '600',
          color: '#60a5fa',
          marginBottom: '24px',
          boxShadow: '0 0 20px rgba(37, 99, 235, 0.15)'
        }}>
          <span>⚡</span> Plataforma de Gestión Financiera y Apuestas Profesionales
        </div>

        {/* Título Principal Impactante */}
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: '800',
          lineHeight: '1.15',
          marginBottom: '24px',
          letterSpacing: '-1px'
        }}>
          Controla tu Bankroll como un <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inversor Profesional</span>
        </h1>

        {/* Subtítulo descriptivo */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 18px)',
          color: '#94a3b8',
          lineHeight: '1.6',
          marginBottom: '40px',
          maxWidth: '700px'
        }}>
          Deja atrás las apuestas impulsivas. Audita tu rendimiento, calcula probabilidades implícitas en tiempo real, bloquea pérdidas con disciplina y lleva tu rentabilidad al siguiente nivel.
        </p>

        {/* Botón de Acción Gigante con Efecto Hover Avanzado */}
        <button
          onClick={onGoToLogin}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '16px 36px',
            borderRadius: '14px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow: isHovered ? '0 12px 30px rgba(37, 99, 235, 0.6)' : '0 4px 15px rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span>Comenzar Ahora</span>
          <span style={{ transition: 'transform 0.3s', transform: isHovered ? 'translateX(6px)' : 'translateX(0)' }}>→</span>
        </button>

        {/* 3. BLOQUE DE CARACTERÍSTICAS / CARDS FLOTANTES INTERACTIVAS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          width: '100%',
          marginTop: '80px',
          textAlign: 'left'
        }}>
          
          {/* Card 1 */}
          <div 
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#0f172a',
              border: `1px solid ${hoveredCard === 1 ? '#38bdf8' : '#1e293b'}`,
              padding: '28px',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              transform: hoveredCard === 1 ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: hoveredCard === 1 ? '0 15px 30px rgba(56, 189, 248, 0.15)' : '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '14px', filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.3))' }}>📊</div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>P&L y Reportes Avanzados</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>Filtra por calendarios interactivos, evalúa tu ROI y audita ganancias milimétricamente.</p>
          </div>

          {/* Card 2 */}
          <div 
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#0f172a',
              border: `1px solid ${hoveredCard === 2 ? '#22c55e' : '#1e293b'}`,
              padding: '28px',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              transform: hoveredCard === 2 ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: hoveredCard === 2 ? '0 15px 30px rgba(34, 197, 94, 0.15)' : '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '14px', filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))' }}>🛡️</div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Juego Responsable</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>Sistema de cierre de caja diario para proteger tu capital ante rachas negativas.</p>
          </div>

          {/* Card 3 */}
          <div 
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#0f172a',
              border: `1px solid ${hoveredCard === 3 ? '#a855f7' : '#1e293b'}`,
              padding: '28px',
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              transform: hoveredCard === 3 ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: hoveredCard === 3 ? '0 15px 30px rgba(168, 85, 247, 0.15)' : '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '14px', filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))' }}>🧮</div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Calculadoras de Valor</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>Herramientas de probabilidad implícita y arbitraje para detectar cuotas rentables.</p>
          </div>

        </div>

      </main>

      {/* 4. FOOTER INFERIOR */}
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