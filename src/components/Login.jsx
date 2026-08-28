import { useState } from 'react'
import { supabase } from '../supabase/client'

export default function Login({ onLoginSuccess, onGoToLanding }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHoveredBtn, setIsHoveredBtn] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      // Autenticación estricta: validación real con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        throw new Error('Correo electrónico o contraseña incorrectos.')
      }

      if (data?.user) {
        const userData = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || name.trim() || email.split('@')[0] || 'Inversor',
          email: data.user.email || email
        }
        onLoginSuccess(userData)
      } else {
        // CORRECCIÓN CLAVE: Asegurar que el estado de carga se libere si no hay sesión ni error explícito
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error de autenticación:', error.message)
      setErrorMessage(error.message || 'Credenciales inválidas.')
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#07090e',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* ESTILOS DE ANIMACIÓN CSS */}
      <style>{`
        @keyframes floatOrb1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes floatOrb2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes slideUpEntrance {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 25px rgba(37, 99, 235, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
          50% { box-shadow: 0 0 45px rgba(56, 189, 248, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
          100% { box-shadow: 0 0 25px rgba(37, 99, 235, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
        }
        .input-animated:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.35) !important;
          background-color: rgba(15, 23, 42, 0.9) !important;
        }
      `}</style>

      {/* Orbes de luz ambiental animados en el fondo */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderRadius: '50%',
        filter: 'blur(140px)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none',
        animation: 'floatOrb1 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        borderRadius: '50%',
        filter: 'blur(150px)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none',
        animation: 'floatOrb2 10s ease-in-out infinite'
      }} />

      {/* Botón flotante para regresar */}
      <button
        onClick={onGoToLanding}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#94a3b8',
          padding: '11px 20px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#38bdf8'
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.9)'
          e.currentTarget.style.transform = 'translateX(-4px)'
          e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.color = '#94a3b8'
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.75)'
          e.currentTarget.style.transform = 'translateX(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <span style={{ transition: 'transform 0.3s' }}>←</span> Volver al Inicio
      </button>

      {/* TARJETA DE LOGIN CON EFECTO VIDRIO AVANZADO */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '44px',
        boxSizing: 'border-box',
        zIndex: 2,
        animation: 'slideUpEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1), pulseGlow 6s ease-in-out infinite'
      }}>
        
        {/* Cabecera del Formulario */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            fontSize: '44px', 
            marginBottom: '14px',
            filter: 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.5))',
            animation: 'floatOrb1 4s ease-in-out infinite'
          }}>🎯</div>
          <h2 style={{
            fontSize: '26px',
            fontWeight: '800',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
            color: '#ffffff'
          }}>
            Acceso a <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BetManager</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
            Autenticación segura para gestión de bankroll
          </p>
        </div>

        {/* Mensaje de Error animado */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
            animation: 'slideUpEntrance 0.3s ease-out'
          }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Input Nombre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nombre de Inversor
            </label>
            <input
              type="text"
              placeholder="Ej: Inversor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-animated"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: 'rgba(7, 9, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Input Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="correo@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-animated"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: 'rgba(7, 9, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Input Contraseña */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-animated"
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: 'rgba(7, 9, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botón de Ingreso Dinámico con Efectos */}
          <button
            type="submit"
            disabled={isSubmitting}
            onMouseEnter={() => setIsHoveredBtn(true)}
            onMouseLeave={() => setIsHoveredBtn(false)}
            style={{
              marginTop: '10px',
              backgroundColor: isSubmitting ? '#1e40af' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHoveredBtn && !isSubmitting ? 'translateY(-3px)' : 'translateY(0)',
              boxShadow: isHoveredBtn && !isSubmitting 
                ? '0 12px 30px rgba(37, 99, 235, 0.6), 0 0 20px rgba(56, 189, 248, 0.4)' 
                : '0 6px 20px rgba(37, 99, 235, 0.35)',
              opacity: isSubmitting ? 0.75 : 1,
              letterSpacing: '0.5px'
            }}
          >
            {isSubmitting ? 'Validando con Base de Datos...' : 'Iniciar Sesión 🚀'}
          </button>

        </form>

      </div>

      {/* Pie de página sutil */}
      <div style={{ marginTop: '24px', fontSize: '12px', color: '#64748b', zIndex: 2, fontWeight: '500', letterSpacing: '0.3px' }}>
        Plataforma cifrada de alto rendimiento.
      </div>

    </div>
  )
}