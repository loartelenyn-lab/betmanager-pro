import { useState } from 'react'
import { supabase } from '../supabase/client'

export default function Calculators() {
  // Estado para controlar las pestañas activas ('implied', 'value', 'arbitrage')
  const [activeTab, setActiveTab] = useState('implied')

  // --- ESTADOS PESTAÑA 1: Probabilidad Implícita y Cuotas ---
  const [impliedOdd, setImpliedOdd] = useState('1.90')
  const [userRealProb, setUserRealProb] = useState('60')

  // Cálculos Pestaña 1
  const numericImpliedOdd = parseFloat(impliedOdd) || 0
  const impliedProbability = numericImpliedOdd > 0 ? (1 / numericImpliedOdd) * 100 : 0
  
  const numericUserProb = parseFloat(userRealProb) || 0
  const expectedValueEV = numericImpliedOdd > 0 && numericUserProb > 0 
    ? ((numericUserProb / 100) * numericImpliedOdd - 1) * 100 
    : 0

  // --- ESTADOS PESTAÑA 2: Apuestas de Valor (Value Bets) ---
  const [valueOdd, setValueOdd] = useState('2.10')
  const [valueProb, setValueProb] = useState('52')
  const [valueStake, setValueStake] = useState('100')

  // Cálculos Pestaña 2
  const nValueOdd = parseFloat(valueOdd) || 0
  const nValueProb = parseFloat(valueProb) || 0
  const nValueStake = parseFloat(valueStake) || 0
  
  const valImpliedProb = nValueOdd > 0 ? (1 / nValueOdd) * 100 : 0
  const valEVPercent = nValueOdd > 0 && nValueProb > 0 ? ((nValueProb / 100) * nValueOdd - 1) * 100 : 0
  const expectedProfit = nValueStake > 0 ? (nValueStake * (valEVPercent / 100)) : 0

  // --- ESTADOS PESTAÑA 3: Arbitraje / Surebets ---
  const [arbCapital, setArbCapital] = useState('500')
  const [arbOdd1, setArbOdd1] = useState('2.05')
  const [arbOdd2, setArbOdd2] = useState('2.10')

  // Cálculos Pestaña 3
  const nArbCap = parseFloat(arbCapital) || 0
  const nArb1 = parseFloat(arbOdd1) || 0
  const nArb2 = parseFloat(arbOdd2) || 0

  const invSum = (nArb1 > 0 ? 1 / nArb1 : 0) + (nArb2 > 0 ? 1 / nArb2 : 0)
  const isSurebet = invSum > 0 && invSum < 1
  const arbRoi = isSurebet ? ((1 - invSum) / invSum) * 100 : 0
  
  const stake1 = isSurebet && nArbCap > 0 ? nArbCap * ((1 / nArb1) / invSum) : 0
  const stake2 = isSurebet && nArbCap > 0 ? nArbCap * ((1 / nArb2) / invSum) : 0
  const guaranteedReturn = isSurebet ? (stake1 * nArb1) - nArbCap : 0

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
        @keyframes tabSlide {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
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
        }
        .tab-content {
          animation: tabSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .input-pro:focus {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.25) !important;
          background-color: rgba(15, 23, 42, 0.9) !important;
        }
        .tab-btn {
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .tab-btn:hover {
          color: #38bdf8;
        }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.5px' }}>
          Calculadoras Matemáticas Profesionales 🧮
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Herramientas de análisis avanzado para evaluar cuotas, calcular probabilidades implícitas y asegurar arbitraje.
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '28px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('implied')}
          className="tab-btn"
          style={{
            backgroundColor: activeTab === 'implied' ? '#2563eb' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'implied' ? '#ffffff' : '#94a3b8',
            border: activeTab === 'implied' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: '800',
            boxShadow: activeTab === 'implied' ? '0 0 20px rgba(37, 99, 235, 0.4)' : 'none'
          }}
        >
          📊 1. Probabilidad Implícita
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('value')}
          className="tab-btn"
          style={{
            backgroundColor: activeTab === 'value' ? '#2563eb' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'value' ? '#ffffff' : '#94a3b8',
            border: activeTab === 'value' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: '800',
            boxShadow: activeTab === 'value' ? '0 0 20px rgba(37, 99, 235, 0.4)' : 'none'
          }}
        >
          💎 2. Apuestas de Valor (Value Bets)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('arbitrage')}
          className="tab-btn"
          style={{
            backgroundColor: activeTab === 'arbitrage' ? '#2563eb' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'arbitrage' ? '#ffffff' : '#94a3b8',
            border: activeTab === 'arbitrage' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: '800',
            boxShadow: activeTab === 'arbitrage' ? '0 0 20px rgba(37, 99, 235, 0.4)' : 'none'
          }}
        >
          ⚖️ 3. Arbitraje / Surebets
        </button>
      </div>

      {activeTab === 'implied' && (
        <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
              Parámetros de Cuota
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
              Convierte cuotas decimales en porcentajes de probabilidad real de éxito.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                CUOTA DECIMAL
              </label>
              <input
                type="number"
                step="0.01"
                value={impliedOdd}
                onChange={(e) => setImpliedOdd(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 1.90"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                PROBABILIDAD REAL ESTIMADA POR TI (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={userRealProb}
                onChange={(e) => setUserRealProb(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 60"
              />
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                Opcional para calcular el Valor Esperado (EV).
              </span>
            </div>
          </div>

          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '20px' }}>
                Resultados del Análisis
              </h3>

              <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Probabilidad Implícita
                </span>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#38bdf8', marginTop: '6px', letterSpacing: '-0.5px' }}>
                  {impliedProbability.toFixed(2)}%
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: `1px solid ${expectedValueEV >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block' }}>VALOR ESPERADO (EV)</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Rentabilidad a largo plazo</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: expectedValueEV >= 0 ? '#4ade80' : '#f87171' }}>
                  {expectedValueEV >= 0 ? `+${expectedValueEV.toFixed(2)}%` : `${expectedValueEV.toFixed(2)}%`}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                <span>SEMAFORO DE VALOR</span>
                <span style={{ color: impliedProbability > 60 ? '#f87171' : '#4ade80' }}>
                  {impliedProbability > 60 ? 'Cuota Baja / Alta Probabilidad' : 'Cuota Alta / Oportunidad'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(impliedProbability, 100)}%`, height: '100%', backgroundColor: impliedProbability > 60 ? '#f97316' : '#22c55e', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'value' && (
        <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
              Parámetros de Value Bet
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
              Determina si una cuota es superior a la probabilidad real del evento.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                CUOTA DECIMAL DE LA CASA
              </label>
              <input
                type="number"
                step="0.01"
                value={valueOdd}
                onChange={(e) => setValueOdd(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 2.10"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                PROBABILIDAD ESTIMADA POR TI (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={valueProb}
                onChange={(e) => setValueProb(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 52"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                STAKE / MONTO A ARRIESGAR (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                value={valueStake}
                onChange={(e) => setValueStake(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 100"
              />
            </div>
          </div>

          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '20px' }}>
                Diagnóstico de Rentabilidad
              </h3>

              <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: `1px solid ${valEVPercent > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '16px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Expected Value (EV %)
                </span>
                <div style={{ fontSize: '32px', fontWeight: '900', color: valEVPercent > 0 ? '#4ade80' : '#f87171', marginTop: '6px' }}>
                  {valEVPercent > 0 ? `+${valEVPercent.toFixed(2)}%` : `${valEVPercent.toFixed(2)}%`}
                </div>
                <span style={{ fontSize: '11px', color: valEVPercent > 0 ? '#4ade80' : '#f87171', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                  {valEVPercent > 0 ? '✅ Value Bet Recomendada (Valor Positivo)' : '❌ Descartar (Sin Valor Matemático)'}
                </span>
              </div>

              <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block' }}>BENEFICIO ESPERADO TEÓRICO</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Ganancia estadística a largo plazo</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#38bdf8' }}>
                  {expectedProfit >= 0 ? `+S/ ${expectedProfit.toFixed(2)}` : `-S/ ${Math.abs(expectedProfit).toFixed(2)}`}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '12px', padding: '12px 16px', marginTop: '20px' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', display: 'block' }}>
                💡 Consejo Profesional:
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Solo realiza apuestas donde el EV sea superior al 2% para absorber la variación del mercado a largo plazo.
              </span>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'arbitrage' && (
        <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
              Parámetros de Surebet
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
              Distribuye capital entre cuotas desalineadas para asegurar ganancia neta libre de riesgo.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.5px' }}>
                CAPITAL TOTAL DISPONIBLE (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                value={arbCapital}
                onChange={(e) => setArbCapital(e.target.value)}
                style={inputStyle}
                className="input-pro"
                placeholder="Ej: 500"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                  CUOTA RESULTADO 1
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={arbOdd1}
                  onChange={(e) => setArbOdd1(e.target.value)}
                  style={inputStyle}
                  className="input-pro"
                  placeholder="Ej: 2.05"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                  CUOTA RESULTADO 2
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={arbOdd2}
                  onChange={(e) => setArbOdd2(e.target.value)}
                  style={inputStyle}
                  className="input-pro"
                  placeholder="Ej: 2.10"
                />
              </div>
            </div>
          </div>

          <div className="pro-card" style={{ borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  Desglose de Arbitraje
                </h3>
                <span style={{
                  backgroundColor: isSurebet ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: isSurebet ? '#4ade80' : '#f87171',
                  border: `1px solid ${isSurebet ? '#22c55e' : '#ef4444'}`,
                  padding: '5px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  {isSurebet ? `🟢 Surebet Rentable (+${arbRoi.toFixed(2)}%)` : '🔴 Sin Oportunidad de Arbitraje'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>APOSTAR EN CASA A</span>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#38bdf8' }}>
                    S/ {stake1.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>Cuota {arbOdd1}</span>
                </div>

                <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>APOSTAR EN CASA B</span>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#38bdf8' }}>
                    S/ {stake2.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>Cuota {arbOdd2}</span>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(7, 9, 14, 0.6)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block' }}>GANANCIA NETA GARANTIZADA</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Libre de riesgo (Sin importar el resultado)</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#4ade80' }}>
                  {isSurebet ? `+S/ ${guaranteedReturn.toFixed(2)}` : 'S/ 0.00'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Suma de inversas (Arbitrage Index): <span style={{ color: '#ffffff', fontWeight: '800' }}>{invSum.toFixed(4)}</span> {invSum < 1 ? '(< 1.0 = Ganancia)' : '(> 1.0 = Sin ganancia)'}
            </div>

          </div>

        </div>
      )}

    </div>
  )
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