import { GoogleGenAI } from '@google/genai';

export interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

export interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (data: unknown) => void;
}

export function parseJsonBody<T>(body: unknown): T {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  return (body ?? {}) as T;
}

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정에서 GEMINI_API_KEY를 추가해 주세요.');
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

export function extractErrorDetails(err: unknown): { status: number; code: string; message: string } {
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
        'AI 배경 재촬영 모델은 결제가 연결된 유료 등급 API 키가 필요합니다. 기본 사진 자동 보정·필터·프레임 합성·인스타 문구·해시태그 생성은 결제 없이 바로 이용하실 수 있습니다.',
    };
  }

  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('api_key_invalid')) {
    return {
      status: 403,
      code: 'API_KEY_ERROR',
      message: 'API 키 권한을 확인할 수 없습니다. Vercel 환경 변수(GEMINI_API_KEY)를 확인해 주세요.',
    };
  }

  return {
    status: 500,
    code: 'AI_REQUEST_FAILED',
    message: raw || '요청을 처리하는 중 문제가 발생했습니다.',
  };
}
