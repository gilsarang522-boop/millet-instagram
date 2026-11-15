import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorDetails(err: unknown): { status: number; code: string; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('paid')
  ) {
    return {
      status: 402,
      code: 'PAID_KEY_REQUIRED',
      message:
        'AI 배경 재촬영 모델은 결제가 연결된 유료 등급 API 키가 필요합니다. 기본 사진 자동 보정·필터·프레임 합성·인스타 문구 생성은 결제 없이 바로 이용하실 수 있습니다.',
    };
  }

  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('api_key_invalid')) {
    return {
      status: 403,
      code: 'API_KEY_ERROR',
      message: 'API 키 권한을 확인할 수 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
    };
  }

  return {
    status: 500,
    code: 'AI_REQUEST_FAILED',
    message: raw || '요청을 처리하는 중 문제가 발생했습니다.',
  };
}

const app = express();
app.use(express.json({ limit: '25mb' }));

app.post('/api/gemini/analyze-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, categoryHint } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      categoryHint?: string;
    };

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
    res.json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
});

app.post('/api/gemini/generate-marketing', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, category, productName, answers, extraNotes, tone } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      category?: string;
      productName?: string;
      answers?: Array<{ question: string; answer: string }>;
      extraNotes?: string;
      tone?: string;
    };

    const ai = getAiClient();

    const categoryLabel =
      category === 'apparel'
        ? '아웃도어 의류 (자켓·다운·플리스·팬츠 등)'
        : category === 'footwear'
          ? '등산화 · 트레킹화 · 아웃도어 신발'
          : '등산 장비 · 배낭 · 스틱 · 아웃도어 용품';

    const answerSummary = (answers ?? [])
      .filter((a) => a.answer && a.answer.trim().length > 0)
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join('\n');

    const promptText = [
      '당신은 아웃도어 전문 매장 "밀레김포모아점"의 인스타그램 마케팅 전담 에디터입니다.',
      '매장 직원이 선택한 제품 품목과 질문 답변을 바탕으로, 고객의 발길을 사로잡는 인스타그램 홍보 문구와 이미지용 타이틀을 작성해 주세요.',
      imageBase64 ? '첨부된 제품 사진의 색상, 디자인, 소재감도 자연스럽게 문구에 녹여주세요.' : '',
      '',
      `[매장명] 밀레김포모아점`,
      `[품목 분류] ${categoryLabel}`,
      productName ? `[제품명/모델] ${productName}` : '',
      tone ? `[원하는 분위기/톤] ${tone}` : '',
      answerSummary ? `[강조 포인트 질문 답변]\n${answerSummary}` : '',
      extraNotes ? `[추가 전달 사항 (가격/이벤트/매장안내)]\n${extraNotes}` : '',
      '',
      '작성 지침:',
      '1. overlaySuggestions: 이미지 카드 위에 얹을 수 있는 간결한 헤드라인(15자 이내)과 서브카피(24자 이내) 조합 3가지',
      '2. captions: 바로 복사해서 인스타그램에 올릴 수 있는 본문 3가지 스타일',
      '   - 첫 번째: "감성 아웃도어형" (계절감, 산행의 설렘, 라이프스타일 공감)',
      '   - 두 번째: "기능·스펙 강조형" (원단, 접지력, 내구성 등 제품 강점 중심)',
      '   - 세 번째: "매장 방문·혜택 유도형" (밀레김포모아점 직접 착용/피팅/상담 권유, 친근한 매장 소식)',
      '   * 각 본문은 가독성 좋은 줄바꿈과 적절한 아웃도어 이모지를 사용하고, 과장되지 않으면서 신뢰감 있는 한국어 매장 톤으로 작성하세요.',
      '3. hashtags: #밀레김포모아점 #김포아웃도어 #밀레 등을 포함하여 검색 유입에 유리한 한국어 해시태그 15개 (각 항목은 #으로 시작)',
      '4. postingTip: 이 제품을 인스타그램에 올릴 때 매장 상담·방문 전환율을 높이는 실전 팁 1문장',
    ]
      .filter(Boolean)
      .join('\n');

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overlaySuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  subcopy: { type: Type.STRING },
                },
                required: ['headline', 'subcopy'],
              },
            },
            captions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  style: { type: Type.STRING },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                },
                required: ['style', 'title', 'body', 'cta'],
              },
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            postingTip: { type: Type.STRING },
          },
          required: ['overlaySuggestions', 'captions', 'hashtags', 'postingTip'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
});

