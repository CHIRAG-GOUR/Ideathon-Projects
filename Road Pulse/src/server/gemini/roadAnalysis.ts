import 'server-only';

export interface RoadAnalysisResult {
  damageType: string;
  technicalTitle: string;
  severityLevel: 'high' | 'medium' | 'low';
  severityScore: number;
  dimensions: {
    estimatedDiameterCm: number;
    depthCategory: 'shallow_under_3cm' | 'moderate_3_to_7cm' | 'deep_over_7cm' | 'severe_subbase_failure';
    depthDescription: string;
  };
  safetyHazards: string[];
  surfaceType: string;
  trafficRisk: string;
  recommendedRepair: string;
  legalUrgencySummary: string;
}

export async function analyzeRoadHazardWithGemini(imageBase64: string): Promise<RoadAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const systemInstruction = `You are a Chief Highway & Municipal Pavement Structural Engineer specializing in IRC (Indian Roads Congress) standards, asphalt distress analysis, and municipal road safety diagnostics.
Analyze the provided road image accurately and produce a precise, rigorous engineering assessment.

Return a valid JSON object matching this schema:
{
  "damageType": "deep_pothole" | "edge_breakout" | "alligator_cracking" | "asphalt_rutting" | "subsidence_depression" | "cavity_with_exposed_aggregate",
  "technicalTitle": string (e.g. "Severe Impact Cavity with Subgrade Layer Exposure"),
  "severityLevel": "high" | "medium" | "low",
  "severityScore": number (0 to 100),
  "dimensions": {
    "estimatedDiameterCm": number,
    "depthCategory": "shallow_under_3cm" | "moderate_3_to_7cm" | "deep_over_7cm" | "severe_subbase_failure",
    "depthDescription": string (e.g. "5 to 8 cm sharp-edged depression capable of destabilizing two-wheelers")
  },
  "safetyHazards": string[] (list 2 to 4 concrete physical hazards, e.g. "Immediate risk of two-wheeler handle toss & rider ejection", "Water retention concealing void geometry", "Rim deformation & steering deviation for light motor vehicles"),
  "surfaceType": string (e.g. "Dense Bituminous Macadam (DBM) / Asphalt"),
  "trafficRisk": string (e.g. "Critical arterial carriage-way hazard requiring urgent barricading"),
  "recommendedRepair": string (e.g. "Square box-cut, tack coat emulsion application, and compacted hot/cold mix asphalt filling"),
  "legalUrgencySummary": string (1-2 sentences establishing statutory urgency under Section 133 CrPC / Municipal Roads Act)
}`;

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Analyze this road photograph for pavement distress, structural pothole geometry, physical dimensions, and traffic hazards according to Indian road standards:' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Gemini Analysis] HTTP Error:', res.status, errText);
    throw new Error(`Gemini analysis request failed with status ${res.status}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini did not return analysis candidates.');
  }

  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned) as RoadAnalysisResult;
  return parsed;
}
