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
    } = parseJsonBody<{
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
    }>(req.body);

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
    res.status(200).json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
}
