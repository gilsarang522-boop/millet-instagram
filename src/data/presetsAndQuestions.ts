import type {
  CategoryQuestion,
  PhotoAdjustments,
  PresetId,
  ProductCategory,
  SamplePhoto,
} from '../types/studio';
import sampleJacketImg from '../assets/images/sample_millet_jacket_1794751243637.jpg';
import sampleBootsImg from '../assets/images/sample_hiking_boots_1794751243776.jpg';
import samplePackImg from '../assets/images/sample_trekking_pack_1794751243188.jpg';

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  sharpness: 0,
  vignette: 0,
};

export interface StudioPreset {
  id: PresetId;
  name: string;
  description: string;
  swatch: string;
  adjustments: PhotoAdjustments;
}

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: 'original',
    name: '원본',
    description: '보정 없는 원본 상태',
    swatch: '#9CA3AF',
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  },
  {
    id: 'clean-store',
    name: '매장조명 보정',
    description: '형광등·그림자 정리, 또렷한 화이트',
    swatch: '#E5E7EB',
    adjustments: {
      brightness: 12,
      contrast: 14,
      saturation: 6,
      warmth: -6,
      sharpness: 20,
      vignette: 14,
    },
  },
  {
    id: 'alpine-crisp',
    name: '알파인 선명',
    description: '테크니컬 원단 질감과 산악 쿨톤',
    swatch: '#3B82F6',
    adjustments: {
      brightness: 6,
      contrast: 22,
      saturation: 10,
      warmth: -10,
      sharpness: 30,
      vignette: 22,
    },
  },
  {
    id: 'trail-warm',
    name: '트레일 웜',
    description: '가을·겨울 아웃도어에 어울리는 온기',
    swatch: '#D97706',
    adjustments: {
      brightness: 8,
      contrast: 14,
      saturation: 12,
      warmth: 16,
      sharpness: 18,
      vignette: 18,
    },
  },
  {
    id: 'studio-deep',
    name: '스튜디오 딥',
    description: '어두운 대비로 제품 컬러 집중',
    swatch: '#1F2937',
    adjustments: {
      brightness: -4,
      contrast: 26,
      saturation: 14,
      warmth: -2,
      sharpness: 26,
      vignette: 34,
    },
  },
  {
    id: 'outdoor-film',
    name: '아웃도어 필름',
    description: '부드러운 룩북 감성 톤',
    swatch: '#10B981',
    adjustments: {
      brightness: 6,
      contrast: 8,
      saturation: -6,
      warmth: 8,
      sharpness: 12,
      vignette: 20,
    },
  },
];

export const CATEGORY_LABELS: Record<ProductCategory, { label: string; sub: string }> = {
  apparel: {
    label: '아웃도어 의류',
    sub: '자켓 · 패딩 · 플리스 · 팬츠',
  },
  footwear: {
    label: '등산화 · 신발',
    sub: '중등산화 · 트레킹화 · 방한화',
  },
  gear: {
    label: '등산 장비 · 용품',
    sub: '배낭 · 스틱 · 모자 · 장갑 · 아이젠',
  },
};

