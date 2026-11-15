import { useState } from 'react';
import {
  Shirt,
  Footprints,
  Backpack,
  Copy,
  Check,
  Loader2,
  ArrowUpRight,
  MessageSquareText,
  Hash,
  Plus,
} from 'lucide-react';
import type {
  HashtagStrategy,
  HashtagStudioResult,
  MarketingResult,
  OverlaySuggestion,
  ProductCategory,
} from '../types/studio';
import {
  CATEGORY_LABELS,
  CATEGORY_QUESTIONS,
  TONE_OPTIONS,
} from '../data/presetsAndQuestions';

interface MarketingCopilotPanelProps {
  category: ProductCategory;
  productName: string;
  answers: Record<string, string>;
  extraNotes: string;
  tone: string;
  isGenerating: boolean;
  marketingResult: MarketingResult | null;
  marketingError: string | null;
  selectedCaptionIndex: number;
  hashtagStrategy: HashtagStrategy;
  isGeneratingHashtags: boolean;
  hashtagResult: HashtagStudioResult | null;
  hashtagError: string | null;
  onChangeCategory: (cat: ProductCategory) => void;
  onChangeProductName: (name: string) => void;
  onChangeAnswer: (questionId: string, value: string) => void;
  onChangeExtraNotes: (notes: string) => void;
  onChangeTone: (tone: string) => void;
  onGenerateMarketing: () => void;
  onApplyOverlaySuggestion: (suggestion: OverlaySuggestion) => void;
  onSelectCaptionIndex: (idx: number) => void;
  onUpdateCaptionBody: (idx: number, body: string) => void;
  onChangeHashtagStrategy: (strategy: HashtagStrategy) => void;
  onGenerateHashtags: () => void;
  onToggleHashtag: (tag: string) => void;
  onAddCustomHashtag: (tag: string) => void;
  onOpenInstagramPreview: () => void;
}

const HASHTAG_STRATEGIES: Array<{ id: HashtagStrategy; label: string }> = [
  { id: 'balanced', label: '균형 추천' },
  { id: 'local', label: '김포 지역 집중' },
  { id: 'search', label: '제품·기능 검색' },
];

const GROUP_LABELS: Record<'storeAndLocal' | 'brandAndProduct' | 'activityAndSeason', string> = {
  storeAndLocal: '매장 · 김포 지역 유입',
  brandAndProduct: '브랜드 · 제품 특징',
  activityAndSeason: '산행 · 계절 · 트렌드',
};