app.post('/api/gemini/generate-hashtags', async (req: Request, res: Response) => {
  try {
    const {
      imageBase64,
      mimeType,
      category,
      productName,
      overlayHeadline,
      overlaySubcopy,
      overlayBadgeText,
      answers,
      selectedCaptionBody,
      hashtagStrategy,
    } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      category?: string;
      productName?: string;
      overlayHeadline?: string;
      overlaySubcopy?: string;
      overlayBadgeText?: string;
      answers?: Array<{ question: string; answer: string }>;
      selectedCaptionBody?: string;
      hashtagStrategy?: string;
    };

    const ai = getAiClient();

    const categoryLabel =
      category === 'apparel'
        ? '아웃도어 의류'
        : category === 'footwear'
          ? '등산화 · 신발'
          : '등산 장비 · 용품';

    const answerLines = (answers ?? [])
      .filter((a) => a.answer && a.answer.trim().length > 0)
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join('\n');

    const strategyGuide =
      hashtagStrategy === 'local'
        ? '김포시(김포한강신도시, 구래동, 장기동, 운양동, 풍무동, 사우동) 및 근교 산행(문수산, 계양산, 강화 마니산) 고객의 매장 방문 유입용 지역 해시태그 비중을 높여주세요.'
        : hashtagStrategy === 'search'
          ? '실제 인스타그램에서 제품명, 기능성 소재(고어텍스, 비브람 등), 등산 장비 검색 시 상위 노출에 유리한 구체적 제품/스펙 해시태그 비중을 높여주세요.'
          : '밀레김포모아점 지역 유입 태그 + 브랜드/제품 핵심 태그 + 아웃도어 라이프스타일 태그를 균형 있게 구성해 주세요.';

    const promptText = [
      '당신은 "밀레김포모아점" 인스타그램 마케팅 해시태그 전략가입니다.',
      '지금까지 편집한 사진, 이미지 위 문구, 품목 질문 답변, 완성된 본문 내용을 종합하여 인스타그램에 바로 복사해 붙여넣을 최적의 해시태그 세트를 생성해 주세요.',
      '',
      `[품목] ${categoryLabel}`,
      productName ? `[제품명] ${productName}` : '',
      overlayHeadline ? `[이미지 헤드라인] ${overlayHeadline}` : '',
      overlaySubcopy ? `[이미지 보조문구] ${overlaySubcopy}` : '',
      overlayBadgeText ? `[이미지 강조태그] ${overlayBadgeText}` : '',
      answerLines ? `[질문 답변]\n${answerLines}` : '',
      selectedCaptionBody ? `[작성된 인스타 본문]\n${selectedCaptionBody}` : '',
      `[해시태그 전략] ${strategyGuide}`,
      '',
      '규칙:',
      '- 모든 해시태그는 반드시 #으로 시작하고 띄어쓰기 없이 작성하세요 (예: #밀레김포모아점).',
      '- 중복 태그 없이 3개 그룹으로 나누어 생성하세요:',
      '  1. storeAndLocal (5~6개): #밀레김포모아점 필수 포함, 김포·근교 아웃도어 매장 방문 유입 태그',
      '  2. brandAndProduct (6~7개): #밀레 필수 포함, 사진 속 제품 특징/소재/기능 관련 검색 태그',
      '  3. activityAndSeason (6~7개): 산행, 계절, 아웃도어 코디·커뮤니티 유입 태그',
      '- tip: 생성된 해시태그 조합이 왜 효과적인지 1문장 한국어 조언',
    ]
      .filter(Boolean)
      .join('\n');

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeAndLocal: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            brandAndProduct: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            activityAndSeason: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tip: { type: Type.STRING },
          },
          required: ['storeAndLocal', 'brandAndProduct', 'activityAndSeason', 'tip'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
});

app.post('/api/gemini/reimagine-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, sceneStyle, aspectRatio, customPrompt } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      sceneStyle?: string;
      aspectRatio?: string;
      customPrompt?: string;
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: '원본 사진이 필요합니다.' });
      return;
    }

    const scenePrompts: Record<string, string> = {
      'clean-studio':
        'Place the exact outdoor product from this photo in a bright minimalist commercial photography studio with a clean warm limestone pedestal, soft diffused side lighting, crisp shadows, no cluttered store background, 8k e-commerce lookbook quality. Keep the product color, logo, and details completely faithful.',
      'alpine-ridge':
        'Keep the exact outdoor product from this photo intact and place it naturally on a scenic rocky alpine mountain overlook with crisp morning sunlight, subtle distant peaks, shallow depth of field, high-end Millet outdoor campaign photography.',
      'forest-trail':
        'Keep the exact outdoor product from this photo completely faithful and restage it in a sunlit Korean mountain forest trail setting with natural wood and moss textures, warm golden hour sunlight filtering through trees, editorial outdoor photography.',
      'wooden-chalet':
        'Keep the exact outdoor product from this photo faithful and display it neatly in a warm architectural alpine wood and slate boutique showroom with soft museum-grade spotlighting and clean negative space.',
    };

    const chosenScene = scenePrompts[sceneStyle ?? 'clean-studio'] ?? scenePrompts['clean-studio'];
    const finalPrompt = [chosenScene, customPrompt ? `Additional direction: ${customPrompt}` : '']
      .filter(Boolean)
      .join(' ');

    const mappedRatio = aspectRatio === '4:5' ? '3:4' : aspectRatio === '9:16' ? '9:16' : '1:1';

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: finalPrompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: mappedRatio,
        },
      },
    });

    let generatedDataUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType ?? 'image/png';
        generatedDataUrl = `data:${outMime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedDataUrl) {
      res.status(500).json({ error: '이미지를 생성하지 못했습니다. 다시 시도해 주세요.' });
      return;
    }

    res.json({ imageDataUrl: generatedDataUrl });
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Millet Gimpo Moa Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