export const CATEGORY_QUESTIONS: Record<ProductCategory, CategoryQuestion[]> = {
  apparel: [
    {
      id: 'season_situation',
      question: '1. 어떤 계절이나 산행/일상 상황에 가장 추천하나요?',
      placeholder: '예: 간절기 바람막이, 한겨울 설산 보온, 출퇴근 겸용 고프코어룩',
      quickOptions: ['간절기 바람막이·우천 대비', '한겨울 한파·설산 보온', '가벼운 둘레길·일상 겸용', '사계절 레이어링'],
    },
    {
      id: 'feature_material',
      question: '2. 가장 강조하고 싶은 소재나 핵심 기능은 무엇인가요?',
      placeholder: '예: 고어텍스 완벽 방수·투습, 구스다운 초경량, 사방 스트레치 활동성',
      quickOptions: ['고어텍스 방수·방풍·투습', '초경량 프리미엄 구스다운', '신축성 좋은 스트레치 원단', '땀 배출·속건 기능성'],
    },
    {
      id: 'fit_color',
      question: '3. 핏감이나 컬러 포인트 중 고객이 좋아할 요소는?',
      placeholder: '예: 활동하기 편한 세미 루즈핏, 산에서 눈에 띄는 레드 포인트',
      quickOptions: ['슬림하고 날씬해 보이는 핏', '트렌디한 세미 오버핏', '화사한 포인트 컬러감', '커플·부부 등산 시밀러룩'],
    },
    {
      id: 'store_offer',
      question: '4. 밀레김포모아점만의 매장 혜택이나 재고 안내가 있나요?',
      placeholder: '예: 신상 20% 시즌오프, 남녀 사이즈 전량 입고, 매장 방문 입어보기 추천',
      quickOptions: ['신상 프로모션 할인 중', '인기 사이즈 재고 입고 완료', '매장 방문 무료 피팅·코디 추천', '세트 구매 시 추가 혜택'],
    },
  ],
  footwear: [
    {
      id: 'trail_type',
      question: '1. 주로 어떤 산행 코스나 지형에 잘 맞는 신발인가요?',
      placeholder: '예: 북한산·계양산 바위길, 장거리 종주 산행, 가벼운 트레킹',
      quickOptions: ['바위·돌길 많은 국내 산악용', '가벼운 둘레길·트레킹', '장거리 산행·발목 보호용', '눈길·겨울철 방한·방수'],
    },
    {
      id: 'sole_tech',
      question: '2. 가장 자랑하고 싶은 착화감이나 아웃솔 기술은?',
      placeholder: '예: 비브람 창 강력한 접지력, 다이얼(보아) 원터치 끈 조절, 고어텍스 방수',
      quickOptions: ['비브람 아웃솔 미끄럼 방지', '편리한 다이얼(보아) 핏', '고어텍스 100% 생활방수', '가볍고 푹신한 쿠셔닝'],
    },
    {
      id: 'target_customer',
      question: '3. 어떤 고민을 가진 고객에게 특히 추천하고 싶나요?',
      placeholder: '예: 발볼이 넓어서 등산화 고르기 힘든 분, 무릎·발목이 약한 분',
      quickOptions: ['발볼이 넓은 한국인 족형 추천', '하산 시 무릎·발목 부담 감소', '처음 등산 시작하는 입문자', '오래 걸어도 발이 편한 신발'],
    },
    {
      id: 'store_offer',
      question: '4. 밀레김포모아점에서 제공하는 피팅 서비스나 혜택은?',
      placeholder: '예: 매장 내 경사로 테스트 가능, 족형 맞춤 사이즈 상담, 등산양말 증정',
      quickOptions: ['매장 내 족형 맞춤 피팅 상담', '직접 신어보고 비교 추천', '이월/신상 특별 할인가', '구매 시 등산 양말 등 사은품'],
    },
  ],
  gear: [
    {
      id: 'gear_purpose',
      question: '1. 어떤 장비/용품이며 주로 언제 사용하나요?',
      placeholder: '예: 당일 산행 28L 배낭, 3단 카본 등산스틱, 겨울 안전 체인젠',
      quickOptions: ['당일 산행용 데이팩(20~30L)', '관절 보호용 경량 등산스틱', '자외선·체온 보호 모자/장갑', '겨울 산행 필수 아이젠·스패츠'],
    },
    {
      id: 'why_needed',
      question: '2. 이 장비가 있으면 산행이 어떻게 달라지나요?',
      placeholder: '예: 하산할 때 무릎 충격을 줄여줌, 등판 통기성으로 땀이 덜 참',
      quickOptions: ['무릎·체력 소모 확실한 감소', '등판 메쉬 통기성·편안한 밀착감', '미끄러운 길 안전 사고 예방', '수납 분리로 짐 정리 간편'],
    },
    {
      id: 'spec_advantage',
      question: '3. 무게, 소재, 구성품 중 돋보이는 스펙은 무엇인가요?',
      placeholder: '예: 초경량 카본 소재, 레인커버 기본 내장, 원터치 길이 조절',
      quickOptions: ['손목 부담 없는 초경량 설계', '레인커버/파우치 기본 포함', '튼튼한 내구성과 A/S 보장', '초보자도 쉬운 원터치 사용법'],
    },
    {
      id: 'store_offer',
      question: '4. 밀레김포모아점 매장 안내 또는 추천 구성이 있나요?',
      placeholder: '예: 스틱 길이 조절 및 사용법 매장에서 직접 시연해 드려요',
      quickOptions: ['매장 방문 시 사용법 직접 시연', '입문자 장비 세트 할인', '즉시 구매 가능 재고 보유', '선물용 포장 및 추천'],
    },
  ],
};

export const TONE_OPTIONS = [
  { id: 'friendly', label: '친근한 매장 소식', desc: '동네 단골에게 말 건네듯 따뜻하고 편안한 톤' },
  { id: 'expert', label: '전문 장비 가이드', desc: '스펙과 기능의 신뢰감을 주는 알파인 전문가 톤' },
  { id: 'emotional', label: '감성 아웃도어', desc: '산행의 설렘과 계절감이 느껴지는 룩북 톤' },
  { id: 'promo', label: '혜택·방문 강조', desc: '신상 입고·할인·매장 피팅 혜택을 명확히 알리는 톤' },
];

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'jacket',
    label: '고어텍스 자켓 (매장 행거)',
    category: 'apparel',
    productName: '밀레 고어텍스 알파인 방수 자켓',
    src: sampleJacketImg,
  },
  {
    id: 'boots',
    label: '비브람 미드컷 등산화 (진열대)',
    category: 'footwear',
    productName: '밀레 비브람 아웃솔 미드컷 등산화',
    src: sampleBootsImg,
  },
  {
    id: 'pack',
    label: '30L 배낭 & 카본 스틱 (카운터)',
    category: 'gear',
    productName: '밀레 30L 트레킹 배낭 & 카본 스틱',
    src: samplePackImg,
  },
];
