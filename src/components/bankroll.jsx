import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client' // 👈 Importación correcta del cliente de Supabase

export default function Bankroll({ 
  userId,
  initialTransactions = [], 
  bookmakers = [],
  isBoxClosed = false, 
  onTransactionComplete 
}) {

  const [transactions, setTransactions] = useState(initialTransactions.length > 0 ? initialTransactions : [])
  const [books, setBooks] = useState(bookmakers.length > 0 ? bookmakers : [])

  const [form, setForm] = useState({
    type: 'DEPÓSITO',
    bookmaker: '',
    amount: '',
    method: ''
  })

  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    if (userId) {
      fetchSupabaseData()
    }
  }, [userId])

  const fetchSupabaseData = async () => {
    try {
      // 1. Obtener casas de apuestas del usuario
      const { data: bmData, error: bmError } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('user_id', userId)

      if (bmError) throw bmError
      
      let mappedBooks = []
      if (bmData && bmData.length > 0) {
        mappedBooks = bmData.map(b => ({
          id: b.id,
          name: b.name,
          balance: Number(b.current_balance)
        }))
        setBooks(mappedBooks)
        setForm(prev => ({ ...prev, bookmaker: mappedBooks[0]?.name || '' }))
      }

      // 2. Obtener transacciones evitando cruces complejos para prevenir errores 406
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (txError) throw txError

      if (txData && txData.length > 0) {
        // Mapeamos cruzando el nombre de la casa desde el estado local de bookmakers
        const mappedTx = txData.map(t => {
          const foundBook = mappedBooks.find(b => b.id === t.bookmaker_id)
          return {
            id: t.id,
            type: t.type === 'DEPOSIT' ? 'DEPÓSITO' : 'RETIRO',
            bookmaker: foundBook?.name || 'Casa Externa',
            amount: Number(t.amount),
            method: t.notes || 'Estándar',
            date: new Date(t.created_at).toLocaleString()
          }
        })
        setTransactions(mappedTx)
      }
    } catch (error) {
      console.error('Error al sincronizar con Supabase:', error.message)
    }
  }

  // KPIs Financieros
  const totalDeposits = transactions
    .filter(t => t.type === 'DEPÓSITO')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalWithdrawals = transactions
    .filter(t => t.type === 'RETIRO')
    .reduce((acc, t) => acc + t.amount, 0)

  const netCashFlow = totalDeposits - totalWithdrawals

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlertMsg({ text: '', type: '' })

    if (isBoxClosed) {
      setAlertMsg({ 
        text: '⚠️ Cierre de caja ejecutado hoy. No se permiten nuevos ingresos o depósitos.', 
        type: 'error' 
      })
      return
    }

    const numericAmount = parseFloat(form.amount)
    if (!numericAmount || numericAmount <= 0) {
      setAlertMsg({ text: '⚠️ Por favor ingresa un monto válido mayor a cero.', type: 'error' })
      return
    }

    const targetBook = books.find(b => b.name === form.bookmaker)

    if (form.type === 'RETIRO') {
      if (!targetBook || targetBook.balance < numericAmount) {
        setAlertMsg({ 
          text: `❌ Saldo insuficiente en ${form.bookmaker}. Saldo actual disponible: S/ ${targetBook ? targetBook.balance.toFixed(2) : '0.00'}`, 
          type: 'error' 
        })
        return
      }
    }

    const dbType = form.type === 'DEPÓSITO' ? 'DEPOSIT' : 'WITHDRAWAL'
    const newBalance = form.type === 'DEPÓSITO' ? targetBook.balance + numericAmount : targetBook.balance - numericAmount

    // PERSISTENCIA EN SUPABASE
    if (userId && targetBook) {
      try {
        // 1. Insertar transacción
        const { data: insertedTx, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            bookmaker_id: targetBook.id,
            type: dbType,
            amount: numericAmount,
            notes: form.method.trim() || (form.type === 'DEPÓSITO' ? 'Depósito Estándar' : 'Retiro Bancario')
          })
          .select()
          .single()

        if (txError) throw txError

        // 2. Actualizar saldo del bookmaker en la base de datos
        const { error: bmError } = await supabase
          .from('bookmakers')
          .update({ current_balance: newBalance })
          .eq('id', targetBook.id)

        if (bmError) throw bmError

        // Actualizar estados locales tras éxito en BD
        const updatedBooks = books.map(b => b.id === targetBook.id ? { ...b, balance: newBalance } : b)
        setBooks(updatedBooks)

        const newTx = {
          id: insertedTx.id,
          type: form.type,
          bookmaker: targetBook.name,
          amount: numericAmount,
          method: insertedTx.notes,
          date: new Date(insertedTx.created_at).toLocaleString()
        }

        const updatedTransactions = [newTx, ...transactions]
        setTransactions(updatedTransactions)

        if (onTransactionComplete) {
          onTransactionComplete({ transactions: updatedTransactions, bookmakers: updatedBooks })
        }

        setForm({ type: 'DEPÓSITO', bookmaker: books[0]?.name || '', amount: '', method: '' })
        setAlertMsg({ text: `✅ Transacción registrada con éxito en ${targetBook.name} (PEN).`, type: 'success' })

      } catch (error) {
        console.error('Error al guardar en la base de datos:', error.message)
        setAlertMsg({ text: '❌ Error al procesar la transacción en la base de datos.', type: 'error' })
      }
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('¿Estás seguro de auditar y eliminar este registro financiero?')) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)

        if (error) throw error

        const filtered = transactions.filter(t => t.id !== id)
        setTransactions(filtered)
        setAlertMsg({ text: '🗑️ Transacción eliminada del registro.', type: 'success' })
      } catch (error) {
        console.error('Error al eliminar:', error.message)
        setAlertMsg({ text: '❌ No se pudo eliminar la transacción.', type: 'error' })
      }
    }
  }

  return (
    <div style={{
      maxWidth: '1250px',
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
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .pro-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.6) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pro-card:hover {
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 14px 40px -12px rgba(37, 99, 235, 0.25);
          transform: translateY(-3px);
        }
        .btn-interactive {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .btn-interactive:hover {
          transform: translateY(-1px) scale(1.02);
          filter: brightness(1.15);
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.4);
        }
        .input-pro:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.25) !important;
          background-color: rgba(15, 23, 42, 0.9) !important;
        }
        .row-item {
          transition: all 0.25s ease;
        }
        .row-item:hover {
          background-color: rgba(30, 41, 59, 0.7) !important;
          border-color: rgba(56, 189, 248, 0.2) !important;
        }
      `}</style>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.5px' }}>
            Gestión de Bankroll: Depósitos y Retiros 💳
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Centro de control financiero de capital. Registra, audita y sincroniza inyecciones y salidas de dinero real.
          </p>
        </div>
      </div>

      {alertMsg.text && (
        <div style={{
          backgroundColor: alertMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${alertMsg.type === 'error' ? '#ef4444' : '#22c55e'}`,
          color: alertMsg.type === 'error' ? '#f87171' : '#4ade80',
          padding: '14px 20px',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '24px',
          animation: 'fadeInPage 0.3s ease',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>
          {alertMsg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        <div className="pro-card" style={{ borderRadius: '18px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Capital Total Inyectado
          </span>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#4ade80', marginTop: '8px', letterSpacing: '-0.5px' }}>
            S/ {totalDeposits.toFixed(2)}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
            Sumatoria histórica de ingresos reales
          </span>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#f97316', boxShadow: '0 0 10px #f97316' }}></div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Capital Total Retirado
          </span>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#fb923c', marginTop: '8px', letterSpacing: '-0.5px' }}>
            S/ {totalWithdrawals.toFixed(2)}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
            Sumatoria histórica cobrada a cuentas
          </span>
        </div>

        <div className="pro-card" style={{ borderRadius: '18px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}></div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Flujo Neto de Caja
          </span>
          <div style={{ fontSize: '28px', fontWeight: '900', color: netCashFlow >= 0 ? '#38bdf8' : '#f87171', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {netCashFlow >= 0 ? `+S/ ${netCashFlow.toFixed(2)}` : `-S/ ${Math.abs(netCashFlow).toFixed(2)}`}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
            Balance real de dinero movilizado
          </span>
        </div>

      </div>

      <div className="pro-card" style={{ borderRadius: '22px', padding: '26px', marginBottom: '36px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            ⚡ Registrar Nueva Transacción Financiera
          </h3>
          {isBoxClosed && (
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', border: '1px solid #ef4444' }}>
              🔒 Caja Cerrada por Disciplina
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr)) 160px', gap: '16px', alignItems: 'end' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              TIPO DE MOVIMIENTO
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={selectStyle}
              className="input-pro"
              disabled={isBoxClosed}
            >
              <option value="DEPÓSITO">🟢 Depósito (Inyección)</option>
              <option value="RETIRO">🟠 Retiro (Salida)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              CASA DE APUESTAS / PLATAFORMA
            </label>
            <select
              value={form.bookmaker}
              onChange={(e) => setForm({ ...form, bookmaker: e.target.value })}
              style={selectStyle}
              className="input-pro"
              disabled={isBoxClosed}
            >
              {books.map(b => (
                <option key={b.id} value={b.name}>
                  {b.name} (Saldo: S/ {b.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              MONTO (PEN)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 50.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={inputStyle}
              className="input-pro"
              disabled={isBoxClosed}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
              MÉTODO / NOTAS
            </label>
            <input
              type="text"
              placeholder="Ej: Yape / BCP"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              style={inputStyle}
              className="input-pro"
              disabled={isBoxClosed}
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn-interactive"
              style={{
                width: '100%',
                backgroundColor: isBoxClosed ? '#334155' : '#2563eb',
                color: isBoxClosed ? '#94a3b8' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                fontWeight: '800',
                fontSize: '12px',
                cursor: isBoxClosed ? 'not-allowed' : 'pointer',
                boxShadow: isBoxClosed ? 'none' : '0 4px 20px rgba(37, 99, 235, 0.4)'
              }}
            >
              {isBoxClosed ? 'Bloqueado' : 'Registrar 🚀'}
            </button>
          </div>

        </form>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            📜 Historial y Auditoría de Transacciones 
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              {transactions.length}
            </span>
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="pro-card" style={{ borderRadius: '16px', padding: '35px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No hay transacciones registradas en el historial financiero.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.map((tx) => {
              const isDeposit = tx.type === 'DEPÓSITO'
              const badgeColor = isDeposit ? '#4ade80' : '#fb923c'
              const badgeBg = isDeposit ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)'
              const badgeBorder = isDeposit ? '#22c55e' : '#f97316'

              return (
                <div key={tx.id} className="pro-card row-item" style={{ borderRadius: '16px', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 1.5fr 1.5fr 2fr auto', gap: '15px', alignItems: 'center' }}>
                  
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '800', letterSpacing: '0.5px' }}>FECHA Y HORA</span>
                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>{tx.date}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '800', letterSpacing: '0.5px' }}>TIPO</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: badgeColor, backgroundColor: badgeBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${badgeBorder}`, display: 'inline-block', letterSpacing: '0.3px' }}>
                      {isDeposit ? '🟢 DEPÓSITO' : '🟠 RETIRO'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '800', letterSpacing: '0.5px' }}>CASA AFECTADA</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{tx.bookmaker}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '800', letterSpacing: '0.5px' }}>MONTO (PEN)</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: badgeColor }}>
                      {isDeposit ? `+S/ ${tx.amount.toFixed(2)}` : `-S/ ${tx.amount.toFixed(2)}`}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: '800', letterSpacing: '0.5px' }}>MÉTODO / NOTAS</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{tx.method}</span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="btn-interactive"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        padding: '7px 12px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                      title="Auditar y eliminar registro"
                    >
                      🗑️ Auditar
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

const selectStyle = {
  width: '100%',
  backgroundColor: 'rgba(7, 9, 14, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '11px 14px',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box'
}

const inputStyle = {
  width: '100%',
  backgroundColor: 'rgba(7, 9, 14, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '11px 14px',
  color: '#ffffff',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box'
}