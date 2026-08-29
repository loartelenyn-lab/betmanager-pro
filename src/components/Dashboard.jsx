import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

// Función para obtener la fecha actual ajustada a Perú (UTC-5)
const getPeruDateString = () => {
  const now = new Date();
  const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return peruTime.toISOString().split('T')[0];
};

export default function Dashboard({ user, onLogout }) {
  // Estado para el control de la caja sincronizado con Supabase
  const [isCajaClosed, setIsCajaClosed] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [activeTooltipChart2, setActiveTooltipChart2] = useState(null)

  // Estados reales conectados a Supabase
  const [loading, setLoading] = useState(true)
  const [bookmakers, setBookmakers] = useState([])
  const [pendingBets, setPendingBets] = useState([])
  const [recentBets, setRecentBets] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [cumulativeBankrollData, setCumulativeBankrollData] = useState([])
  const [betTypeStats, setBetTypeStats] = useState([])
  
  const [kpis, setKpis] = useState({
    bankroll: '0.00',
    netProfit: '0.00',
    roi: '0.0%',
    yield: '0.0%',
    winRate: '0.0%',
    avgStake: '0.00'
  })

  // Sincronización con Supabase y Tiempo Real
  useEffect(() => {
    fetchDashboardData();

    // Suscripción en tiempo real para actualizar Bankroll y estadísticas (ej. al usar reopen_bet)
    const realtimeSubscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmakers' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeSubscription);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id;
      }

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // 1. Sincronización del estatus de la caja
      const todayStr = getPeruDateString();
      const { data: closureData, error: closureError } = await supabase
        .from('daily_closures')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('closure_date', todayStr);

      if (closureError) console.error("Error al verificar cierre de caja:", closureError.message);
      setIsCajaClosed(closureData && closureData.length > 0);

      // 2. Obtener Bookmakers
      const { data: bookmakerData, error: bookError } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('user_id', currentUserId);

      if (bookError) console.error("Error al cargar bookmakers:", bookError.message);
      setBookmakers(bookmakerData || []);

      const totalBankroll = (bookmakerData || []).reduce((acc, b) => acc + Number(b.current_balance || 0), 0);

      // 3. Obtener Apuestas
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (betsError) console.error("Error al cargar apuestas:", betsError.message);

      const allBets = betsData || [];
      const settledBets = allBets.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'CASHOUT');
      const pending = allBets.filter(b => b.status === 'PENDING');
      
      setPendingBets(pending);
      setRecentBets(settledBets.slice(0, 5));

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

      // 4. Procesar P&L Diario
      const daysMap = {};
      settledBets.forEach(bet => {
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
            { day: '28', profit: 0.5, volume: 0.3, bets: 1 },
          ];

      setDailyData(processedDays);

      // 5. Crecimiento Acumulado del Bankroll
      let runningBankroll = totalBankroll - totalProfit;
      const bankrollTrend = processedDays.map(item => {
        runningBankroll += item.profit;
        return {
          day: item.day,
          bankroll: Number(runningBankroll.toFixed(2)),
          profit: item.profit
        };
      });
      setCumulativeBankrollData(bankrollTrend);

      // 6. Distribución por Tipo de Apuesta
      const typeMap = { SIMPLE: { total: 0, won: 0 }, PARLAY: { total: 0, won: 0 }, BETBUILDER: { total: 0, won: 0 } };
      settledBets.forEach(bet => {
        const type = bet.bet_type || 'SIMPLE';
        if (typeMap[type]) {
          typeMap[type].total += 1;
          if (bet.status === 'WON') typeMap[type].won += 1;
        }
      });

      const totalSettledCount = settledBets.length || 1;
      const typeStatsArray = Object.keys(typeMap).map(type => {
        const count = typeMap[type].total;
        const percentage = Math.round((count / totalSettledCount) * 100);
        const winRate = count > 0 ? Math.round((typeMap[type].won / count) * 100) : 0;
        return { type, count, percentage, winRate };
      });
      setBetTypeStats(typeStatsArray);

    } catch (error) {
      console.error('Error general al cargar datos del Dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función de Logout segura
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const currentMonthName = new Date().toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const currentMonthYearBadge = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Buenos días' : currentHour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const userName = user?.user_metadata?.full_name || user?.name || 'Lenyn';

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#07090e',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      overflowX: 'hidden', // PREVIENE CUALQUIER SCROLL HORIZONTAL
      overflowY: 'auto'    // ASEGURA SCROLL VERTICAL FLUIDO
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
        @keyframes livePulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        @keyframes glowBorder {
          0% { border-color: rgba(56, 189, 248, 0.2); }
          50% { border-color: rgba(168, 85, 247, 0.5); }
          100% { border-color: rgba(56, 189, 248, 0.2); }
        }
        .greeting-badge {
          animation: fadeInSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 4s infinite ease-in-out;
        }
        .animated-panel {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animated-panel:hover {
          transform: translateY(-4px);
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(37, 99, 235, 0.15);
        }
        .bookmaker-row, .pending-card-item, .recent-card-item {
          transition: all 0.25s ease;
        }
        .bookmaker-row:hover, .recent-card-item:hover {
          background: rgba(30, 41, 59, 0.7);
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateX(4px);
        }
        .pending-card-item:hover {
          background: rgba(30, 41, 59, 0.7);
          border-color: rgba(56, 189, 248, 0.3);
        }
        .live-dot {
          animation: livePulse 2s infinite;
        }
        .chart-card-animated {
          animation: glowBorder 6s infinite ease-in-out;
        }
        .progress-bar-fill {
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN */}
      <header style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexWrap: 'wrap', // Permite que los elementos bajen si no hay espacio
        gap: '15px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
            onClick={handleLogout}
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

      {/* CONTENEDOR PRINCIPAL */}
      <main style={{ 
        padding: '32px 40px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '28px', 
        maxWidth: '1400px', 
        margin: '0 auto', 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>
        
        {/* 2. CABECERA DE ESTADO */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '18px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          boxSizing: 'border-box'
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

          <div style={{
            backgroundColor: isCajaClosed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${isCajaClosed ? '#ef4444' : '#22c55e'}`,
            color: isCajaClosed ? '#f87171' : '#4ade80',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🛡️</span> {isCajaClosed ? 'Caja Protegida (Cerrada)' : 'Operaciones Habilitadas'}
          </div>
        </div>

        {/* 3. KPIS FINANCIEROS */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          boxSizing: 'border-box' 
        }}>
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

        {/* 4. DISPOSICIÓN FLEXIBLE: COLUMNA IZQUIERDA (GRÁFICOS) | COLUMNA DERECHA (TARJETAS) */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '20px', 
          width: '100%',
          boxSizing: 'border-box' 
        }}>
          
          {/* COLUMNA IZQUIERDA DE GRÁFICOS */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            flex: '2 1 600px', // Ocupa 2/3 pero es adaptable
            minWidth: 0,       // Previene desborde de contenido interno
            boxSizing: 'border-box'
          }}>

            {/* GRÁFICO 1: EVOLUCIÓN DE P&L DIARIO */}
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
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', zIndex: 2 }}>
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

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13px', zIndex: 2 }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span> Pasa el cursor sobre las barras para desplegar los detalles.
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

            {/* GRÁFICO 2: CRECIMIENTO Y CURVA DE BANKROLL ACUMULADO */}
            <div className="animated-panel chart-card-animated" style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38bdf8' }}>📈</span> Crecimiento Acumulado del Bankroll
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8' }}>Evolución progresiva del capital global disponible</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  Tendencia Positiva ⚡
                </span>
              </div>

              <div style={{
                height: '180px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '0 20px 20px 20px',
                backgroundColor: 'rgba(7, 9, 14, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative'
              }}>
                {cumulativeBankrollData.map((item, idx) => {
                  const maxVal = Math.max(...cumulativeBankrollData.map(d => d.bankroll), 15);
                  const minVal = Math.min(...cumulativeBankrollData.map(d => d.bankroll), 0);
                  const range = (maxVal - minVal) || 1;
                  const heightPercent = Math.max(((item.bankroll - minVal) / range) * 75 + 15, 12);

                  return (
                    <div key={idx}
                      onMouseEnter={() => setActiveTooltipChart2(item)}
                      onMouseLeave={() => setActiveTooltipChart2(null)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        flex: 1,
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      {activeTooltipChart2 === item && (
                        <div style={{
                          position: 'absolute',
                          top: '-45px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #38bdf8',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 10px 25px rgba(56, 189, 248, 0.4)',
                          zIndex: 10
                        }}>
                          <strong>Día {item.day}:</strong> S/ {item.bankroll.toFixed(2)}
                        </div>
                      )}

                      <div style={{
                        width: '12px',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(180deg, #a855f7 0%, #2563eb 100%)',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
                        transition: 'all 0.3s ease',
                        transform: activeTooltipChart2 === item ? 'scaleX(1.3)' : 'scaleX(1)'
                      }} />
                      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Día {item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICO 3: DISTRIBUCIÓN Y RENDIMIENTO POR TIPO DE APUESTA */}
            <div className="animated-panel chart-card-animated" style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#a855f7' }}>🎯</span> Distribución por Tipo de Apuesta
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8' }}>Proporción de volumen y tasa de acierto por categoría</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  Análisis Táctico 📊
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {betTypeStats.map((item, idx) => {
                  const colors = {
                    SIMPLE: { gradient: 'linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)', shadow: 'rgba(56, 189, 248, 0.4)' },
                    PARLAY: { gradient: 'linear-gradient(90deg, #a855f7 0%, #7c3aed 100%)', shadow: 'rgba(168, 85, 247, 0.4)' },
                    BETBUILDER: { gradient: 'linear-gradient(90deg, #4ade80 0%, #059669 100%)', shadow: 'rgba(74, 222, 128, 0.4)' }
                  };
                  const styleColor = colors[item.type] || colors.SIMPLE;

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: '700' }}>
                        <span style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: styleColor.gradient }}></span>
                          {item.type} ({item.count} jugadas)
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                          Volumen: <strong style={{ color: '#ffffff' }}>{item.percentage}%</strong> | WinRate: <strong style={{ color: '#4ade80' }}>{item.winRate}%</strong>
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '10px',
                        backgroundColor: '#07090e',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div className="progress-bar-fill" style={{
                          width: `${Math.max(item.percentage, 5)}%`,
                          height: '100%',
                          background: styleColor.gradient,
                          borderRadius: '20px',
                          boxShadow: `0 0 12px ${styleColor.shadow}`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            flex: '1 1 300px', // Ocupa 1/3 pero se adapta al 100% si falta espacio
            minWidth: 0, 
            boxSizing: 'border-box'
          }}>
            
            {/* 1. Liquidez por Casa de Apuestas */}
            <div className="animated-panel" style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.3px' }}>Liquidez por Casa</h4>
                <span style={{ fontSize: '11px', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  {bookmakers.length} Activas
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookmakers.length > 0 ? (
                  bookmakers.map((b) => (
                    <div key={b.id} className="bookmaker-row" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      backgroundColor: '#07090e',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '13px'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', color: '#e2e8f0' }}>
                        <span className="live-dot" style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span> 
                        {b.name}
                      </span>
                      <span style={{ fontWeight: '800', color: '#38bdf8', fontSize: '14px', letterSpacing: '-0.3px' }}>
                        S/ {Number(b.current_balance).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px', background: '#07090e', borderRadius: '10px', border: '1px dashed #1e293b' }}>
                    No hay casas registradas
                  </div>
                )}
              </div>
            </div>

            {/* 2. Apuestas Pendientes */}
            <div className="animated-panel" style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.3px' }}>
                  Apuestas Pendientes
                </h4>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  backgroundColor: pendingBets.length > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.15)', 
                  color: pendingBets.length > 0 ? '#facc15' : '#94a3b8', 
                  padding: '3px 9px', 
                  borderRadius: '6px',
                  border: `1px solid ${pendingBets.length > 0 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
                }}>
                  {pendingBets.length} en curso
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingBets.length > 0 ? (
                  pendingBets.slice(0, 3).map((bet) => (
                    <div key={bet.id} className="pending-card-item" style={{ 
                      backgroundColor: '#07090e', 
                      padding: '12px 14px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255, 255, 255, 0.05)', 
                      fontSize: '12px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ minWidth: '6px', height: '6px', backgroundColor: '#38bdf8', borderRadius: '50%' }}></span>
                          Apuesta #{bet.id} {bet.bet_type ? `(${bet.bet_type})` : ''}
                        </span>
                        <span style={{ color: '#facc15', fontWeight: '700', fontSize: '11px', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          Pendiente ⏳
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11.5px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                        <span>Stake: <strong style={{ color: '#f8fafc' }}>S/ {Number(bet.stake).toFixed(2)}</strong></span>
                        <span>Cuota: <strong style={{ color: '#4ade80' }}>{Number(bet.total_odds).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b', 
                    textAlign: 'center', 
                    padding: '20px 12px', 
                    background: '#07090e', 
                    borderRadius: '10px', 
                    border: '1px dashed #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '18px' }}>🎯</span>
                    <span>No hay apuestas pendientes</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ÚLTIMAS APUESTAS (DEBAJO DE PENDIENTES) */}
            <div className="animated-panel" style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> Últimas Apuestas
                </h4>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  backgroundColor: 'rgba(56, 189, 248, 0.12)', 
                  color: '#38bdf8', 
                  padding: '3px 9px', 
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}>
                  Histórico Reciente
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentBets.length > 0 ? (
                  recentBets.map((bet) => {
                    const isWon = bet.status === 'WON';
                    const isLost = bet.status === 'LOST';

                    const badgeBg = isWon ? 'rgba(34, 197, 94, 0.15)' : isLost ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)';
                    const badgeBorder = isWon ? 'rgba(34, 197, 94, 0.3)' : isLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(168, 85, 247, 0.3)';
                    const badgeColor = isWon ? '#4ade80' : isLost ? '#f87171' : '#a855f7';
                    const statusText = isWon ? 'Ganada ✓' : isLost ? 'Perdida ✗' : 'Cashout ⚡';

                    return (
                      <div key={bet.id} className="recent-card-item" style={{ 
                        backgroundColor: '#07090e', 
                        padding: '12px 14px', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        fontSize: '12px' 
                      }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: '#e2e8f0' }}>
                            Apuesta #{bet.id} <span style={{ color: '#64748b', fontWeight: '500' }}>({bet.bet_type || 'SIMPLE'})</span>
                          </span>
                          <span style={{ 
                            color: badgeColor, 
                            fontWeight: '700', 
                            fontSize: '10.5px', 
                            backgroundColor: badgeBg, 
                            border: `1px solid ${badgeBorder}`,
                            padding: '2px 7px', 
                            borderRadius: '5px' 
                          }}>
                            {statusText}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11.5px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                          <span>Stake: <strong style={{ color: '#f8fafc' }}>S/ {Number(bet.stake).toFixed(2)}</strong></span>
                          <span>P&L: <strong style={{ color: Number(bet.profit_loss) >= 0 ? '#4ade80' : '#f87171' }}>
                            {Number(bet.profit_loss) >= 0 ? `+S/ ${Number(bet.profit_loss).toFixed(2)}` : `-S/ ${Math.abs(Number(bet.profit_loss)).toFixed(2)}`}
                          </strong></span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b', 
                    textAlign: 'center', 
                    padding: '20px 12px', 
                    background: '#07090e', 
                    borderRadius: '10px', 
                    border: '1px dashed #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '18px' }}>📂</span>
                    <span>No hay historial registrado</span>
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
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  boxSizing: 'border-box'
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