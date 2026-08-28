import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

const formatBogotaDate = (dateString) => {
  if (!dateString) return 'Sin fecha'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return 'Sin fecha'
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

export default function BetForm({ user, isCajaClosed = false, onSaveBet }) {
  const [betType, setBetType] = useState('Simple')
  const [bookmakersList, setBookmakersList] = useState([])
  const [selectedBookmakerId, setSelectedBookmakerId] = useState('')
  const [fundType, setFundType] = useState('CASH')
  const [stake, setStake] = useState('')
  const [globalOdds, setGlobalOdds] = useState('')
  const [notes, setNotes] = useState('')
  const [successMessage, setSuccessMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [sports, setSports] = useState([])
  const [leagues, setLeagues] = useState([])

  const [bbSportId, setBbSportId] = useState('')
  const [bbLeagueId, setBbLeagueId] = useState('')
  const [bbMatchName, setBbMatchName] = useState('Real Madrid vs. Barcelona')

  const [legs, setLegs] = useState([
    { id: 1, sport_id: '', league_id: '', match_name: '', selection: '', odds: '' }
  ])

  const [bbMarkets, setBbMarkets] = useState([
    { id: 1, selection: 'Más de 2.5 goles' },
    { id: 2, selection: 'Ambos anotan (Sí)' }
  ])

  const fetchInitialData = async () => {
    try {
      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id;
      }

      if (!currentUserId) return;

      const { data: bData, error: bError } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('is_active', true);
      
      if (bError) console.error("Error en casas:", bError);
      if (bData && bData.length > 0) {
        setBookmakersList(bData);
        setSelectedBookmakerId(bData[0].id);
      } else {
        setBookmakersList([]);
      }

      const { data: sData, error: sError } = await supabase.from('sports').select('*');
      const { data: lData, error: lError } = await supabase.from('leagues').select('*');
      
      if (sError) console.error("Error en deportes:", sError);
      if (lError) console.error("Error en ligas:", lError);

      if (sData && lData) {
        setSports(sData);
        setLeagues(lData);
        
        if (sData.length > 0) {
          const defaultSportId = sData[0].id;
          setBbSportId(defaultSportId);
          
          const initialLeagues = lData.filter(l => l.sport_id === defaultSportId);
          if (initialLeagues.length > 0) {
            setBbLeagueId(initialLeagues[0].id);
          }

          setLegs([{
            id: 1,
            sport_id: defaultSportId,
            league_id: initialLeagues.length > 0 ? initialLeagues[0].id : '',
            match_name: '',
            selection: '',
            odds: ''
          }]);
        }
      }

    } catch (err) {
      console.error('Error general al cargar datos iniciales:', err.message);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const getFilteredLeagues = (sportId) => {
    return leagues.filter(l => l.sport_id === Number(sportId));
  };

  const handleAddLeg = () => {
    if (betType === 'BetBuilder') {
      setBbMarkets([...bbMarkets, { id: Date.now(), selection: '' }])
    } else {
      const defaultSport = sports[0]?.id || '';
      const availableLeagues = leagues.filter(l => l.sport_id === defaultSport);
      const defaultLeague = availableLeagues.length > 0 ? availableLeagues[0].id : '';
      
      setLegs([
        ...legs,
        { id: Date.now(), sport_id: defaultSport, league_id: defaultLeague, match_name: '', selection: '', odds: '' }
      ])
    }
  }

  const handleRemoveItem = (id, isBB = false) => {
    if (isBB) {
      if (bbMarkets.length === 1) return;
      setBbMarkets(bbMarkets.filter(m => m.id !== id))
    } else {
      if (legs.length === 1) return;
      setLegs(legs.filter(leg => leg.id !== id))
    }
  }

  const handleLegChange = (id, field, value) => {
    setLegs(legs.map(leg => {
      if (leg.id === id) {
        const updated = { ...leg, [field]: value }
        if (field === 'sport_id') {
          const firstLeagueForSport = leagues.find(l => l.sport_id === Number(value))?.id || '';
          updated.league_id = firstLeagueForSport;
        }
        return updated
      }
      return leg
    }))
  }

  const currentSelectedBookmaker = bookmakersList.find(b => b.id === Number(selectedBookmakerId))
  const numericStake = parseFloat(stake) || 0
  
  let effectiveOdds = 1
  if (betType === 'Simple') {
    effectiveOdds = legs.reduce((acc, leg) => acc * (parseFloat(leg.odds) || 1), 1)
  } else {
    effectiveOdds = parseFloat(globalOdds) || 1
  }

  const potentialPayout = (numericStake * effectiveOdds).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isCajaClosed) return
    setErrorMessage('')

    if (!selectedBookmakerId) {
      setErrorMessage('Selecciona una casa de apuestas válida.')
      return
    }

    if (fundType === 'CASH' && currentSelectedBookmaker && numericStake > Number(currentSelectedBookmaker.current_balance)) {
      setErrorMessage('Error: El Stake supera el saldo disponible en la casa de apuestas.')
      return
    }

    try {
      setLoading(true)

      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id;
      }
      if (!currentUserId) throw new Error("Usuario no autenticado");

      let compiledLegs = []
      if (betType === 'BetBuilder') {
        compiledLegs = bbMarkets.map(m => ({
          sport_id: Number(bbSportId),
          league_id: Number(bbLeagueId),
          match_name: bbMatchName,
          selection: m.selection,
          odds: effectiveOdds / bbMarkets.length 
        }))
      } else {
        compiledLegs = legs.map(l => ({
          sport_id: Number(l.sport_id),
          league_id: Number(l.league_id),
          match_name: l.match_name,
          selection: l.selection,
          odds: parseFloat(l.odds) || 1.00
        }))
      }

      const { data, error } = await supabase.rpc('register_bet_transaction', {
        p_user_id: currentUserId,
        p_bookmaker_id: Number(selectedBookmakerId),
        p_bet_type: betType.toUpperCase(),
        p_fund_type: fundType.toUpperCase(),
        p_stake: numericStake,
        p_total_odds: effectiveOdds,
        p_potential_payout: parseFloat(potentialPayout),
        p_notes: notes || null,
        p_legs: compiledLegs
      })

      if (error) throw error;

      if (data && data.success) {
        setSuccessMessage(true)

        const nowISO = new Date().toISOString()
        const formattedNewBet = {
          ...data,
          created_at: data.created_at || nowISO,
          date: formatBogotaDate(data.created_at || nowISO)
        }

        if (onSaveBet) onSaveBet(formattedNewBet)

        setTimeout(() => {
          setSuccessMessage(false)
          setStake('')
          setGlobalOdds('')
          setNotes('')
          fetchInitialData() 
        }, 2500)
      }

    } catch (err) {
      console.error('Error al registrar la jugada:', err.message)
      setErrorMessage('Error en BD: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '30px',
      backgroundColor: '#07090e',
      color: '#ffffff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      animation: 'fadeInPage 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseAlert {
          0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.6); }
          100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
        }
        @keyframes shimmerGlow {
          0% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.2); border-color: rgba(30, 41, 59, 1); }
          50% { box-shadow: 0 0 30px rgba(56, 189, 248, 0.5); border-color: rgba(56, 189, 248, 0.6); }
          100% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.2); border-color: rgba(30, 41, 59, 1); }
        }
        @keyframes payoutPulse {
          0% { transform: scale(1); text-shadow: 0 0 10px rgba(74, 222, 128, 0.3); }
          50% { transform: scale(1.02); text-shadow: 0 0 20px rgba(74, 222, 128, 0.7); }
          100% { transform: scale(1); text-shadow: 0 0 10px rgba(74, 222, 128, 0.3); }
        }
        .interactive-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .interactive-card:hover {
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 12px 35px -10px rgba(37, 99, 235, 0.3);
          transform: translateY(-3px);
        }
        .input-glow:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.4) !important;
        }
        .payout-box {
          animation: shimmerGlow 3s infinite ease-in-out;
        }
        .payout-value {
          animation: payoutPulse 2s infinite ease-in-out;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.5px', textShadow: '0 2px 15px rgba(37,99,235,0.4)' }}>
            Registro de Nueva Jugada 🎯
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sincronizado de forma segura con Supabase bajo estricta disciplina financiera</p>
        </div>
      </div>

      {isCajaClosed && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'pulseAlert 2s infinite'
        }}>
          <span style={{ fontSize: '28px' }}>🔒</span>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fca5a5', marginBottom: '4px' }}>
              Formulario Bloqueado — Caja Cerrada por Disciplina
            </h4>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Has cerrado tu caja operativa del día. No es posible registrar nuevas jugadas hasta el próximo ciclo.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        opacity: isCajaClosed ? 0.4 : 1,
        pointerEvents: isCajaClosed ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        transition: 'all 0.3s ease'
      }}>

        <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '22px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            1. Tipo de Apuesta
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {['Simple', 'Parlay', 'BetBuilder'].map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setBetType(type)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: betType === type ? '1px solid #38bdf8' : '1px solid #1e293b',
                  backgroundColor: betType === type ? 'rgba(56, 189, 248, 0.15)' : '#07090e',
                  color: betType === type ? '#38bdf8' : '#94a3b8',
                  fontWeight: betType === type ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: betType === type ? '0 0 25px rgba(56, 189, 248, 0.4)' : 'none',
                  transform: betType === type ? 'scale(1.03)' : 'scale(1)'
                }}
              >
                {type === 'Simple' ? '⚡ Simple' : type === 'Parlay' ? '🔗 Parlay (Combinada)' : '🛠️ BetBuilder (Creador)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
              Casa de Apuestas (Bookmaker)
            </label>
            <select
              value={selectedBookmakerId}
              onChange={(e) => setSelectedBookmakerId(e.target.value)}
              style={inputStyle}
              className="input-glow"
              required
            >
              {bookmakersList.length > 0 ? (
                bookmakersList.map((b) => (
                  <option key={b.id} value={b.id} style={{ backgroundColor: '#0f172a' }}>
                    {b.name} (Saldo: S/ {Number(b.current_balance).toFixed(2)})
                  </option>
                ))
              ) : (
                <option value="" disabled>Cargando casas de apuestas...</option>
              )}
            </select>
          </div>

          <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
              Tipo de Fondo (Fund Type)
            </label>
            <select
              value={fundType}
              onChange={(e) => setFundType(e.target.value)}
              style={inputStyle}
              className="input-glow"
            >
              <option value="CASH" style={{ backgroundColor: '#0f172a' }}>💵 Cash (Dinero Real)</option>
              <option value="FREEBET" style={{ backgroundColor: '#0f172a' }}>🎟️ Freebet (Apuesta Gratuita)</option>
              <option value="BONUS" style={{ backgroundColor: '#0f172a' }}>🎁 Bono</option>
            </select>
          </div>
        </div>

        <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '22px' }}>
          
          {betType === 'BetBuilder' && (
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #1e293b', animation: 'fadeInPage 0.3s ease' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Configuración del Partido Único (BetBuilder) 🛠️
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Deporte</span>
                  <select
                    value={bbSportId}
                    onChange={(e) => {
                      setBbSportId(e.target.value)
                      const filtered = getFilteredLeagues(e.target.value);
                      if (filtered.length > 0) setBbLeagueId(filtered[0].id);
                    }}
                    style={subInputStyle}
                    className="input-glow"
                  >
                    {sports.map(sport => (
                      <option key={sport.id} value={sport.id} style={{ backgroundColor: '#07090e' }}>{sport.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Torneo / Liga</span>
                  <select
                    value={bbLeagueId}
                    onChange={(e) => setBbLeagueId(e.target.value)}
                    style={subInputStyle}
                    className="input-glow"
                  >
                    {getFilteredLeagues(bbSportId).map(league => (
                      <option key={league.id} value={league.id} style={{ backgroundColor: '#07090e' }}>{league.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nombre del Encuentro (Match)</span>
                  <input
                    type="text"
                    placeholder="Ej: Real Madrid vs. Barcelona"
                    value={bbMatchName}
                    onChange={(e) => setBbMatchName(e.target.value)}
                    style={subInputStyle}
                    className="input-glow"
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
              {betType === 'BetBuilder' ? `Pronósticos del Mismo Partido (${bbMarkets.length})` : `Selecciones del Boleto (${legs.length})`}
            </h3>
            <button
              type="button"
              onClick={handleAddLeg}
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(37, 99, 235, 0.4)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 15px rgba(37, 99, 235, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.35)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              + Añadir {betType === 'BetBuilder' ? 'Pronóstico' : 'Selección'}
            </button>
          </div>

          {betType === 'BetBuilder' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInPage 0.3s ease' }}>
              {bbMarkets.map((m, index) => (
                <div key={m.id} style={{
                  backgroundColor: '#07090e',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Pronóstico / Mercado #{index + 1}</span>
                    <input
                      type="text"
                      placeholder="Ej: Más de 2.5 goles"
                      value={m.selection}
                      onChange={(e) => {
                        const updated = bbMarkets.map(item => item.id === m.id ? { ...item, selection: e.target.value } : item)
                        setBbMarkets(updated)
                      }}
                      style={subInputStyle}
                      className="input-glow"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                    {bbMarkets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(m.id, true)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInPage 0.3s ease' }}>
              {legs.map((leg, index) => (
                <div key={leg.id} style={{
                  backgroundColor: '#07090e',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: betType === 'Simple' ? '1.2fr 1.5fr 2fr 2fr 0.8fr auto' : '1.2fr 1.5fr 2fr 2fr auto',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Deporte #{index + 1}</span>
                    <select
                      value={leg.sport_id}
                      onChange={(e) => handleLegChange(leg.id, 'sport_id', e.target.value)}
                      style={subInputStyle}
                      className="input-glow"
                    >
                      {sports.map(sport => (
                        <option key={sport.id} value={sport.id} style={{ backgroundColor: '#07090e' }}>{sport.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Torneo / Liga</span>
                    <select
                      value={leg.league_id}
                      onChange={(e) => handleLegChange(leg.id, 'league_id', e.target.value)}
                      style={subInputStyle}
                      className="input-glow"
                    >
                      {getFilteredLeagues(leg.sport_id).map(league => (
                        <option key={league.id} value={league.id} style={{ backgroundColor: '#07090e' }}>{league.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Encuentro (Match)</span>
                    <input
                      type="text"
                      placeholder="Ej: Real Madrid vs Barcelona"
                      value={leg.match_name}
                      onChange={(e) => handleLegChange(leg.id, 'match_name', e.target.value)}
                      style={subInputStyle}
                      className="input-glow"
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Pronóstico / Mercado</span>
                    <input
                      type="text"
                      placeholder="Ej: Más de 2.5 goles"
                      value={leg.selection}
                      onChange={(e) => handleLegChange(leg.id, 'selection', e.target.value)}
                      style={subInputStyle}
                      className="input-glow"
                    />
                  </div>

                  {betType === 'Simple' && (
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Cuota</span>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="1.85"
                        value={leg.odds}
                        onChange={(e) => handleLegChange(leg.id, 'odds', e.target.value)}
                        style={subInputStyle}
                        className="input-glow"
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                    {legs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(leg.id, false)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '22px', display: 'grid', gridTemplateColumns: betType !== 'Simple' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
              Stake (Monto a Arriesgar S/)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              style={inputStyle}
              className="input-glow"
              required
            />
          </div>

          {betType !== 'Simple' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px' }}>
                Cuota Total Global (Boleto) 🔗
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="Ej: 4.50"
                value={globalOdds}
                onChange={(e) => setGlobalOdds(e.target.value)}
                style={{ ...inputStyle, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.05)' }}
                className="input-glow"
                required
              />
            </div>
          )}

          <div className="payout-box" style={{ 
            backgroundColor: '#07090e', 
            padding: '16px 20px', 
            borderRadius: '14px', 
            border: '1px solid #38bdf8', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)'
          }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Retorno Potencial Estimado
            </span>
            <span className="payout-value" style={{ fontSize: '26px', fontWeight: '900', color: '#4ade80', marginTop: '6px' }}>
              S/ {potentialPayout}
            </span>
          </div>
        </div>

        <div className="interactive-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
            Notas y Análisis Previo (Opcional)
          </label>
          <textarea
            placeholder="Escribe el razonamiento, estadísticas o estrategia de la jugada..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            style={{ ...inputStyle, resize: 'vertical' }}
            className="input-glow"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 30px rgba(37, 99, 235, 0.5)',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.boxShadow = '0 0 40px rgba(56, 189, 248, 0.8)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(37, 99, 235, 0.5)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {loading ? 'Registrando en Base de Datos...' : 'Registrar Jugada en el Sistema 🚀'}
          </button>

          {errorMessage && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '14px',
              borderRadius: '12px',
              textAlign: 'center',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)'
            }}>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              color: '#4ade80',
              padding: '14px',
              borderRadius: '12px',
              textAlign: 'center',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
              animation: 'fadeInPage 0.3s ease'
            }}>
              ¡Jugada registrada con éxito atómicamente en Supabase! Bankroll descontado y estado PENDING guardado. ✅
            </div>
          )}
        </div>

      </form>

    </div>
  )
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#07090e',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '12px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease'
}

const subInputStyle = {
  width: '100%',
  backgroundColor: '#07090e',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '10px',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease'
}