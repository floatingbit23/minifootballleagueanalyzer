import { useState, useRef, useEffect } from 'react';
import './ChatbotWidget.css';

// Preguntas predefinidas que el usuario puede hacer
const PRESET_QUESTIONS = [
  '¿Qué es el ranking ELO?',
  '¿Por qué no coincide el ranking ELO con la clasificación por puntos?',
  '¿Qué es el xG?',
  '¿Cuál es el mejor equipo de esta división?',
  '¿Cuál es el peor equipo de esta división?',
  '¿Qué equipo tiene menos puntos ELO de todas las ligas?',
  '¿Cuál es el mejor equipo de todas las ligas?',
  '¿Qué equipo ha tenido peor rendimiento las últimas 5 jornadas?',
  '¿Qué equipo ha tenido mejor rendimiento las últimas 5 jornadas?',
];

// Contextos de liga disponibles
const LEAGUE_CONTEXTS = [
  { key: 'prim_div_mur', label: '1ª Murcia' },
  { key: 'seg_div_murA', label: '2ªA Murcia' },
  { key: 'seg_div_murB', label: '2ªB Murcia' },
  { key: 'ter_div_murA', label: '3ªA Murcia' },
  { key: 'ter_div_murB', label: '3ªB Murcia' },
  { key: 'cuar_div_mur', label: '4ª Murcia' },
  { key: 'prim_div_gra', label: '1ª Granada' },
  { key: 'seg_div_gra', label: '2ª Granada' },
  { key: 'veteranos_gra', label: 'Vet. Granada' },
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola! Soy el analista de la MiniFootball League 🟢 Selecciona una pregunta para empezar.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [activeContext, setActiveContext] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function askQuestion(question) {
    if (loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: activeContext }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer || data.error || 'Sin respuesta.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error de conexión. Inténtalo de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setActiveContext(null);
    setMessages([
      {
        role: 'assistant',
        text: '¡Hola! Soy el analista de la MiniFootball League 🟢 Selecciona una pregunta para empezar.',
      },
    ]);
  }

  function toggleContext(key) {
    setActiveContext((prev) => (prev === key ? null : key));
  }

  return (
    <>
      {/* Ventana del chat */}
      <div className={`chatbot-window ${isOpen ? 'chatbot-window--open' : ''}`}>
        {/* Header del chat */}
        <div className="chatbot-header">
          <div className="chatbot-header__info">
            <div className="chatbot-header__avatar">
              <span>⚽</span>
            </div>
            <div>
              <p className="chatbot-header__title">Analista MFL</p>
              <p className="chatbot-header__subtitle">Powered by Gemini</p>
            </div>
          </div>
          <div className="chatbot-header__actions">
            <button
              className="chatbot-header__btn"
              onClick={handleReset}
              title="Reiniciar chat"
              aria-label="Reiniciar chat"
            >
              ↺
            </button>
            <button
              className="chatbot-header__btn"
              onClick={() => setIsOpen(false)}
              title="Cerrar"
              aria-label="Cerrar chatbot"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chatbot-bubble chatbot-bubble--${msg.role}`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="chatbot-bubble chatbot-bubble--assistant chatbot-bubble--loading">
              <span /><span /><span />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preguntas predefinidas */}
        <div className="chatbot-presets">
          <p className="chatbot-presets__label">Preguntas rápidas</p>
          <div className="chatbot-presets__grid">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                className="chatbot-preset-btn"
                onClick={() => askQuestion(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de contexto de liga */}
        <div className="chatbot-context">
          <p className="chatbot-presets__label">
            Elige liga para preguntar por ella
            {activeContext && (
              <span className="chatbot-context__active-label">
                {' '}· {LEAGUE_CONTEXTS.find(l => l.key === activeContext)?.label}
              </span>
            )}
          </p>
          <div className="chatbot-context__chips">
            {LEAGUE_CONTEXTS.map(({ key, label }) => (
              <button
                key={key}
                className={`chatbot-context__chip ${activeContext === key ? 'chatbot-context__chip--active' : ''}`}
                onClick={() => toggleContext(key)}
                title={activeContext === key ? 'Quitar filtro de liga' : `Filtrar por ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        className={`chatbot-fab ${isOpen ? 'chatbot-fab--open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Cerrar chatbot' : 'Abrir chatbot'}
      >
        <span className="chatbot-fab__icon chatbot-fab__icon--chat">⚽</span>
        <span className="chatbot-fab__icon chatbot-fab__icon--close">✕</span>
      </button>
    </>
  );
}
