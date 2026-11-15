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
    const { imageBase64, mimeType, sceneStyle, aspectRatio, customPrompt } = parseJsonBody<{
      imageBase64?: string;
      mimeType?: string;
      sceneStyle?: string;
      aspectRatio?: string;
      customPrompt?: string;
    }>(req.body);

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

    res.status(200).json({ imageDataUrl: generatedDataUrl });
  } catch (err) {
    const info = extractErrorDetails(err);
    res.status(info.status).json({ error: info.message, code: info.code });
  }
}
