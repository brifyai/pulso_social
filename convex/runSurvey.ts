"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Función para obtener el cliente de OpenAI (lazy initialization)
function getOpenAI() {
  const { default: OpenAI } = require("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada. Configúrala en el dashboard de Convex.");
  }
  return new OpenAI({ apiKey });
}

// LA ACCIÓN PRINCIPAL: Corre la encuesta sobre todos los agentes
export const runSurvey = action({
  args: { surveyId: v.id("surveys") },
  handler: async (ctx, args): Promise<string> => {
    // A. Obtenemos la encuesta y los agentes usando las queries existentes
    const survey = await ctx.runQuery(api['pulso/index'].getSurvey, { id: args.surveyId });
    const agents = await ctx.runQuery(api['pulso/index'].listPanelAgents);

    if (!survey) {
      throw new Error("Encuesta no encontrada");
    }

    console.log(`🚀 Iniciando encuesta "${survey.question}" para ${agents.length} agentes...`);

    const openai = getOpenAI();

    // B. Iteramos sobre cada agente
    for (const agent of agents) {
      // Construimos el prompt "chileno"
      const prompt = `
Eres ${agent.name}, un ciudadano chileno de ${agent.age} años.
Vives en ${agent.comuna} (${agent.region}) y perteneces al GSE ${agent.gse}.

Tus intereses son: ${agent.interests.join(", ")}.
Tu tendencia política es: ${agent.politicalLeaning > 50 ? "de derecha" : agent.politicalLeaning < -50 ? "de izquierda" : "de centro"}.

CONTEXTO ACTUAL:
${survey.context || "No hay contexto adicional."}

PREGUNTA DE ENCUESTA:
"${survey.question}"

OPCIONES DISPONIBLES:
${survey.options.join(", ")}

INSTRUCCIONES:
1. Analiza la pregunta desde tu perspectiva socioeconómica y etaria.
2. Elige UNA opción exacta de la lista.
3. Da una razón breve (máx 20 palabras) usando modismos chilenos sutiles si aplica.

Responde SOLO en formato JSON:
{
  "choice": "Opción elegida exacta",
  "reason": "Tu justificación corta"
}
`;

      try {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
          response_format: { type: "json_object" },
        });

        const responseContent = completion.choices[0].message.content;
        const parsed = JSON.parse(responseContent || "{}");

        // Validar que la opción elegida sea válida
        if (!survey.options.includes(parsed.choice)) {
          console.warn(`⚠️ Opción inválida para ${agent.name}: ${parsed.choice}`);
          continue;
        }

        // C. Guardamos el voto usando la mutation de pulso
        await ctx.runMutation(internal['pulso/index'].saveSurveyVote, {
          surveyId: args.surveyId,
          playerId: agent.playerId,
          playerName: agent.name,
          response: parsed.choice,
          reason: parsed.reason,
        });

        console.log(`✅ Voto registrado: ${agent.name} -> ${parsed.choice}`);

      } catch (error) {
        console.error(`❌ Error con agente ${agent.name}:`, error);
      }
    }

    // D. Marcar encuesta como terminada
    await ctx.runMutation(internal['pulso/index'].completeSurvey, { surveyId: args.surveyId });
    return "Encuesta finalizada exitosamente.";
  },
});