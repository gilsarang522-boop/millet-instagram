import { Type, ThinkingLevel } from '@google/genai';
import {
  extractErrorDetails,
  getAiClient,
  parseJsonBody,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../_lib/gemini';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { imageBase64, mimeType, categoryHint } = parseJsonBody<{
      imageBase64?: string;
      mimeType?: string;
      categoryHint?: string;
    }>(req.body);

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: '분석할 사진 데이터가 필요합니다.' });
      return;
    }

    const ai = getAiClient();
    const promptText = [
      '당신은 대한민국 김포시 아웃도어 전문 매장 "밀레김포모아점"의 비주얼 머천다이저이자 인스타그램 사진 보정 전문가입니다.',
      '직원이 매장에서 스마트폰으로 찍은 아웃도어 제품 사진을 분석하여, 촬영 실력이 다소 부족하더라도 인스타그램 피드에서 돋보이도록 보정값과 이미지 내 짧은 타이틀 문구를 추천해 주세요.',
      categoryHint ? `참고 품목 힌트: ${categoryHint}` : '',
      '',
      '다음 기준을 지켜 JSON으로만 응답하세요:',
      '- detectedCategory: 의류면 "apparel", 신발/등산화면 "footwear", 배낭/스틱/모자/용품이면 "gear"',
      '- detectedProduct: 사진 속 제품 특징을 담은 짧은 한국어 제품명 (예: "고어텍스 방수 하드쉘 자켓", "비브람창 미드컷 등산화")',
      '- recommendedPreset: "clean-store" | "alpine-crisp" | "trail-warm" | "studio-deep" | "outdoor-film" 중 가장 잘 어울리는 1개',
      '- suggestedAdjustments: 매장 실내 형광등/어두운 그림자를 보정하고 제품 색감을 살리는 수치',
      '  * brightness (-25 ~ 35): 어두운 사진이면 +10~+25 추천',
      '  * contrast (-15 ~ 35): 흐릿한 매장 사진이면 +8~+22 추천',
      '  * saturation (-15 ~ 30): 원단 컬러가 죽어있으면 +6~+18 추천',
      '  * warmth (-25 ~ 25): 누런 조명이면 -5~-15, 차갑거나 칙칙하면 +5~+15 추천',
      '  * sharpness (0 ~ 50): 제품 질감을 살리도록 12~30 추천',
      '  * vignette (0 ~ 45): 주변 배경 산만함을 줄이고 제품에 시선이 모이도록 15~32 추천',
      '- retouchReason: 어떤 조명/구도 아쉬움을 어떻게 보정했는지 매장 직원에게 친절히 설명하는 1~2문장 한국어',
      '- suggestedHeadline: 인스타그램 사진 위에 올릴 강렬하고 간결한 한국어 헤드라인 (공백 포함 16자 이내)',
      '- suggestedSubcopy: 헤드라인 아래에 들어갈 짧은 보조 문구 (공백 포함 24자 이내, 예: "밀레김포모아점 신상 입고 · 방수 투습")',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCategory: { type: Type.STRING },
            detectedProduct: { type: Type.STRING },
            recommendedPreset: { type: Type.STRING },
            suggestedAdjustments: {
              type: Type.OBJECT,
              properties: {
                brightness: { type: Type.NUMBER },
                contrast: { type: Type.NUMBER },
                saturation: { type: Type.NUMBER },
                warmth: { type: Type.NUMBER },
                sharpness: { type: Type.NUMBER },
                vignette: { type: Type.NUMBER },
              },
              required: ['brightness', 'contrast', 'saturation', 'warmth', 'sharpness', 'vignette'],
            },
            retouchReason: { type: Type.STRING },
            suggestedHeadline: { type: Type.STRING },
            suggestedSubcopy: { type: Type.STRING },
          },
          required: [
            'detectedCategory',
            'detectedProduct',
            'recommendedPreset',
            'suggestedAdjustments',
            'retouchReason',
            'suggestedHeadline',
            'suggestedSubcopy',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.status(200).json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
}
