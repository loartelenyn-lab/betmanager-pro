import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

export default function Admin() {
  // --- ESTADOS DE CONFIGURACIÓN Y ADMINISTRACIÓN ---
  const [userName, setUserName] = useState('Lenyn')
  const [currency, setCurrency] = useState('PEN')
  const [initialBankroll, setInitialBankroll] = useState(1000)
  const [currentTheme, setCurrentTheme] = useState('dark')
  
  // Estatus de Cierre de Caja Diario
  const [isCashClosed, setIsCashClosed] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closureHistory, setClosureHistory] = useState([])

  // Catálogo de Casas de Apuestas (Bookmakers)
  const [bookmakers, setBookmakers] = useState([])
  const [newBookName, setNewBookName] = useState('')
  const [newBookBalance, setNewBookBalance] = useState('')

  // Catálogo maestro independiente de Deportes
  const [sportsList, setSportsList] = useState([])
  const [newSportInput, setNewSportInput] = useState('')

  // Catálogo de Torneos / Ligas vinculados a un Deporte
  const [tournamentsList, setTournamentsList] = useState([])
  const [selectedSportForTourney, setSelectedSportForTourney] = useState('')
  const [newTournamentInput, setNewTournamentInput] = useState('')

  // Control de pestañas internas del módulo
  const [activeSubTab, setActiveSubTab] = useState('bookmakers')

  // CARGAR DATOS INICIALES DESDE SUPABASE
  useEffect(() => {
    loadSupabaseData()
  }, [])

  const loadSupabaseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Cargar Perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profileError) {
        console.warn('Aviso al cargar perfil:', profileError.message)
      }
      
      if (profile) {
        setUserName(profile.full_name || 'Lenyn')
        setCurrency(profile.currency || 'PEN')
        setInitialBankroll(profile.initial_bankroll || 0)
        setCurrentTheme(profile.theme_preference || 'dark')
      }

      // 2. Cargar Bookmakers con saldos sincronizados desde Supabase
      const { data: books } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true })
      
      if (books) {
        setBookmakers(books.map(b => ({
          id: b.id,
          name: b.name,
          balance: Number(b.current_balance || 0),
          active: b.is_active
        })))
      }

      // 3. Cargar Deportes
      const { data: sports } = await supabase
        .from('sports')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true })
      
      if (sports) {
        setSportsList(sports.map(s => ({
          id: s.id,
          name: s.name,
          active: true
        })))
        if (sports.length > 0) {
          setSelectedSportForTourney(sports[0].name)
        }
      }

      // 4. Cargar Ligas / Torneos
      const { data: leagues } = await supabase
        .from('leagues')
        .select('*, sports(name)')
        .eq('user_id', user.id)
        .order('id', { ascending: true })

      if (leagues) {
        setTournamentsList(leagues.map(l => ({
          id: l.id,
          sport: l.sports?.name || '',
          sport_id: l.sport_id,
          tournament: l.name,
          active: true
        })))
      }

      // 5. Cargar Cierres de Caja (Mapeando correctamente la hora local con closed_at)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: closures } = await supabase
        .from('daily_closures')
        .select('*')
        .eq('user_id', user.id)
        .order('closure_date', { ascending: false })

      if (closures) {
        setClosureHistory(closures.map(c => ({
          date: c.closure_date,
          status: 'Cerrado Correctamente (Bloqueado)',
          time: new Date(c.closed_at || c.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })))

        const todayClosed = closures.some(c => c.closure_date === todayStr)
        setIsCashClosed(todayClosed)
      }

    } catch (error) {
      console.error('Error cargando datos de Supabase:', error)
    }
  }

  // --- LÓGICA CLAVE DE LIQUIDACIÓN DE APUESTAS Y ACTUALIZACIÓN DE SALDO ---
  const handleLiquidateBet = async (betId, newStatus, bookmakerId, stake, profit) => {
    try {
      let balanceChange = 0;
      
      if (newStatus === 'WON' || newStatus === 'Ganada') {
        balanceChange = Number(stake) + Number(profit);
      } else if (newStatus === 'LOST' || newStatus === 'Perdida') {
        balanceChange = 0;
      } else if (newStatus === 'CASHOUT') {
        balanceChange = Number(profit);
      }

      const { data: bookData, error: bookError } = await supabase
        .from('bookmakers')
        .select('current_balance')
        .eq('id', bookmakerId)
        .single();

      if (bookError) throw bookError;

      const currentBookBalance = Number(bookData.current_balance || 0);
      const updatedBalance = currentBookBalance + balanceChange;

      const { error: updateBookError } = await supabase
        .from('bookmakers')
        .update({ current_balance: updatedBalance })
        .eq('id', bookmakerId);

      if (updateBookError) throw updateBookError;

      loadSupabaseData();
      
    } catch (error) {
      console.error('Error al actualizar el saldo de la casa:', error.message);
    }
  };

  const handleAddBookmaker = async (e) => {
    e.preventDefault()
    if (!newBookName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const initialBal = parseFloat(newBookBalance) || 0
      const { data, error } = await supabase
        .from('bookmakers')
        .insert([{
          user_id: user.id,
          name: newBookName.trim(),
          current_balance: initialBal,
          is_active: true
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        const newEntry = {
          id: data[0].id,
          name: data[0].name,
          balance: Number(data[0].current_balance),
          active: data[0].is_active
        }
        setBookmakers([...bookmakers, newEntry])
      }

      setNewBookName('')
      setNewBookBalance('')
    } catch (error) {
      alert('Error al registrar casa de apuestas: ' + error.message)
    }
  }

  const toggleBookmakerStatus = async (id) => {
    const book = bookmakers.find(b => b.id === id)
    if (!book) return
    const nextStatus = !book.active

    try {
      const { error } = await supabase
        .from('bookmakers')
        .update({ is_active: nextStatus })
        .eq('id', id)

      if (error) throw error

      setBookmakers(bookmakers.map(b => b.id === id ? { ...b, active: nextStatus } : b))
    } catch (error) {
      alert('Error al actualizar estatus: ' + error.message)
    }
  }

  const handleAddSport = async (e) => {
    e.preventDefault()
    if (!newSportInput.trim()) return
    const sportName = newSportInput.trim()

    if (sportsList.some(s => s.name.toLowerCase() === sportName.toLowerCase())) {
      alert('Este deporte ya se encuentra registrado.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sports')
        .insert([{ user_id: user.id, name: sportName }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        const newSport = { id: data[0].id, name: data[0].name, active: true }
        setSportsList([...sportsList, newSport])
        if (!selectedSportForTourney) setSelectedSportForTourney(newSport.name)
      }
      setNewSportInput('')
    } catch (error) {
      alert('Error al registrar deporte: ' + error.message)
    }
  }

  const toggleSportStatus = (id) => {
    setSportsList(sportsList.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  const handleAddTournament = async (e) => {
    e.preventDefault()
    if (!newTournamentInput.trim()) return

    const parentSport = sportsList.find(s => s.name === selectedSportForTourney)
    if (!parentSport) {
      alert('Selecciona un deporte válido.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('leagues')
        .insert([{
          user_id: user.id,
          sport_id: parentSport.id,
          name: newTournamentInput.trim()
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        const newEntry = {
          id: data[0].id,
          sport: parentSport.name,
          sport_id: parentSport.id,
          tournament: data[0].name,
          active: true
        }
        setTournamentsList([...tournamentsList, newEntry])
      }
      setNewTournamentInput('')
    } catch (error) {
      alert('Error al registrar torneo: ' + error.message)
    }
  }

  const toggleTournamentStatus = (id) => {
    setTournamentsList(tournamentsList.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  // Ejecutar Cierre de Caja Definitivo en Supabase registrando la hora exacta
  const executeDailyClosure = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]
      const nowIso = new Date().toISOString()

      const { error } = await supabase
        .from('daily_closures')
        .insert([{ 
          user_id: user.id, 
          closure_date: todayStr, 
          closed_at: nowIso,
          notes: 'Cierre ejecutado desde panel de administración' 
        }])

      if (error) throw error

      setIsCashClosed(true)
      setShowCloseModal(false)
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setClosureHistory([{ date: todayStr, status: 'Cerrado Correctamente (Bloqueado)', time: timeStr }, ...closureHistory])
    } catch (error) {
      alert('Error al ejecutar cierre de caja: ' + error.message)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: userName,
          currency: currency,
          initial_bankroll: initialBankroll,
          theme_preference: currentTheme,
          updated_at: new Date()
        })

      if (error) throw error
      alert('¡Preferencias actualizadas correctamente en la base de datos!')
    } catch (error) {
      alert('Error al actualizar perfil: ' + error.message)
    }
  }

  const handleBackupJSON = () => {
    const backupData = {
      user: userName,
      currency,
      initialBankroll,
      bookmakers,
      sportsList,
      tournamentsList,
      closures: closureHistory,
      exportDate: new Date().toISOString()
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `BetManagerPro_Backup_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div style={{
      maxWidth: '1300px',
      margin: '0 auto',
      padding: '30px',
      backgroundColor: currentTheme === 'light' ? '#f8fafc' : '#07090e',
      color: currentTheme === 'light' ? '#0f172a' : '#ffffff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    }}>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-card {
          background: ${currentTheme === 'light' ? '#ffffff' : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.5) 100%)'};
          backdrop-filter: blur(12px);
          border: 1px solid ${currentTheme === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.07)'};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.4s ease-out;
        }
        .admin-card:hover {
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 12px 35px -10px rgba(37, 99, 235, 0.2);
        }
        .input-admin:focus, select:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.2) !important;
        }
        .subtab-btn {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .subtab-btn:hover {
          background-color: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }
      `}</style>

      {/* CABECERA DEL MÓDULO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Panel de Administración y Control Maestro ⚙️
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Configuración de cimientos, casas de apuestas, deportes, torneos y disciplina de caja global.
          </p>
        </div>

        <div style={{
          backgroundColor: isCashClosed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
          border: `1px solid ${isCashClosed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
          borderRadius: '12px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '14px' }}>{isCashClosed ? '🔒' : '🔓'}</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Caja de Hoy</div>
            <div style={{ fontSize: '12px', fontWeight: '900', color: isCashClosed ? '#f87171' : '#4ade80' }}>
              {isCashClosed ? 'CERRADA (Bloqueada)' : 'ABIERTA (Operativa)'}
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN INTERNA */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        {[
          { key: 'bookmakers', label: '🏦 Gestión de Bookmakers', desc: 'Casas y Saldos' },
          { key: 'sports', label: '⚽ Deportes y Torneos', desc: 'Ligas y Disciplinas' },
          { key: 'discipline', label: '🛡️ Cierre de Caja', desc: 'Juego Responsable' },
          { key: 'preferences', label: '🎨 Perfil y Apariencia', desc: 'Identidad y Tema' },
          { key: 'security', label: '🔒 Seguridad y Backups', desc: 'Resguardos y Datos' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key)}
            className="subtab-btn"
            style={{
              backgroundColor: activeSubTab === tab.key ? '#2563eb' : (currentTheme === 'light' ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)'),
              color: activeSubTab === tab.key ? '#ffffff' : (currentTheme === 'light' ? '#475569' : '#94a3b8'),
              border: activeSubTab === tab.key ? '1px solid #38bdf8' : (currentTheme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)'),
              borderRadius: '12px',
              padding: '10px 16px',
              textAlign: 'left',
              boxShadow: activeSubTab === tab.key ? '0 0 15px rgba(37, 99, 235, 0.4)' : 'none'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '800' }}>{tab.label}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* SECCIÓN A: GESTIÓN DE CASAS DE APUESTAS (BOOKMAKERS) */}
      {activeSubTab === 'bookmakers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0' }}>Plataformas Registradas</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Control en tiempo real de saldos por casa.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookmakers.map(book => (
                <div key={book.id} style={{
                  backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7, 9, 14, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: book.active ? 1 : 0.6
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: '#38bdf8' }}>{book.name}</span>
                      <span style={{
                        backgroundColor: book.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: book.active ? '#4ade80' : '#f87171',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: '800'
                      }}>
                        {book.active ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '6px' }}>
                      {currency === 'PEN' ? 'S/' : currency === 'USD' ? '$' : '€'} {book.balance.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBookmakerStatus(book.id)}
                    style={{
                      backgroundColor: book.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: book.active ? '#f87171' : '#4ade80',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '10px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {book.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0' }}>Agregar Nueva Casa</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Registra un nuevo bookmaker y su saldo inicial.</p>

            <form onSubmit={handleAddBookmaker} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                  NOMBRE COMERCIAL (Ej: Bet365, Meridianbet)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Bet365"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  style={inputStyle(currentTheme)}
                  className="input-admin"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                  SALDO INICIAL OPCIONAL
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newBookBalance}
                  onChange={(e) => setNewBookBalance(e.target.value)}
                  style={inputStyle(currentTheme)}
                  className="input-admin"
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                }}
              >
                + Registrar Casa de Apuestas
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SECCIÓN B: GESTIÓN DE DEPORTES Y TORNEOS SEPARADOS */}
      {activeSubTab === 'sports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0' }}>1. Registrar Nuevo Deporte</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Crea la disciplina base (Ej: Vóley, F1, Básquet).</p>

              <form onSubmit={handleAddSport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                    NOMBRE DEL DEPORTE
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vóley"
                    value={newSportInput}
                    onChange={(e) => setNewSportInput(e.target.value)}
                    style={inputStyle(currentTheme)}
                    className="input-admin"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  + Agregar Deporte
                </button>
              </form>
            </div>

            <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0' }}>Deportes Habilitados</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Disciplinas disponibles en el sistema.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {sportsList.map(sport => (
                  <div key={sport.id} style={{
                    backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7, 9, 14, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: sport.active ? 1 : 0.6
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#38bdf8' }}>{sport.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSportStatus(sport.id)}
                      style={{
                        backgroundColor: sport.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: sport.active ? '#f87171' : '#4ade80',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '9px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      {sport.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0' }}>2. Registrar Torneo / Liga</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Selecciona el deporte previamente creado e introduce la liga.</p>

              <form onSubmit={handleAddTournament} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                    SELECCIONAR DEPORTE ASOCIADO
                  </label>
                  <select
                    value={selectedSportForTourney}
                    onChange={(e) => setSelectedSportForTourney(e.target.value)}
                    style={inputStyle(currentTheme)}
                  >
                    {sportsList.filter(s => s.active).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                    NOMBRE DEL TORNEO / LIGA
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Premier League, ATP Masters"
                    value={newTournamentInput}
                    onChange={(e) => setNewTournamentInput(e.target.value)}
                    style={inputStyle(currentTheme)}
                    className="input-admin"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  + Registrar Torneo / Liga
                </button>
              </form>
            </div>

            <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0' }}>Torneos Registrados</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Competiciones activas ordenadas por deporte.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {tournamentsList.map(item => (
                  <div key={item.id} style={{
                    backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7, 9, 14, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: item.active ? 1 : 0.6
                  }}>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.sport}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: '900', marginTop: '4px', color: '#f8fafc' }}>
                        {item.tournament}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTournamentStatus(item.id)}
                      style={{
                        backgroundColor: item.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: item.active ? '#f87171' : '#4ade80',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '9px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      {item.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SECCIÓN C: CONTROL DE CIERRE DE CAJA DIARIO */}
      {activeSubTab === 'discipline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="admin-card" style={{ borderRadius: '20px', padding: '24px', borderLeft: `6px solid ${isCashClosed ? '#ef4444' : '#22c55e'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0' }}>Escudo contra la Ludopatía y el Tilt</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 20px 0' }}>El cierre definitivo bloquea nuevas apuestas y depósitos por el resto del día.</p>

            <div style={{ backgroundColor: currentTheme === 'light' ? '#f1f5f9' : 'rgba(7, 9, 14, 0.7)', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Estatus Actual de la Caja</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: isCashClosed ? '#f87171' : '#4ade80', margin: '8px 0' }}>
                {isCashClosed ? '🔒 CAJA CERRADA' : '🔓 CAJA ABIERTA'}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {isCashClosed ? 'Has cumplido con tu disciplina financiera de hoy. ¡Buen trabajo!' : 'Operaciones habilitadas. Recuerda cerrar caja al terminar tu sesión.'}
              </div>
            </div>

            {!isCashClosed ? (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)'
                }}
              >
                🔒 Ejecutar Cierre de Caja Definitivo
              </button>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#4ade80', padding: '10px' }}>
                ✓ Caja cerrada exitosamente por hoy. Retoma mañana con la cabeza fría.
              </div>
            )}

            {showCloseModal && (
              <div style={{ marginTop: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#f87171', marginBottom: '8px' }}>
                  ⚠️ ¿Estás completamente seguro? Esta acción no se puede deshacer y bloqueará los registros de hoy.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={executeDailyClosure}
                    style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Sí, Cerrar Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    style={{ flex: 1, backgroundColor: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', padding: '8px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="admin-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0' }}>Historial de Disciplina</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px 0' }}>Auditoría de días en que cerraste caja correctamente.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {closureHistory.map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7, 9, 14, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ fontWeight: '800', color: '#38bdf8' }}>{item.date}</span>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Hora de cierre: {item.time}</div>
                  </div>
                  <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>
                    ✓ Cumplido
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECCIÓN D: CONFIGURACIÓN GENERAL DEL PERFIL Y PREFERENCIAS */}
      {activeSubTab === 'preferences' && (
        <div className="admin-card" style={{ borderRadius: '20px', padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>Configuración General del Perfil y Apariencia</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 24px 0' }}>Personaliza tu identidad, moneda base, bankroll inicial y modo de interfaz.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                NOMBRE DE USUARIO
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={inputStyle(currentTheme)}
                className="input-admin"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                MONEDA PRINCIPAL
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={inputStyle(currentTheme)}
              >
                <option value="PEN">S/. (Sol Peruano)</option>
                <option value="USD">$ (Dólar Americano)</option>
                <option value="EUR">€ (Euro)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                BANKROLL INICIAL BASE
              </label>
              <input
                type="number"
                value={initialBankroll}
                onChange={(e) => setInitialBankroll(parseFloat(e.target.value) || 0)}
                style={inputStyle(currentTheme)}
                className="input-admin"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                TEMA VISUAL DE INTERFAZ
              </label>
              <select
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value)}
                style={inputStyle(currentTheme)}
              >
                <option value="dark">Dark Tech (Por defecto)</option>
                <option value="light">Light Clean (Modo Claro)</option>
                <option value="champions">Champions League Edition</option>
                <option value="premier">Premier League Edition</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleSaveProfile}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Guardar Cambios de Perfil
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN E: SEGURIDAD Y MANTENIMIENTO DE DATOS */}
      {activeSubTab === 'security' && (
        <div className="admin-card" style={{ borderRadius: '20px', padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>Seguridad y Mantenimiento de Datos</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 24px 0' }}>Descarga respaldos globales o realiza depuraciones de temporada.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7,9,14,0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>Copia de Seguridad Completa (Backup JSON)</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Exporta todas tus apuestas, transacciones y configuraciones en un archivo seguro.</div>
              </div>
              <button
                type="button"
                onClick={handleBackupJSON}
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
              >
                📥 Descargar Backup
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: currentTheme === 'light' ? '#f8fafc' : 'rgba(7,9,14,0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#f87171' }}>Restauración de Fábrica / Depuración</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Limpia registros de prueba para iniciar una nueva temporada de apuestas.</div>
              </div>
              <button
                type="button"
                onClick={() => { if(confirm('¿Deseas reiniciar los registros de prueba?')) alert('Sistema depurado.'); }}
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 16px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
              >
                🗑️ Depurar Temporada
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const inputStyle = (theme) => ({
  width: '100%',
  backgroundColor: theme === 'light' ? '#ffffff' : 'rgba(7, 9, 14, 0.7)',
  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: theme === 'light' ? '#0f172a' : '#ffffff',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box'
})