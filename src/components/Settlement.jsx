import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

export default function Settlement({ userId, bets = [], onSettleBet }) {
  const [internalBets, setInternalBets] = useState(bets.length > 0 ? bets : [])

  const [bookmakersList, setBookmakersList] = useState([])
  const [isLoading, setIsLoading] = useState(userId ? false : false)

  const [filterBookmaker, setFilterBookmaker] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [expandedCardId, setExpandedCardId] = useState(null)
  
  const [modalConfig, setModalConfig] = useState({ open: false, type: null, bet: null })
  const [modalInputVal, setModalInputVal] = useState('')

  useEffect(() => {
    if (userId) {
      fetchSupabaseData()
    }
  }, [userId])

  const fetchSupabaseData = async () => {
    try {
      const { data: bmData, error: bmError } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('user_id', userId)

      if (bmError) throw bmError
      if (bmData) {
        setBookmakersList(bmData)
      }

      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(`
          *,
          bookmakers (name),
          bet_legs (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (betsError) throw betsError

      if (betsData && betsData.length > 0) {
        const mappedBets = betsData.map(b => ({
          id: b.id,
          bookmaker_id: b.bookmaker_id,
          betType: b.bet_type === 'SIMPLE' ? 'Simple' : b.bet_type === 'PARLAY' ? 'Parlay' : 'BetBuilder',
          bookmaker: b.bookmakers?.name || 'Casa Externa',
          fundType: b.fund_type,
          stake: Number(b.stake),
          odds: Number(b.total_odds),
          payout: Number(b.potential_payout),
          status: b.status,
          date: new Date(b.created_at).toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          profit: Number(b.profit_loss || 0),
          cashout_amount: Number(b.cashout_amount || 0), // 👈 Guardamos el cashout previo para revertirlo bien si se reabre
          legs: (b.bet_legs || []).map(l => ({
            sport: 'Deporte',
            league: 'Liga',
            match: l.match_name,
            market: l.selection
          }))
        }))
        setInternalBets(mappedBets)
      }
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error.message)
    }
  }

  const handleProcessSettlement = async (betId, newStatus, customProfit = null, customPayout = 0) => {
    // Buscamos la apuesta actual antes de modificarla para saber su estado anterior
    const currentBet = internalBets.find(b => b.id === betId)
    const oldStatus = currentBet ? currentBet.status : 'PENDING'

    const updated = internalBets.map(bet => {
      if (bet.id === betId) {
        let finalProfit = 0
        let finalPayout = bet.payout

        if (newStatus === 'PENDING') {
          finalProfit = 0
          // Al reabrir, el payout vuelve a ser el potencial original (Stake * Cuota)
          finalPayout = parseFloat((bet.stake * bet.odds).toFixed(2))
        } else if (newStatus === 'WON') {
          const effectivePayout = customPayout > 0 ? customPayout : bet.payout
          finalPayout = effectivePayout
          finalProfit = parseFloat((effectivePayout - bet.stake).toFixed(2))
        } else if (newStatus === 'LOST') {
          finalProfit = -bet.stake
          finalPayout = 0
        } else if (newStatus === 'CASHOUT') {
          finalPayout = customPayout
          finalProfit = parseFloat((customPayout - bet.stake).toFixed(2))
        } else if (newStatus === 'VOID') {
          finalProfit = 0
          finalPayout = bet.stake
        }

        return {
          ...bet,
          status: newStatus,
          profit: finalProfit,
          payout: finalPayout,
          cashout_amount: newStatus === 'CASHOUT' ? customPayout : (newStatus === 'PENDING' ? 0 : bet.cashout_amount)
        }
      }
      return bet
    })

    setInternalBets(updated)

    if (userId) {
      const targetBet = updated.find(b => b.id === betId)
      
      // 1. Actualizamos en la tabla 'bets'
      await supabase
        .from('bets')
        .update({
          status: newStatus,
          profit_loss: targetBet.profit,
          potential_payout: targetBet.payout,
          cashout_amount: newStatus === 'CASHOUT' ? customPayout : (newStatus === 'PENDING' ? null : currentBet.cashout_amount)
        })
        .eq('id', betId)
        .eq('user_id', userId)

      // 2. ACTUALIZACIÓN AUTOMÁTICA DEL SALDO EN LA TABLA 'bookmakers' (LIQUIDACIÓN Y REAPERTURA)
      try {
        const bookmakerId = targetBet.bookmaker_id;
        
        if (bookmakerId) {
          const { data: bmData, error: bmGetError } = await supabase
            .from('bookmakers')
            .select('current_balance')
            .eq('id', bookmakerId)
            .single()

          if (!bmGetError && bmData) {
            const currentBal = Number(bmData.current_balance || 0);
            let balanceAdjustment = 0;

            if (newStatus === 'PENDING') {
              // --- LÓGICA DE REAPERTURA (REVERTIR EL DINERO ABONADO ANTERIORMENTE) ---
              if (oldStatus === 'WON') {
                balanceAdjustment = -currentBet.payout; // Quitamos el payout que se había sumado
              } else if (oldStatus === 'CASHOUT') {
                balanceAdjustment = -currentBet.cashout_amount; // Quitamos el dinero del cashout
              } else if (oldStatus === 'VOID') {
                balanceAdjustment = -currentBet.stake; // Quitamos el stake devuelto
              }
              // Si era 'LOST', no se había sumado nada al saldo al liquidarla, por lo que adjustment es 0.
            } else {
              // --- LÓGICA DE LIQUIDACIÓN NORMAL ---
              if (newStatus === 'WON') {
                balanceAdjustment = targetBet.payout; 
              } else if (newStatus === 'CASHOUT') {
                balanceAdjustment = customPayout; 
              } else if (newStatus === 'VOID') {
                balanceAdjustment = targetBet.stake; 
              }
            }

            const newBalance = currentBal + balanceAdjustment;

            await supabase
              .from('bookmakers')
              .update({ current_balance: newBalance })
              .eq('id', bookmakerId);
          }
        }
      } catch (balanceErr) {
        console.error('Error al actualizar el balance de la casa:', balanceErr.message);
      }
    }

    if (onSettleBet) {
      onSettleBet(updated)
    }
    setModalConfig({ open: false, type: null, bet: null })
    setModalInputVal('')
  }

  const openActionModal = (bet, actionType) => {
    let defaultVal = ''
    if (actionType === 'CASHOUT') defaultVal = (bet.stake * 1.2).toFixed(2)
    if (actionType === 'WON') defaultVal = bet.payout.toFixed(2)
    if (actionType === 'LOST') defaultVal = '0.00'
    if (actionType === 'VOID') defaultVal = bet.stake.toFixed(2)

    setModalConfig({ open: true, type: actionType, bet })
    setModalInputVal(defaultVal)
  }

  const filteredBets = internalBets.filter(bet => {
    const matchBookmaker = filterBookmaker === 'ALL' || bet.bookmaker === filterBookmaker
    const matchType = filterType === 'ALL' || bet.betType === filterType
    return matchBookmaker && matchType
  })

  const pendingBets = filteredBets.filter(b => b.status === 'PENDING')
  const settledBets = filteredBets.filter(b => b.status !== 'PENDING').reverse()

  return (
    <div style={{
      maxWidth: '1250px',
      margin: '0 auto',
      padding: '30px',
      backgroundColor: '#07090e',
      color: '#ffffff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      animation: 'fadeInPage 0.5s ease-out'
    }}>
      
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .interactive-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .interactive-card:hover {
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 10px 30px -10px rgba(37, 99, 235, 0.2);
          transform: translateY(-2px);
        }
        .btn-action {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .btn-action:hover {
          transform: scale(1.05);
          filter: brightness(1.2);
        }
        .input-glow:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.3) !important;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            Gestión y Liquidación de Apuestas 📋
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Audita boletos pendientes, procesa resultados y controla el historial liquidado</p>
        </div>
      </div>

      <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '16px 20px', marginBottom: '28px', display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '24px', alignItems: 'center', width: 'fit-content' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔍 Filtros:
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Casa:</span>
          <select
            value={filterBookmaker}
            onChange={(e) => setFilterBookmaker(e.target.value)}
            style={selectStyle}
            className="input-glow"
          >
            <option value="ALL">Todas las Casas</option>
            {bookmakersList.length > 0 ? (
              bookmakersList.map(bm => (
                <option key={bm.id} value={bm.name}>{bm.name}</option>
              ))
            ) : (
              <>
                <option value="Betsson">Betsson</option>
                <option value="Inkabet">Inkabet</option>
                <option value="Doradobet">Doradobet</option>
              </>
            )}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tipo:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={selectStyle}
            className="input-glow"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="Simple">Simple</option>
            <option value="Parlay">Parlay</option>
            <option value="BetBuilder">BetBuilder</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            ⏳ Apuestas Pendientes <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{pendingBets.length}</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '6px 14px', borderRadius: '10px', fontSize: '11px', color: '#94a3b8' }}>
            <span style={{ fontWeight: '700', color: '#cbd5e1' }}>Acción rápida:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><strong style={{ color: '#4ade80' }}>[G]</strong> Ganada</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><strong style={{ color: '#f87171' }}>[P]</strong> Perdida</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><strong style={{ color: '#facc15' }}>[C]</strong> Cashout</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><strong style={{ color: '#cbd5e1' }}>[A]</strong> Anulada</span>
          </div>
        </div>

        {pendingBets.length === 0 ? (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No hay apuestas pendientes en este momento. ¡Todo liquidado al día! ✨
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingBets.map((bet) => {
              const isExpanded = expandedCardId === bet.id
              return (
                <div key={bet.id} className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr 1fr 1.2fr auto', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>ID BOLETO</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8' }}>#{bet.id}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>FECHA Y HORA</span>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>{bet.date}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>CASA / FONDO</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{bet.bookmaker}</span>
                      <span style={{ fontSize: '11px', color: '#cbd5e1', backgroundColor: '#1e293b', padding: '1px 6px', borderRadius: '6px', display: 'inline-block', marginTop: '2px' }}>{bet.fundType}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>TIPO</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#facc15' }}>{bet.betType}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>STAKE / CUOTA</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>S/ {bet.stake.toFixed(2)}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>@ {bet.odds}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>RETORNO POTENCIAL</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#4ade80' }}>S/ {bet.payout.toFixed(2)}</span>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : bet.id)}
                        className="btn-action"
                        style={{
                          backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.8)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isExpanded ? 'Ocultar 🔼' : `Ver Patas (${bet.legs.length}) 👁️`}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button title="G = Ganada" onClick={() => openActionModal(bet, 'WON')} className="btn-action" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', padding: '8px 10px', fontWeight: '800', fontSize: '11px' }}>✅ G</button>
                      <button title="P = Perdida" onClick={() => openActionModal(bet, 'LOST')} className="btn-action" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 10px', fontWeight: '800', fontSize: '11px' }}>❌ P</button>
                      <button title="C = Cashout" onClick={() => openActionModal(bet, 'CASHOUT')} className="btn-action" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid #eab308', borderRadius: '8px', padding: '8px 10px', fontWeight: '800', fontSize: '11px' }}>💰 C</button>
                      <button title="A = Anulada" onClick={() => openActionModal(bet, 'VOID')} className="btn-action" style={{ backgroundColor: 'rgba(100, 116, 139, 0.2)', color: '#cbd5e1', border: '1px solid #64748b', borderRadius: '8px', padding: '8px 10px', fontWeight: '800', fontSize: '11px' }}>🔄 A</button>
                    </div>

                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b', backgroundColor: '#07090e', borderRadius: '12px', padding: '16px', animation: 'slideDown 0.3s ease' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                        Desglose de Selecciones ({bet.betType}) 🛠️
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {bet.legs.map((leg, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr 2fr', gap: '10px', fontSize: '12px', backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                            <div><span style={{ color: '#64748b' }}>Deporte:</span> <strong style={{ color: '#38bdf8' }}>{leg.sport}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Liga:</span> {leg.league}</div>
                            <div><span style={{ color: '#64748b' }}>Partido:</span> <strong>{leg.match}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Pronóstico:</span> <span style={{ color: '#facc15' }}>{leg.market}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📜 Historial de Apuestas Liquidadas <span style={{ backgroundColor: 'rgba(100, 116, 139, 0.2)', color: '#cbd5e1', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{settledBets.length}</span>
          </h3>
        </div>

        {settledBets.length === 0 ? (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            Aún no hay apuestas liquidadas en el archivo histórico.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {settledBets.map((bet) => {
              const isExpanded = expandedCardId === bet.id
              
              let statusColor = '#4ade80'
              let statusBg = 'rgba(34, 197, 94, 0.15)'
              let statusBorder = '#22c55e'
              let statusLabel = 'WON (Ganada)'

              if (bet.status === 'LOST') {
                statusColor = '#f87171'
                statusBg = 'rgba(239, 68, 68, 0.15)'
                statusBorder = '#ef4444'
                statusLabel = 'LOST (Perdida)'
              } else if (bet.status === 'CASHOUT') {
                statusColor = '#facc15'
                statusBg = 'rgba(234, 179, 8, 0.15)'
                statusBorder = '#eab308'
                statusLabel = 'CASHOUT (Retirada)'
              } else if (bet.status === 'VOID') {
                statusColor = '#cbd5e1'
                statusBg = 'rgba(100, 116, 139, 0.15)'
                statusBorder = '#64748b'
                statusLabel = 'VOID (Anulada)'
              }

              return (
                <div key={bet.id} className="interactive-card" style={{ backgroundColor: '#0f172a', border: `1px solid ${statusBorder}`, borderRadius: '16px', padding: '18px', opacity: 0.95 }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr 1.3fr auto', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>ID BOLETO</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8' }}>#{bet.id}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>FECHA Y HORA</span>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>{bet.date}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>CASA / TIPO</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{bet.bookmaker}</span>
                      <span style={{ fontSize: '11px', color: '#facc15', display: 'block' }}>{bet.betType}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>ESTATUS</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: statusColor, backgroundColor: statusBg, padding: '3px 8px', borderRadius: '8px', border: `1px solid ${statusBorder}`, display: 'inline-block' }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>STAKE / CUOTA</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>S/ {bet.stake.toFixed(2)}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>@ {bet.odds}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '700' }}>BENEFICIO NETO (PROFIT)</span>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: bet.profit >= 0 ? '#4ade80' : '#f87171' }}>
                        {bet.profit >= 0 ? `+S/ ${bet.profit.toFixed(2)}` : `-S/ ${Math.abs(bet.profit).toFixed(2)}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleProcessSettlement(bet.id, 'PENDING', 0, 0)}
                        style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        title="Devolver a pendientes por error"
                      >
                        🔄 Reabrir
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : bet.id)}
                        className="btn-action"
                        style={{
                          backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.8)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        {isExpanded ? 'Ocultar 🔼' : `Ver Patas (${bet.legs.length}) 👁️`}
                      </button>
                    </div>

                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b', backgroundColor: '#07090e', borderRadius: '12px', padding: '16px', animation: 'slideDown 0.3s ease' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                        Detalle Histórico Registrado 📂
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {bet.legs.map((leg, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr 2fr', gap: '10px', fontSize: '12px', backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                            <div><span style={{ color: '#64748b' }}>Deporte:</span> <strong style={{ color: '#38bdf8' }}>{leg.sport}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Liga:</span> {leg.league}</div>
                            <div><span style={{ color: '#64748b' }}>Partido:</span> <strong>{leg.match}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Pronóstico:</span> <span style={{ color: '#facc15' }}>{leg.market}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalConfig.open && modalConfig.bet && (() => {
        const { type, bet } = modalConfig
        
        let headerTitle = 'Confirmar Liquidación'
        let headerColor = '#38bdf8'
        let borderCol = '#38bdf8'
        let btnBg = '#2563eb'
        let labelText = 'Monto Final / Payout (S/)'

        if (type === 'WON') {
          headerTitle = '✅ Registrar Apuesta Ganada (WON)'
          headerColor = '#4ade80'
          borderCol = '#22c55e'
          btnBg = '#22c55e'
          labelText = 'Payout Total a Abonar (S/)'
        } else if (type === 'LOST') {
          headerTitle = '❌ Registrar Apuesta Perdida (LOST)'
          headerColor = '#f87171'
          borderCol = '#ef4444'
          btnBg = '#ef4444'
          labelText = 'Monto Recuperado (S/)'
        } else if (type === 'CASHOUT') {
          headerTitle = '💰 Registrar Cashout (Retirada)'
          headerColor = '#facc15'
          borderCol = '#eab308'
          btnBg = '#eab308'
          labelText = 'Monto Recuperado en Cashout (S/)'
        } else if (type === 'VOID') {
          headerTitle = '🔄 Registrar Apuesta Anulada (VOID)'
          headerColor = '#cbd5e1'
          borderCol = '#64748b'
          btnBg = '#64748b'
          labelText = 'Stake Devuelto (S/)'
        }

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              backgroundColor: '#0f172a', border: `1px solid ${borderCol}`, borderRadius: '20px',
              padding: '30px', width: '420px', boxShadow: `0 0 40px ${borderCol}40`, animation: 'fadeInPage 0.3s ease'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: headerColor, marginBottom: '10px' }}>
                {headerTitle}
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
                Boleto #{bet.id} | Stake inicial: S/ {bet.stake.toFixed(2)}
              </p>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>
                {labelText}
              </label>
              <input
                type="number"
                step="0.01"
                value={modalInputVal}
                onChange={(e) => setModalInputVal(e.target.value)}
                style={{
                  width: '100%', backgroundColor: '#07090e', border: '1px solid #1e293b',
                  borderRadius: '10px', padding: '12px', color: '#ffffff', fontSize: '15px',
                  fontWeight: '700', outline: 'none', boxSizing: 'border-box', marginBottom: '24px'
                }}
                className="input-glow"
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleProcessSettlement(bet.id, type, null, parseFloat(modalInputVal) || 0)}
                  style={{
                    flex: 1, backgroundColor: btnBg, color: type === 'CASHOUT' ? '#07090e' : '#ffffff',
                    border: 'none', borderRadius: '10px', padding: '12px', fontWeight: '800',
                    fontSize: '13px', cursor: 'pointer', boxShadow: `0 0 15px ${borderCol}60`
                  }}
                >
                  Confirmar {type} ✅
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfig({ open: false, type: null, bet: null })}
                  style={{
                    backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #1e293b',
                    borderRadius: '10px', padding: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

const selectStyle = {
  backgroundColor: '#07090e',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer'
}