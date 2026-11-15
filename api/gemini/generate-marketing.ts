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
    const { imageBase64, mimeType, category, productName, answers, extraNotes, tone } =
      parseJsonBody<{
        imageBase64?: string;
        mimeType?: string;
        category?: string;
        productName?: string;
        answers?: Array<{ question: string; answer: string }>;
        extraNotes?: string;
        tone?: string;
      }>(req.body);

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
    res.status(200).json(parsed);
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
}
