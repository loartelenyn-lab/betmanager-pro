import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase/client'

export default function Reports() {
  // --- ESTADOS DE FILTRADO Y CALENDARIO ---
  const [activeTab, setActiveTab] = useState('month')
  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-08-31')
  
  // Filtros Cruzados de Segmentación
  const [bookmakerFilter, setBookmakerFilter] = useState('all')
  const [betTypeFilter, setBetTypeFilter] = useState('all')
  const [fundTypeFilter, setFundTypeFilter] = useState('all')

  // --- ESTADOS DE CONEXIÓN CON SUPABASE ---
  const [rawBetsData, setRawBetsData] = useState([])
  const [bookmakersList, setBookmakersList] = useState([])
  const [loading, setLoading] = useState(true)

  // Cargar casas de apuestas y apuestas desde Supabase al montar el componente
  useEffect(() => {
    fetchBookmakers()
    fetchBetsData()
  }, [])

  const fetchBookmakers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('bookmakers')
        .select('id, name')
        .eq('user_id', user.id)

      if (error) throw error
      if (data) setBookmakersList(data)
    } catch (error) {
      console.error('Error al cargar bookmakers:', error.message)
    }
  }

  const fetchBetsData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Consultamos la tabla bets y hacemos un join con bookmakers y bet_legs
      const { data, error } = await supabase
        .from('bets')
        .select(`
          id,
          created_at,
          bookmaker_id,
          bookmakers ( name ),
          bet_type,
          fund_type,
          stake,
          total_odds,
          profit_loss,
          status,
          bet_legs ( match_name, selection )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        // Mapeamos los datos garantizando formato de fecha local YYYY-MM-DD
        const formatted = data.map(bet => {
          let dateStr = '2026-08-26'
          if (bet.created_at) {
            // Extraemos la fecha de forma segura ignorando desfases de UTC
            dateStr = bet.created_at.substring(0, 10)
          }

          const sportInfo = bet.bet_legs && bet.bet_legs.length > 0 
            ? bet.bet_legs.map(l => `${l.match_name} (${l.selection})`).join(' | ') 
            : (bet.notes || 'Apuesta Registrada')

          // Mapeo robusto de estados de Supabase a la vista
          let mappedResult = 'Pending'
          const upperStatus = (bet.status || '').toUpperCase()
          if (upperStatus === 'WON') mappedResult = 'Won'
          else if (upperStatus === 'LOST') mappedResult = 'Lost'
          else if (upperStatus === 'VOID') mappedResult = 'Void'
          else if (upperStatus === 'CASHOUT') mappedResult = 'Cashout'

          let mappedType = 'Simple'
          if (bet.bet_type === 'PARLAY') mappedType = 'Parlay'
          else if (bet.bet_type === 'BETBUILDER') mappedType = 'BetBuilder'

          let mappedFund = 'Cash'
          if (bet.fund_type === 'FREEBET') mappedFund = 'Freebet'
          else if (bet.fund_type === 'BONUS') mappedFund = 'Bono'

          return {
            id: bet.id,
            date: dateStr,
            bookmaker: bet.bookmakers?.name || 'Desconocida',
            bookmaker_id: bet.bookmaker_id,
            type: mappedType,
            fund: mappedFund,
            sport: sportInfo,
            odd: Number(bet.total_odds) || 1.0,
            stake: Number(bet.stake) || 0,
            result: mappedResult,
            net: Number(bet.profit_loss) || 0
          }
        })
        setRawBetsData(formatted)
      }
    } catch (error) {
      console.error('Error al cargar historial de apuestas:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- FILTRADO INTELIGENTE POR FECHAS Y CRITERIOS ---
  const filteredBets = useMemo(() => {
    return rawBetsData.filter(bet => {
      const betDate = bet.date
      // Rango inclusivo flexible
      if (betDate < startDate || betDate > endDate) return false
      
      // Filtrado corregido por ID de casa de apuestas o nombre
      if (bookmakerFilter !== 'all') {
        const matchesId = bet.bookmaker_id === Number(bookmakerFilter)
        const matchesName = bet.bookmaker.toLowerCase() === String(bookmakerFilter).toLowerCase()
        if (!matchesId && !matchesName) return false
      }

      if (betTypeFilter !== 'all' && bet.type !== betTypeFilter) return false
      if (fundTypeFilter !== 'all' && bet.fund !== fundTypeFilter) return false
      
      return true
    })
  }, [rawBetsData, startDate, endDate, bookmakerFilter, betTypeFilter, fundTypeFilter])

  // --- CÁLCULOS DE MÉTRICAS MAESTRAS ---
  const metrics = useMemo(() => {
    let wonCount = 0, wonAmount = 0
    let lostCount = 0, lostAmount = 0
    let voidCount = 0, voidAmount = 0
    let cashoutCount = 0, cashoutAmount = 0
    let totalStaked = 0
    let totalOddsSum = 0

    filteredBets.forEach(bet => {
      totalStaked += bet.stake
      totalOddsSum += bet.odd

      if (bet.result === 'Won') {
        wonCount++
        wonAmount += bet.net
      } else if (bet.result === 'Lost') {
        lostCount++
        lostAmount += Math.abs(bet.net)
      } else if (bet.result === 'Void') {
        voidCount++
        voidAmount += bet.stake
      } else if (bet.result === 'Cashout') {
        cashoutCount++
        cashoutAmount += bet.net
      }
    })

    const netProfit = (wonAmount + cashoutAmount) - lostAmount
    const totalSettled = wonCount + lostCount + cashoutCount
    const winRate = totalSettled > 0 ? ((wonCount / totalSettled) * 100) : 0
    const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0
    const avgStake = filteredBets.length > 0 ? totalStaked / filteredBets.length : 0
    const avgOdd = filteredBets.length > 0 ? totalOddsSum / filteredBets.length : 0

    return {
      wonCount, wonAmount,
      lostCount, lostAmount,
      voidCount, voidAmount,
      cashoutCount, cashoutAmount,
      netProfit,
      winRate,
      roi,
      avgStake,
      avgOdd,
      totalStaked,
      totalCount: filteredBets.length
    }
  }, [filteredBets])

  // Traductor de estados al español para visualización
  const translateResult = (res) => {
    switch (res) {
      case 'Won': return 'GANADA'
      case 'Lost': return 'PERDIDA'
      case 'Void': return 'ANULADA'
      case 'Cashout': return 'CASHOUT'
      default: return res.toUpperCase()
    }
  }

  // Manejador de Tabs Rápidas
  const handleQuickTab = (tabKey) => {
    setActiveTab(tabKey)
    const today = '2026-08-26'
    if (tabKey === 'today') {
      setStartDate(today)
      setEndDate(today)
    } else if (tabKey === 'yesterday') {
      setStartDate('2026-08-25')
      setEndDate('2026-08-25')
    } else if (tabKey === 'week') {
      setStartDate('2026-08-20')
      setEndDate(today)
    } else if (tabKey === 'month') {
      setStartDate('2026-08-01')
      setEndDate('2026-08-31')
    } else if (tabKey === 'year') {
      setStartDate('2026-01-01')
      setEndDate('2026-12-31')
    } else if (tabKey === 'all') {
      setStartDate('2025-01-01')
      setEndDate('2030-12-31')
    }
  }

  // --- FUNCIÓN DE DESCARGA DE CSV PROFESIONAL ---
  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "=== REPORTE FINANCIERO Y P&L - BETMANAGER PRO ===\n"
    csvContent += `Periodo:,${startDate} al ${endDate}\n`
    csvContent += `Balance del Periodo:,${metrics.netProfit >= 0 ? 'GANANCIA EN LA FECHA' : 'PÉRDIDA EN LA FECHA'}\n`
    csvContent += `P&L Neto:,S/ ${metrics.netProfit.toFixed(2)}\n`
    csvContent += `ROI:,${metrics.roi.toFixed(2)}%\n`
    csvContent += `Win Rate:,${metrics.winRate.toFixed(1)}%\n\n`
    csvContent += "ID,Fecha,Casa de Apuestas,Deporte/Evento,Tipo,Fondo,Cuota,Stake,Resultado,P&L Neto (PEN)\n"

    filteredBets.forEach(bet => {
      const row = [bet.id, bet.date, `"${bet.bookmaker}"`, `"${bet.sport}"`, bet.type, bet.fund, bet.odd, bet.stake, translateResult(bet.result), bet.net]
      csvContent += row.join(",") + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Reporte_PyL_${startDate}_al_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- FUNCIÓN DE DESCARGA / VISTA PREVIA DE PDF PROFESIONAL ---
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank')
    const isProfitable = metrics.netProfit >= 0

    const htmlContent = `
      <html>
        <head>
          <title>Reporte Financiero y P&L - BetManager Pro</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 35px; color: #1e293b; background: #ffffff; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; }
            .subtitle { color: #64748b; font-size: 12px; }
            
            .banner-fecha {
              background-color: ${isProfitable ? '#f0fdf4' : '#fef2f2'};
              border: 1px solid ${isProfitable ? '#bbf7d0' : '#fecaca'};
              border-left: 6px solid ${isProfitable ? '#16a34a' : '#dc2626'};
              border-radius: 8px;
              padding: 14px 18px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .banner-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: ${isProfitable ? '#15803d' : '#b91c1c'}; }
            .banner-status { font-size: 16px; font-weight: 900; color: ${isProfitable ? '#16a34a' : '#dc2626'}; }

            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .card span { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; }
            .card div { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            
            h3 { font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background: #0f172a; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            .footer { margin-top: 25px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1>BetManager Pro - Auditoría Financiera y P&L</h1>
              <div class="subtitle">Periodo analizado: ${startDate} al ${endDate} &nbsp;|&nbsp; Generado el: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="banner-fecha">
            <div>
              <div class="banner-title">Evaluación del Periodo Seleccionado</div>
              <div style="font-size: 13px; color: #334155; margin-top: 2px;">
                ${isProfitable ? '📈 ¡Excelente desempeño! Se generó ganancia neta en la fecha.' : '📉 Atención: Se registró pérdida neta en la fecha.'}
              </div>
            </div>
            <div class="banner-status">
              ${isProfitable ? 'GANANCIA EN LA FECHA (+S/ ' + metrics.netProfit.toFixed(2) + ')' : 'PÉRDIDA EN LA FECHA (-S/ ' + Math.abs(metrics.netProfit).toFixed(2) + ')'}
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="card"><span>P&L Neto Global</span><div style="color: ${isProfitable ? '#16a34a' : '#dc2626'}">S/ ${metrics.netProfit.toFixed(2)}</div></div>
            <div class="card"><span>ROI / Yield</span><div style="color: ${metrics.roi >= 0 ? '#9333ea' : '#dc2626'}">${metrics.roi.toFixed(2)}%</div></div>
            <div class="card"><span>Win Rate</span><div style="color: #d97706">${metrics.winRate.toFixed(1)}%</div></div>
            <div class="card"><span>Total Apuestas</span><div>${metrics.totalCount} boletos</div></div>
          </div>

          <h3>Detalle de Operaciones Liquidadas</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Casa</th>
                <th>Evento / Deporte</th>
                <th>Tipo</th>
                <th>Cuota</th>
                <th>Stake</th>
                <th>Resultado</th>
                <th>P&L Neto</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBets.map(bet => `
                <tr>
                  <td>${bet.date}</td>
                  <td><b>${bet.bookmaker}</b></td>
                  <td>${bet.sport}</td>
                  <td>${bet.type}</td>
                  <td>${bet.odd.toFixed(2)}</td>
                  <td>S/ ${bet.stake.toFixed(2)}</td>
                  <td><b>${translateResult(bet.result)}</b></td>
                  <td style="color: ${bet.net >= 0 ? '#16a34a' : '#dc2626'}"><b>S/ ${bet.net.toFixed(2)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            BetManager Pro © 2026 - Central de Inteligencia Financiera e Inversiones Deportivas. Documento Oficial de Auditoría.
          </div>
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  return (
    <div style={{
      maxWidth: '1300px',
      margin: '0 auto',
      padding: '30px',
      backgroundColor: '#07090e',
      color: '#ffffff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      animation: 'fadeInPage 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pro-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.5) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pro-card:hover {
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 12px 35px -10px rgba(37, 99, 235, 0.2);
        }
        .input-pro:focus, select:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.2) !important;
          background-color: rgba(15, 23, 42, 0.95) !important;
        }
        .quick-btn {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .quick-btn:hover {
          background-color: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }
        input[type="date"] {
          color-scheme: dark;
          position: relative;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E") no-repeat center;
          cursor: pointer;
          width: 20px;
          height: 20px;
          opacity: 1;
        }
      `}</style>

      {/* CABECERA DEL MÓDULO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.5px' }}>
            Reportes y P&L (Inteligencia Financiera) 📊
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Central de auditoría para descomponer el rendimiento histórico en métricas milimétricas.
          </p>
        </div>

        <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px' }}>📅</span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8' }}>
            Mostrando datos del {startDate.split('-').reverse().join('/')} al {endDate.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* PANEL SUPERIOR DE FILTROS INTELIGENTES Y CALENDARIO */}
      <div className="pro-card" style={{ borderRadius: '20px', padding: '24px', marginBottom: '28px' }}>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
          {[
            { key: 'today', label: 'Hoy' },
            { key: 'yesterday', label: 'Ayer' },
            { key: 'week', label: 'Esta Semana' },
            { key: 'month', label: 'Este Mes' },
            { key: 'year', label: 'Este Año' },
            { key: 'all', label: 'Histórico Total' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleQuickTab(tab.key)}
              className="quick-btn"
              style={{
                backgroundColor: activeTab === tab.key ? '#2563eb' : 'rgba(15, 23, 42, 0.6)',
                color: activeTab === tab.key ? '#ffffff' : '#94a3b8',
                border: activeTab === tab.key ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '800',
                boxShadow: activeTab === tab.key ? '0 0 15px rgba(37, 99, 235, 0.4)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              FECHA INICIO (DESDE)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveTab('custom'); }}
              style={inputStyle}
              className="input-pro"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              FECHA FIN (HASTA)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveTab('custom'); }}
              style={inputStyle}
              className="input-pro"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              CASA DE APUESTAS
            </label>
            <select
              value={bookmakerFilter}
              onChange={(e) => setBookmakerFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">Todas las Bookmakers</option>
              {bookmakersList.map(bm => (
                <option key={bm.id} value={bm.id}>{bm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              TIPO DE APUESTA
            </label>
            <select
              value={betTypeFilter}
              onChange={(e) => setBetTypeFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">Todos los Tipos</option>
              <option value="Simple">Simples</option>
              <option value="Parlay">Parlays / Combos</option>
              <option value="BetBuilder">BetBuilders</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              TIPO DE FONDO
            </label>
            <select
              value={fundTypeFilter}
              onChange={(e) => setFundTypeFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">Todos los Fondos</option>
              <option value="Cash">Dinero Real (Cash)</option>
              <option value="Freebet">Freebets</option>
              <option value="Bono">Bonos</option>
            </select>
          </div>
        </div>

      </div>

      {/* PANELES DE MÉTRICAS MAESTRAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #22c55e' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>1. Apuestas Ganadas</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc' }}>{metrics.wonCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>boletos</span></span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#4ade80' }}>+S/ {metrics.wonAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>2. Apuestas Perdidas</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc' }}>{metrics.lostCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>boletos</span></span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#f87171' }}>-S/ {metrics.lostAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #94a3b8' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>3. Apuestas Anuladas (Void)</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc' }}>{metrics.voidCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>boletos</span></span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#cbd5e1' }}>S/ {metrics.voidAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>4. Cierres con Cashout</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc' }}>{metrics.cashoutCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>boletos</span></span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8' }}>+S/ {metrics.cashoutAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: `4px solid ${metrics.netProfit >= 0 ? '#4ade80' : '#ef4444'}`, backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>5. P&L Neto Global (Beneficio)</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Resultado Líquido</span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: metrics.netProfit >= 0 ? '#4ade80' : '#f87171' }}>
              {metrics.netProfit >= 0 ? `+S/ ${metrics.netProfit.toFixed(2)}` : `-S/ ${Math.abs(metrics.netProfit).toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>6. Rendimiento (ROI / Yield)</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Eficiencia inversora</span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: metrics.roi >= 0 ? '#a78bfa' : '#f87171' }}>
              {metrics.roi >= 0 ? `+${metrics.roi.toFixed(2)}%` : `${metrics.roi.toFixed(2)}%`}
            </span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>7. Win Rate (Tasa de Acierto)</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Efectividad de acierto</span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24' }}>
              {metrics.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '20px', borderLeft: '4px solid #06b6d4' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>8. Promedios del Periodo</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Stake Med: <strong style={{ color: '#fff' }}>S/ {metrics.avgStake.toFixed(1)}</strong></span>
            <span style={{ color: '#94a3b8' }}>Cuota Med: <strong style={{ color: '#38bdf8' }}>{metrics.avgOdd.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* TABLA MAESTRA DE AUDITORÍA */}
      <div className="pro-card" style={{ borderRadius: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              Tabla Maestra de Auditoría ({metrics.totalCount} boletos encontrados)
            </h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Listado completo de operaciones registradas en Supabase en el rango de fechas actual.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={handleDownloadCSV}
              style={exportBtnStyle}
            >
              📥 Descargar CSV
            </button>
            <button 
              type="button"
              onClick={handleDownloadPDF}
              style={exportBtnStyle}
            >
              📄 Descargar PDF
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '11px' }}>
                <th style={{ padding: '10px' }}>Fecha</th>
                <th style={{ padding: '10px' }}>Casa</th>
                <th style={{ padding: '10px' }}>Deporte / Evento</th>
                <th style={{ padding: '10px' }}>Tipo</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Cuota</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Stake</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Resultado</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>P&L Neto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Cargando operaciones desde Supabase...
                  </td>
                </tr>
              ) : filteredBets.length > 0 ? (
                filteredBets.map(bet => (
                  <tr key={bet.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{bet.date}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#38bdf8' }}>{bet.bookmaker}</td>
                    <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{bet.sport}</td>
                    <td style={{ padding: '12px 10px' }}><span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>{bet.type}</span></td>
                    <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '800' }}>{bet.odd.toFixed(2)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>S/ {bet.stake.toFixed(2)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: bet.result === 'Won' ? 'rgba(34, 197, 94, 0.15)' : bet.result === 'Lost' ? 'rgba(239, 68, 68, 0.15)' : bet.result === 'Cashout' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: bet.result === 'Won' ? '#4ade80' : bet.result === 'Lost' ? '#f87171' : bet.result === 'Cashout' ? '#38bdf8' : '#cbd5e1',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '800'
                      }}>
                        {translateResult(bet.result)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: bet.net > 0 ? '#4ade80' : bet.net < 0 ? '#f87171' : '#cbd5e1' }}>
                      {bet.net > 0 ? `+S/ ${bet.net.toFixed(2)}` : bet.net < 0 ? `-S/ ${Math.abs(bet.net).toFixed(2)}` : 'S/ 0.00'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron operaciones que coincidan con los filtros y fechas seleccionadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  )
}

const inputStyle = {
  width: '100%',
  backgroundColor: 'rgba(7, 9, 14, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box'
}

const exportBtnStyle = {
  backgroundColor: 'rgba(37, 99, 235, 0.2)',
  color: '#38bdf8',
  border: '1px solid rgba(56, 189, 248, 0.4)',
  borderRadius: '10px',
  padding: '8px 14px',
  fontSize: '11px',
  fontWeight: '800',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}