export function MarketingCopilotPanel({
  category,
  productName,
  answers,
  extraNotes,
  tone,
  isGenerating,
  marketingResult,
  marketingError,
  selectedCaptionIndex,
  hashtagStrategy,
  isGeneratingHashtags,
  hashtagResult,
  hashtagError,
  onChangeCategory,
  onChangeProductName,
  onChangeAnswer,
  onChangeExtraNotes,
  onChangeTone,
  onGenerateMarketing,
  onApplyOverlaySuggestion,
  onSelectCaptionIndex,
  onUpdateCaptionBody,
  onChangeHashtagStrategy,
  onGenerateHashtags,
  onToggleHashtag,
  onAddCustomHashtag,
  onOpenInstagramPreview,
}: MarketingCopilotPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  const questions = CATEGORY_QUESTIONS[category];

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  const toggleQuickChip = (questionId: string, option: string) => {
    const current = (answers[questionId] ?? '').trim();
    if (!current) {
      onChangeAnswer(questionId, option);
      return;
    }
    const parts = current
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(option)) {
      onChangeAnswer(
        questionId,
        parts.filter((p) => p !== option).join(', ')
      );
    } else {
      onChangeAnswer(questionId, [...parts, option].join(', '));
    }
  };

  const activeCaption = marketingResult?.captions[selectedCaptionIndex] ?? null;
  const enabledTags = (hashtagResult?.items ?? []).filter((item) => item.enabled).map((item) => item.tag);
  const hashtagsLine = enabledTags.join(' ');

  const handleSubmitCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customTagInput.trim().replace(/\s+/g, '');
    if (!cleaned) return;
    onAddCustomHashtag(cleaned.startsWith('#') ? cleaned : `#${cleaned}`);
    setCustomTagInput('');
  };

  return (
    <aside className="bg-white border border-[#E4E4E0] rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E4E4E0] bg-[#FAF9F7]">
        <h2 className="text-base font-bold text-[#111315]">홍보 문구 · 해시태그 생성</h2>
        <p className="text-xs text-[#6B7078] mt-0.5">
          질문에 답하고 문구와 최종 해시태그를 만들어 인스타그램에 바로 복사해 올리세요.
        </p>
      </div>

      <div className="p-5 space-y-6 overflow-y-auto studio-scroll flex-1 max-h-[calc(100vh-140px)]">
        {/* Step 1: Product Category */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#111315]">01. 판매 제품 품목 선택</div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'apparel', icon: Shirt },
                { id: 'footwear', icon: Footprints },
                { id: 'gear', icon: Backpack },
              ] as const
            ).map(({ id, icon: Icon }) => {
              const active = category === id;
              const info = CATEGORY_LABELS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeCategory(id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#C8102E] bg-[#C8102E]/[0.05]'
                      : 'border-[#E4E4E0] hover:border-[#B5B5AE] bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-[#C8102E]' : 'text-[#5A5E66]'}`} />
                  <div className="text-xs font-semibold text-[#111315] whitespace-nowrap truncate">
                    {info.label}
                  </div>
                  <div className="text-[10px] text-[#6B7078] mt-0.5 truncate">{info.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Name */}
        <div className="space-y-1.5">
          <label htmlFor="product-name" className="block text-xs font-semibold text-[#111315]">
            제품명 또는 종류 (AI 사진 분석 시 자동 입력됨)
          </label>
          <input
            id="product-name"
            type="text"
            value={productName}
            onChange={(e) => onChangeProductName(e.target.value)}
            placeholder="예: 밀레 고어텍스 방수 자켓 / 비브람 등산화"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
          />
        </div>

        <hr className="border-[#ECECE8]" />

        {/* Step 2: Dynamic Category-Specific Questionnaire */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111315]">
              02. 강조하고 싶은 내용 질문 ({CATEGORY_LABELS[category].label})
            </span>
            <span className="text-[11px] text-[#787C84]">선택·직접입력</span>
          </div>

          {questions.map((q) => {
            const val = answers[q.id] ?? '';
            return (
              <div key={q.id} className="space-y-2">
                <label htmlFor={`q-${q.id}`} className="block text-xs font-semibold text-[#2B2E34] leading-snug">
                  {q.question}
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {q.quickOptions.map((opt) => {
                    const selected = val
                      .split(',')
                      .map((s) => s.trim())
                      .includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleQuickChip(q.id, opt)}
                        className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#111315] border-[#111315] text-white font-medium'
                            : 'bg-[#F7F7F5] border-[#E4E4E0] text-[#4B5058] hover:border-[#B5B5AE]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <input
                  id={`q-${q.id}`}
                  type="text"
                  value={val}
                  onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
                />
              </div>
            );
          })}

          {/* Extra notes */}
          <div className="space-y-1.5">
            <label htmlFor="extra-notes" className="block text-xs font-semibold text-[#2B2E34]">
              추가로 표현하고 싶은 내용 (가격, 이벤트, 영업시간 등)
            </label>
            <textarea
              id="extra-notes"
              rows={2}
              value={extraNotes}
              onChange={(e) => onChangeExtraNotes(e.target.value)}
              placeholder="예: 김포모아점 단독 20% 할인 중, 주차 편리, DM이나 전화 문의 환영"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315] resize-none"
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#2B2E34]">문구 분위기 선택</div>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTone(t.id)}
                  className={`px-2.5 py-2 text-left rounded-lg border transition-colors cursor-pointer ${
                    tone === t.id
                      ? 'border-[#C8102E] bg-[#C8102E]/[0.05]'
                      : 'border-[#E4E4E0] hover:border-[#B5B5AE] bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#111315]">{t.label}</div>
                  <div className="text-[10px] text-[#6B7078] mt-0.5 line-clamp-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerateMarketing}
            disabled={isGenerating}
            className="w-full py-3 px-4 rounded-lg bg-[#C8102E] hover:bg-[#A60D26] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>인스타 홍보 문구·타이틀 작성 중...</span>
              </>
            ) : (
              <>
                <MessageSquareText className="w-4 h-4" />
                <span>질문 답변으로 인스타 문구 생성</span>
              </>
            )}
          </button>

          {marketingError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] leading-relaxed">
              {marketingError}
            </div>
          )}
        </div>

        {/* Generated Marketing Output */}
        {marketingResult && (
          <>
            <hr className="border-[#ECECE8]" />

            <div className="space-y-5">
              {/* Image Overlay Headline Suggestions */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#111315]">사진 위 추천 타이틀 (클릭해 이미지에 바로 적용)</h3>
                <div className="space-y-2">
                  {marketingResult.overlaySuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onApplyOverlaySuggestion(item)}
                      className="w-full text-left p-3 rounded-lg border border-[#E4E4E0] hover:border-[#C8102E] bg-[#FAF9F7] hover:bg-white transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111315]">{item.headline}</span>
                        <span className="text-[11px] font-semibold text-[#C8102E] inline-flex items-center gap-0.5 shrink-0">
                          사진에 적용
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A5E66] mt-0.5">{item.subcopy}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instagram Caption Tabs */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#111315]">인스타그램 본문 문구 (3가지 버전)</h3>
                  <button
                    type="button"
                    onClick={onOpenInstagramPreview}
                    className="text-xs font-semibold text-[#C8102E] hover:underline cursor-pointer"
                  >
                    피드 미리보기
                  </button>
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#EAE9E4] rounded-lg">
                  {marketingResult.captions.map((cap, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectCaptionIndex(idx)}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                        selectedCaptionIndex === idx
                          ? 'bg-white text-[#111315] shadow-sm'
                          : 'text-[#5A5E66] hover:text-[#111315]'
                      }`}
                    >
                      {cap.style}
                    </button>
                  ))}
                </div>

                {activeCaption && (
                  <div className="space-y-2.5 p-3.5 rounded-lg border border-[#E4E4E0] bg-[#FAF9F7]">
                    <div className="text-xs font-bold text-[#111315]">{activeCaption.title}</div>
                    <textarea
                      rows={6}
                      value={activeCaption.body}
                      onChange={(e) => onUpdateCaptionBody(selectedCaptionIndex, e.target.value)}
                      className="w-full p-2.5 text-xs leading-relaxed text-[#22252A] bg-white border border-[#DCDCD6] rounded-md focus:outline-none focus:border-[#111315]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('caption', activeCaption.body)}
                      className="w-full py-2 px-3 rounded-md border border-[#DCDCD6] bg-white hover:bg-[#F3F3F0] text-xs font-semibold text-[#111315] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'caption' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>본문 문구 복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>본문 문구만 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {marketingResult.postingTip && (
                <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E4E4E0] text-xs text-[#3C4047] leading-relaxed">
                  <span className="font-bold text-[#111315] block mb-0.5">밀레김포모아점 업로드 팁</span>
                  {marketingResult.postingTip}
                </div>
              )}
            </div>
          </>
        )}

        <hr className="border-[#ECECE8]" />

        {/* Step 3: Dedicated Final Hashtag Generator */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111315]">
              <Hash className="w-3.5 h-3.5 text-[#C8102E]" />
              03. 최종 해시태그 생성 · 마무리
            </span>
            {hashtagResult && (
              <span className="text-[11px] font-mono tabular-nums text-[#5A5E66]">
                {enabledTags.length} / 30개 선택
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7078] leading-relaxed">
            사진 편집과 문구 작성이 끝나면, 지금까지 작업한 내용을 종합해 인스타그램에 입력할 최적의 해시태그를 만들어 드립니다.
          </p>

          {/* Hashtag Strategy Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAE9E4] rounded-lg">
            {HASHTAG_STRATEGIES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangeHashtagStrategy(st.id)}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  hashtagStrategy === st.id
                    ? 'bg-white text-[#111315] shadow-sm'
                    : 'text-[#5A5E66] hover:text-[#111315]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onGenerateHashtags}
            disabled={isGeneratingHashtags}
            className="w-full py-2.5 px-4 rounded-lg bg-[#111315] hover:bg-[#272A30] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGeneratingHashtags ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>작업 내용 기반 해시태그 생성 중...</span>
              </>
            ) : (
              <>
                <Hash className="w-4 h-4" />
                <span>완료된 작업으로 해시태그 생성</span>
              </>
            )}
          </button>

          {hashtagError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] leading-relaxed">
              {hashtagError}
            </div>
          )}

          {hashtagResult && (
            <div className="space-y-4 pt-1">
              {(['storeAndLocal', 'brandAndProduct', 'activityAndSeason'] as const).map((groupKey) => {
                const groupItems = hashtagResult.items.filter((i) => i.group === groupKey);
                if (groupItems.length === 0) return null;
                return (
                  <div key={groupKey} className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#5A5E66]">
                      {GROUP_LABELS[groupKey]}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {groupItems.map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => onToggleHashtag(item.tag)}
                          className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors cursor-pointer ${
                            item.enabled
                              ? 'bg-[#111315] border-[#111315] text-white font-medium'
                              : 'bg-white border-[#DCDCD6] text-[#8E929B] line-through hover:text-[#111315]'
                          }`}
                        >
                          {item.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Add Custom Hashtag */}
              <form onSubmit={handleSubmitCustomTag} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="직접 추가할 태그 입력 (예: 김포세일)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-md border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md border border-[#DCDCD6] bg-[#FAF9F7] hover:bg-[#EAE9E4] text-xs font-semibold text-[#111315] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>추가</span>
                </button>
              </form>

              {/* Final Formatted Instagram Hashtag Block */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#111315]">
                  인스타그램 입력용 완성 해시태그
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={hashtagsLine}
                  className="w-full p-3 text-xs leading-relaxed text-[#22252A] bg-[#F7F7F5] border border-[#E4E4E0] rounded-lg select-all focus:outline-none"
                />

                {hashtagResult.tip && (
                  <p className="text-[11px] text-[#5A5E66] leading-relaxed">{hashtagResult.tip}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={enabledTags.length === 0}
                    onClick={() => handleCopy('final-tags', hashtagsLine)}
                    className="flex-1 py-2.5 px-3 rounded-lg border border-[#DCDCD6] bg-white hover:bg-[#F3F3F0] disabled:opacity-50 text-xs font-semibold text-[#111315] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'final-tags' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>해시태그 복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>해시태그만 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={enabledTags.length === 0 && !activeCaption}
                    onClick={() => {
                      const combined = activeCaption
                        ? `${activeCaption.body}\n\n.\n.\n.\n${hashtagsLine}`
                        : hashtagsLine;
                      handleCopy('final-all', combined);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-[#C8102E] hover:bg-[#A60D26] disabled:bg-[#D1D5DB] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'final-all' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>전체 복사 완료</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>본문+해시태그 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
