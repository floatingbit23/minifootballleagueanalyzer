import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Carga los rankings ELO desde el archivo público de la propia app */
async function loadEloRankings(req) {
  try {
    // Construye la URL base a partir del host de la request de Vercel
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const url = `${proto}://${host}/elo_rankings.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Formatea los rankings ELO como texto plano para el prompt */
function formatEloContext(rankings) {
  if (!rankings) return "No hay datos ELO disponibles.";

  const divisionLabels = {
    prim_div_mur: "1ª División Murciana",
    seg_div_murA: "2ª División Murciana – Grupo A",
    seg_div_murB: "2ª División Murciana – Grupo B",
    ter_div_murA: "3ª División Murciana – Grupo A",
    ter_div_murB: "3ª División Murciana – Grupo B",
    cuar_div_mur: "4ª División Murciana",
    prim_div_gra: "1ª División de Granada",
    seg_div_gra: "2ª División de Granada",
    veteranos_gra: "Liga Veteranos (+35) de Granada",
  };

  return Object.entries(rankings)
    .map(([key, equipos]) => {
      const label = divisionLabels[key] || key;
      const rows = equipos
        .map((e) => `  ${e.posicion}. ${e.equipo} — ELO: ${e.puntos} (Tendencia últ. 5 jornadas: ${e.tendencia > 0 ? "+" : ""}${e.tendencia})`)
        .join("\n");
      return `### ${label}\n${rows}`;
    })
    .join("\n\n");
}

// ── Preguntas predefinidas permitidas ─────────────────────────────────────
const ALLOWED_TOPICS = [
  "mejor equipo",
  "ranking",
  "elo",
  "quien lidera",
  "líder",
  "lider",
  "primera división",
  "segunda división",
  "tercera división",
  "cuarta división",
  "forma",
  "estado de forma",
  "subida",
  "bajada",
  "puntos",
  "equipo más fuerte",
  "comparar",
  "comparación",
  "división",
  "clasificación",
  "top",
  "xg",
  "goles esperados",
  "peor equipo",
  "más débil",
  "últimas jornadas",
  "rendimiento",
  "tendencia",
];

function isAllowedQuestion(question) {
  const q = question.toLowerCase();
  return ALLOWED_TOPICS.some((topic) => q.includes(topic));
}

// ── Handler principal ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { question, context } = req.body ?? {};

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Debes enviar el campo 'question' con tu pregunta." });
  }

  if (!isAllowedQuestion(question)) {
    return res.status(200).json({
      answer:
        "Solo puedo responder preguntas sobre rankings ELO, divisiones y estado de forma de los equipos de la MiniFootball League (Murcia y Granada). ¿Tienes alguna pregunta sobre esos temas?",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor." });
  }

  // Carga datos ELO
  const rankings = await loadEloRankings(req);
  const eloContext = formatEloContext(rankings);

  // Contexto de liga activo (opcional)
  const DIVISION_LABELS = {
    prim_div_mur: "1ª División Murciana",
    seg_div_murA: "2ª División Murciana – Grupo A",
    seg_div_murB: "2ª División Murciana – Grupo B",
    ter_div_murA: "3ª División Murciana – Grupo A",
    ter_div_murB: "3ª División Murciana – Grupo B",
    cuar_div_mur: "4ª División Murciana",
    prim_div_gra: "1ª División de Granada",
    seg_div_gra: "2ª División de Granada",
    veteranos_gra: "Liga Veteranos (+35) de Granada",
  };
  const activeLeague = context && DIVISION_LABELS[context] ? DIVISION_LABELS[context] : null;
  const contextInstruction = activeLeague
    ? `\n## Contexto activo\nEl usuario ha seleccionado la liga: **${activeLeague}**. Centra tu respuesta en esa liga salvo que el usuario pregunte explícitamente por otra.`
    : "";

  // Construye el prompt con el contexto de la skill league-data-analyst
  const systemPrompt = `Eres un analista experto de la MiniFootball League (minifootballleagues.com), cubriendo las ligas de Murcia y Granada.
Tu función es responder preguntas de los usuarios sobre rankings ELO, divisiones, estado de forma de los equipos y xG.

## Conceptos Clave
- **ELO**: Mide el estado de forma. Parte de 1500. Subir puntos ELO significa que el equipo está superando las expectativas.
- **Tendencia (últ. 5 jornadas)**: Indica cuántos puntos ELO ha ganado o perdido el equipo recientemente. Un valor positivo alto (ej: +80) indica un rendimiento excelente ("on fire"). Un valor negativo (ej: -40) indica una mala racha ("peor rendimiento").
- **xG (Goles Esperados)**: Mide la calidad de las ocasiones creadas. En este sistema, un equipo con ELO alto tiene mayor xG proyectado. Si te preguntan "¿Qué es el xG?", explícalo como la probabilidad de que un tiro sea gol.

## Datos actuales de rankings ELO por división
${eloContext}${contextInstruction}

## Instrucciones de Respuesta
- No saludes ni digas que eres un analista experto. Límitate a responder la pregunta.
- Responde SIEMPRE en español.
- No uses formato Markdown (sin negritas, sin encabezados #). Responde como si fuera un chat de WhatsApp/Telegram.
- Sé conciso y amigable.
- Si te preguntan por el mejor o peor equipo de TODAS las ligas, compara los puntos ELO de todos los grupos.
- Si te preguntan por el rendimiento de las "últimas jornadas", usa SIEMPRE el dato de "Tendencia". El equipo con peor rendimiento es el que tiene la tendencia más negativa.
- No inventes datos que no estén en el contexto.
- Busca información en Wikipedia si es necesario.
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Pregunta del usuario: ${question.trim()}` },
    ]);

    const answer = result.response.text();
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("Error llamando a Gemini:", err);
    return res.status(500).json({
      error: "Error al consultar la IA. Inténtalo de nuevo más tarde.",
    });
  }
}
