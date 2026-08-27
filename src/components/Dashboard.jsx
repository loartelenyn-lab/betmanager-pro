import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

// Función para obtener el timestamp actual ajustado a Perú (UTC-5)
const getPeruTimestamp = () => {
  const now = new Date();
  const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return peruTime.toISOString(); // Formato ISO compatible con TIMESTAMPTZ de Supabase
};

export default function Dashboard({ user, onLogout }) {
  // Estado para el control de la caja (Juego Responsable)
  const [isCajaClosed, setIsCajaClosed] = useState(false)
  const [isHoveredEmergency, setIsHoveredEmergency] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState(null)

  // Estados reales conectados a Supabase
  const [loading, setLoading] = useState(true)
  const [bookmakers, setBookmakers] = useState([])
  const [pendingBets, setPendingBets] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [kpis, setKpis] = useState({
    bankroll: '0.00',
    netProfit: '0.00',
    roi: '0.0%',
    yield: '0.0%',
    winRate: '0.0%',
    avgStake: '0.00'
  })

  // Sincronización robusta con Supabase al montar o cambiar el usuario
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Obtener y asegurar el ID del usuario actual de manera segura
      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id;
      }

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // 2. Obtener Casas de Apuestas (Bookmakers) del usuario autenticado
      const { data: bookmakerData, error: bookError } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('is_active', true);

      if (bookError) {
        console.error("Error al cargar bookmakers:", bookError.message);
      }
      setBookmakers(bookmakerData || []);

      // Calcular Bankroll total sumando el saldo real de todas las casas del usuario
      const totalBankroll = (bookmakerData || []).reduce((acc, b) => acc + Number(b.current_balance || 0), 0);

      // 3. Obtener Apuestas (Bets) para calcular KPIs, pendientes y P&L diario
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', currentUserId);

      if (betsError) {
        console.error("Error al cargar apuestas:", betsError.message);
      }

      const allBets = betsData || [];
      const settledBets = allBets.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'CASHOUT');
      const pending = allBets.filter(b => b.status === 'PENDING');
      setPendingBets(pending);

      // Cálculos Financieros Reales
      const totalProfit = settledBets.reduce((acc, b) => acc + Number(b.profit_loss || 0), 0);
      const totalStaked = settledBets.reduce((acc, b) => acc + Number(b.stake || 0), 0);
      const wonCount = settledBets.filter(b => b.status === 'WON').length;
      
      const calculatedRoi = totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(1) : '0.0';
      const winRateVal = settledBets.length > 0 ? ((wonCount / settledBets.length) * 100).toFixed(1) : '0.0';
      const avgStakeVal = allBets.length > 0 ? (allBets.reduce((acc, b) => acc + Number(b.stake || 0), 0) / allBets.length).toFixed(2) : '0.00';

      setKpis({
        bankroll: totalBankroll.toFixed(2),
        netProfit: (totalProfit >= 0 ? '+' : '') + totalProfit.toFixed(2),
        roi: (calculatedRoi >= 0 ? '+' : '') + calculatedRoi + '%',
        yield: (calculatedRoi >= 0 ? '+' : '') + calculatedRoi + '%',
        winRate: winRateVal + '%',
        avgStake: avgStakeVal
      });

      // 4. Procesar Dinámicamente el P&L Diario ajustando las fechas a la zona horaria de Perú (UTC-5)
      const daysMap = {};
      settledBets.forEach(bet => {
        // Creamos la fecha y aplicamos el desfase de -5 horas para mantener consistencia con getPeruTimestamp
        const rawDate = new Date(bet.created_at);
        const peruDate = new Date(rawDate.getTime() - (5 * 60 * 60 * 1000));
        const dayStr = String(peruDate.getDate()).padStart(2, '0');
        
        if (!daysMap[dayStr]) {
          daysMap[dayStr] = { day: dayStr, profit: 0, volume: 0, bets: 0 };
        }
        daysMap[dayStr].profit += Number(bet.profit_loss || 0);
        daysMap[dayStr].volume += Number(bet.stake || 0);
        daysMap[dayStr].bets += 1;
      });

      const processedDays = Object.keys(daysMap).length > 0 
        ? Object.values(daysMap).sort((a, b) => a.day.localeCompare(b.day))
        : [
            { day: '01', profit: 0, volume: 0, bets: 0 },
            { day: '05', profit: 0, volume: 0, bets: 0 },
            { day: '10', profit: 0, volume: 0, bets: 0 },
            { day: '15', profit: 0, volume: 0, bets: 0 },
            { day: '20', profit: 0, volume: 0, bets: 0 },
            { day: '26', profit: 0, volume: 0, bets: 0 },
          ];

      setDailyData(processedDays);

    } catch (error) {
      console.error('Error general al cargar datos del Dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dinámica de fecha en tiempo real para el gráfico
  const currentMonthName = new Date().toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const currentMonthYearBadge = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // Saludo según hora del día
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Buenos días' : currentHour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const userName = user?.user_metadata?.full_name || user?.name || 'Lenyn';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#07090e',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); }
          50% { box-shadow: 0 0 25px rgba(56, 189, 248, 0.6); }
          100% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.3); }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .greeting-badge {
          animation: fadeInSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 4s infinite ease-in-out;
        }
      `}</style>

      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN / HEADER CON SALUDO ANIMADO */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px 40px',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="greeting-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '8px 16px',
          borderRadius: '14px',
          backdropFilter: 'blur(10px)'
        }}>
          <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))' }}>👋</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {timeGreeting}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '800', background: 'linear-gradient(135deg, #f8fafc 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {userName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '15px',
              boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{userName}</span>
              <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '600' }}>● En línea</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid #1e293b',
              color: '#94a3b8',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ef4444'
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1e293b'
              e.currentTarget.style.color = '#94a3b8'
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL DEL DASHBOARD */}
      <main style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* 2. CABECERA DE ESTADO Y ALERTA DE DISCIPLINA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '18px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isCajaClosed ? '#ef4444' : '#22c55e',
              boxShadow: isCajaClosed ? '0 0 12px rgba(239, 68, 68, 0.6)' : '0 0 12px rgba(34, 197, 94, 0.6)'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Estatus de Sesión Actual</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: isCajaClosed ? '#fca5a5' : '#86efac' }}>
                {isCajaClosed ? 'Caja Cerrada por Disciplina (Bloqueada)' : 'Caja Abierta (Operativa)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCajaClosed(!isCajaClosed)}
            onMouseEnter={() => setIsHoveredEmergency(true)}
            onMouseLeave={() => setIsHoveredEmergency(false)}
            style={{
              backgroundColor: isCajaClosed ? 'rgba(34, 197, 94, 0.15)' : (isHoveredEmergency ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
              border: `1px solid ${isCajaClosed ? '#22c55e' : '#ef4444'}`,
              color: isCajaClosed ? '#4ade80' : '#f87171',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🛡️</span> {isCajaClosed ? 'Reabrir Caja Diaria' : 'Cierre de Caja de Emergencia'}
          </button>
        </div>

        {/* 3. TARJETAS DE KPIS FINANCIEROS GLOBALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>Bankroll Total Actual</span>
            <span style={kpiValueStyle}>S/ {kpis.bankroll}</span>
            <span style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>↑ Sincronizado Supabase</span>
          </div>

          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>Beneficio Neto (P&L)</span>
            <span style={{ ...kpiValueStyle, color: '#22c55e' }}>S/ {kpis.netProfit}</span>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Rendimiento histórico</span>
          </div>

          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>ROI Real</span>
            <span style={{ ...kpiValueStyle, color: '#38bdf8' }}>{kpis.roi}</span>
            <span style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>Alta eficiencia</span>
          </div>

          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>Yield (Por Unidad)</span>
            <span style={{ ...kpiValueStyle, color: '#a855f7' }}>{kpis.yield}</span>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Eficiencia de stake</span>
          </div>

          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>Win Rate (% Acierto)</span>
            <span style={kpiValueStyle}>{kpis.winRate}</span>
            <span style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>Estadísticas reales</span>
          </div>

          <div style={kpiCardStyle} onMouseEnter={handleCardHover} onMouseLeave={handleCardLeave}>
            <span style={kpiLabelStyle}>Stake Promedio</span>
            <span style={kpiValueStyle}>S/ {kpis.avgStake}</span>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Disciplina estricta</span>
          </div>
        </div>

        {/* 4. GRÁFICO INTERACTIVO DE P&L DIARIO Y BLOQUES DE INTELIGENCIA */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '28px',
            paddingTop: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', zIndex: 2 }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px' }}>
                  Evolución de P&L Diario ({capitalizedMonth})
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Rendimiento neto por jornada y comportamiento financiero</p>
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                backgroundColor: 'rgba(37, 99, 235, 0.12)', 
                color: '#60a5fa', 
                padding: '7px 14px', 
                borderRadius: '8px', 
                border: '1px solid rgba(37, 99, 235, 0.3)',
                textTransform: 'capitalize'
              }}>
                {currentMonthYearBadge} 📅
              </div>
            </div>

            <div style={{ 
              height: '220px', 
              display: 'flex', 
              alignItems: 'flex-end', 
              justifyContent: 'space-around', 
              position: 'relative', 
              paddingBottom: '24px', 
              borderBottom: '1px solid #1e293b',
              zIndex: 2 
            }}>
              
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: 0, 
                right: 0, 
                borderTop: '1px dashed rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#0f172a', padding: '0 6px', fontWeight: '600' }}>
                  Break-Even (S/ 0.00)
                </span>
              </div>

              {dailyData.map((item, idx) => {
                const isPositive = item.profit >= 0;
                const barHeight = Math.max(Math.min(Math.abs(item.profit) * 1.3, 90), 8);

                return (
                  <div 
                    key={idx}
                    onMouseEnter={() => setActiveTooltip(item)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      position: 'relative',
                      height: '100%',
                      justifyContent: 'flex-end',
                      flex: 1
                    }}
                  >
                    {activeTooltip === item && (
                      <div style={{
                        position: 'absolute',
                        top: '10%',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: `1px solid ${isPositive ? '#38bdf8' : '#ef4444'}`,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: `0 15px 30px rgba(0,0,0,0.6), 0 0 20px ${isPositive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                          Jornada - Día {item.day}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '2px' }}>
                          <span style={{ color: '#94a3b8' }}>{isPositive ? 'Ganancia:' : 'Pérdida:'}</span>
                          <span style={{ fontWeight: '700', color: isPositive ? '#4ade80' : '#f87171' }}>
                            {isPositive ? `+S/ ${item.profit}` : `-S/ ${Math.abs(item.profit)}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '2px' }}>
                          <span style={{ color: '#94a3b8' }}>Volumen:</span>
                          <span style={{ fontWeight: '600' }}>S/ {item.volume}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                          <span style={{ color: '#94a3b8' }}>Boletos:</span>
                          <span style={{ fontWeight: '600' }}>{item.bets} jugadas</span>
                        </div>
                      </div>
                    )}

                    <div style={{
                      width: '32px',
                      height: `${barHeight}px`,
                      background: isPositive 
                        ? 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)' 
                        : 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)',
                      borderRadius: '8px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isPositive ? '0 0 20px rgba(37, 99, 235, 0.5)' : '0 0 20px rgba(239, 68, 68, 0.5)',
                      transform: activeTooltip === item ? 'scaleY(1.08) scaleX(1.05)' : 'scaleY(1) scaleX(1)'
                    }} />

                    <span style={{ fontSize: '12px', color: activeTooltip === item ? '#ffffff' : '#94a3b8' }}>
                      Día {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13px', zIndex: 2 }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡</span> Pasa el cursor sobre las barras para desplegar la ganancia o pérdida exacta del día.
              </span>
              
              {(() => {
                let streakCount = 0;
                let isPositiveStreak = true;
                
                if (dailyData.length > 0) {
                  const lastDayPositive = dailyData[dailyData.length - 1].profit >= 0;
                  isPositiveStreak = lastDayPositive;
                  
                  for (let i = dailyData.length - 1; i >= 0; i--) {
                    if ((dailyData[i].profit >= 0) === lastDayPositive) {
                      streakCount++;
                    } else {
                      break;
                    }
                  }
                }

                return (
                  <div style={{
                    color: isPositiveStreak ? '#4ade80' : '#f87171',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: isPositiveStreak ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isPositiveStreak ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <span>{isPositiveStreak ? '🔥' : '⚠️'}</span>
                    <span>Racha Actual: {streakCount} Días en {isPositiveStreak ? 'Positivo' : 'Negativo'}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bloque de Liquidez por Casa y Apuestas Pendientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', marginBottom: '14px' }}>Liquidez por Casa de Apuestas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookmakers.length > 0 ? (
                  bookmakers.map((b) => (
                    <div key={b.id} style={bookmakerRowStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🟢 {b.name}</span>
                      <span style={{ fontWeight: '700', color: '#f8fafc' }}>S/ {Number(b.current_balance).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>
                    No hay casas registradas
                  </div>
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              flex: 1
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', marginBottom: '14px' }}>Apuestas Pendientes ({pendingBets.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingBets.length > 0 ? (
                  pendingBets.slice(0, 3).map((bet) => (
                    <div key={bet.id} style={{ backgroundColor: '#07090e', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#38bdf8' }}>Apuesta #{bet.id} ({bet.bet_type})</span>
                        <span style={{ color: '#facc15' }}>Pendiente</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                        <span>Stake: S/ {Number(bet.stake).toFixed(2)}</span>
                        <span>Cuota: {Number(bet.total_odds).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>
                    No hay apuestas pendientes
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  )
}

const kpiCardStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
}

const kpiLabelStyle = {
  fontSize: '12px',
  color: '#94a3b8',
  fontWeight: '600',
  marginBottom: '8px'
}

const kpiValueStyle = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-0.5px'
}

const bookmakerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  backgroundColor: '#07090e',
  borderRadius: '8px',
  border: '1px solid #1e293b',
  fontSize: '13px'
}

function handleCardHover(e) {
  e.currentTarget.style.transform = 'translateY(-4px)'
  e.currentTarget.style.borderColor = '#2563eb'
  e.currentTarget.style.boxShadow = '0 10px 30px rgba(37, 99, 235, 0.2)'
}

function handleCardLeave(e) {
  e.currentTarget.style.transform = 'translateY(0)'
  e.currentTarget.style.borderColor = '#1e293b'
  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
}