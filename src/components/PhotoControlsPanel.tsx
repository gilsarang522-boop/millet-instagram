import { useState } from 'react';
import {
  Wand2,
  SlidersHorizontal,
  Type as TypeIcon,
  Mountain,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  OverlayConfig,
  OverlayTemplateId,
  PhotoAdjustments,
  PresetId,
} from '../types/studio';
import { DEFAULT_ADJUSTMENTS, STUDIO_PRESETS } from '../data/presetsAndQuestions';

interface PhotoControlsPanelProps {
  hasImage: boolean;
  activePreset: PresetId;
  adjustments: PhotoAdjustments;
  overlay: OverlayConfig;
  aiRetouchNote: string | null;
  isAnalyzing: boolean;
  isReimagining: boolean;
  reimagineError: string | null;
  onSelectPreset: (presetId: PresetId) => void;
  onChangeAdjustment: (key: keyof PhotoAdjustments, value: number) => void;
  onResetAdjustments: () => void;
  onChangeOverlay: (patch: Partial<OverlayConfig>) => void;
  onRunAutoAnalyze: () => void;
  onRunAiReimagine: (sceneStyle: string, customPrompt: string) => void;
}

type LeftTab = 'retouch' | 'overlay' | 'studio';

const OVERLAY_TEMPLATES: Array<{ id: OverlayTemplateId; label: string; desc: string }> = [
  { id: 'clean', label: '클린 포토', desc: '텍스트 없이 사진만' },
  { id: 'editorial', label: '매거진 하단', desc: '그라데이션 + 타이틀' },
  { id: 'poster', label: '화보 프레임', desc: '여백 액자 + 매장 헤더' },
  { id: 'spec', label: '스펙 박스', desc: '하단 바 + 포인트 강조' },
];

const SCENE_OPTIONS = [
  { id: 'clean-studio', label: '미니멀 스튜디오', desc: '어수선한 매장 배경을 깔끔한 스톤 스튜디오로 전환' },
  { id: 'alpine-ridge', label: '설산·알파인 능선', desc: '탁 트인 산악 정상 자연광 배경으로 재연출' },
  { id: 'forest-trail', label: '햇살 숲길 트레일', desc: '부드러운 나뭇잎과 오솔길 야외 감성 배경' },
  { id: 'wooden-chalet', label: '우드 쇼룸 디스플레이', desc: '고급 아웃도어 샬레 매장의 따뜻한 스포트라이트' },
];

export function PhotoControlsPanel({
  hasImage,
  activePreset,
  adjustments,
  overlay,
  aiRetouchNote,
  isAnalyzing,
  isReimagining,
  reimagineError,
  onSelectPreset,
  onChangeAdjustment,
  onResetAdjustments,
  onChangeOverlay,
  onRunAutoAnalyze,
  onRunAiReimagine,
}: PhotoControlsPanelProps) {
  const [tab, setTab] = useState<LeftTab>('retouch');
  const [selectedScene, setSelectedScene] = useState<string>('clean-studio');
  const [customSceneNote, setCustomSceneNote] = useState<string>('');

  const sliderItems: Array<{
    key: keyof PhotoAdjustments;
    label: string;
    min: number;
    max: number;
  }> = [
    { key: 'brightness', label: '밝기', min: -40, max: 40 },
    { key: 'contrast', label: '대비', min: -40, max: 40 },
    { key: 'saturation', label: '채도 (색감)', min: -40, max: 40 },
    { key: 'warmth', label: '색온도 (온기)', min: -30, max: 30 },
    { key: 'sharpness', label: '선명도 (질감)', min: 0, max: 50 },
    { key: 'vignette', label: '주변 어둡게 (집중)', min: 0, max: 50 },
  ];

  const isModified = (Object.keys(DEFAULT_ADJUSTMENTS) as Array<keyof PhotoAdjustments>).some(
    (k) => adjustments[k] !== DEFAULT_ADJUSTMENTS[k]
  );

  return (
    <aside className="bg-white border border-[#E4E4E0] rounded-xl flex flex-col overflow-hidden">
      {/* Segmented Tool Tabs */}
      <div className="p-2 border-b border-[#E4E4E0] bg-[#FAF9F7]">
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAE9E4] rounded-lg">
          <button
            type="button"
            onClick={() => setTab('retouch')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'retouch' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66] hover:text-[#111315]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>보정·필터</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('overlay')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'overlay' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66] hover:text-[#111315]'
            }`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>문구 프레임</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('studio')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'studio' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66] hover:text-[#111315]'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>AI 배경</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-4 space-y-6 overflow-y-auto studio-scroll flex-1 max-h-[calc(100vh-140px)]">
        {tab === 'retouch' && (
          <>
            {/* One-Click AI Auto Retouch */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onRunAutoAnalyze}
                disabled={!hasImage || isAnalyzing}
                className="w-full py-2.5 px-4 rounded-lg bg-[#111315] hover:bg-[#272A30] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>매장 사진 조명·제품 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>AI 원클릭 자동 보정</span>
                  </>
                )}
              </button>
              <p className="text-xs text-[#6B7078] leading-relaxed">
                매장 형광등의 어두움이나 색 번짐을 AI가 파악해 제품이 돋보이는 보정값을 자동 적용합니다.
              </p>

              {aiRetouchNote && (
                <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0] text-xs text-[#2B2E34] leading-relaxed">
                  <span className="font-semibold text-[#C8102E] block mb-1">AI 보정 분석 완료</span>
                  {aiRetouchNote}
                </div>
              )}
            </div>

            <hr className="border-[#ECECE8]" />

            {/* Presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111315]">아웃도어 무드 프리셋</h3>
                <span className="text-xs text-[#787C84]">6종</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STUDIO_PRESETS.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!hasImage}
                      onClick={() => onSelectPreset(preset.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'border-[#C8102E] bg-[#C8102E]/[0.04]'
                          : 'border-[#E4E4E0] hover:border-[#B5B5AE] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.swatch }}
                        />
                        <span className="text-xs font-semibold text-[#111315] truncate">{preset.name}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7078] leading-snug line-clamp-1">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#ECECE8]" />

            {/* Fine Sliders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111315]">세부 밝기 · 색감 조절</h3>
                {isModified && (
                  <button
                    type="button"
                    onClick={onResetAdjustments}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7078] hover:text-[#111315] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>되돌리기</span>
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {sliderItems.map((item) => {
                  const val = adjustments[item.key];
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor={`slider-${item.key}`} className="font-medium text-[#2B2E34]">
                          {item.label}
                        </label>
                        <span className="font-mono tabular-nums text-[#5A5E66]">
                          {val > 0 ? `+${val}` : val}
                        </span>
                      </div>
                      <input
                        id={`slider-${item.key}`}
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={val}
                        disabled={!hasImage}
                        onChange={(e) => onChangeAdjustment(item.key, Number(e.target.value))}
                        className="w-full studio-slider disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'overlay' && (
          <>
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-[#111315]">인스타그램 카드 디자인</h3>
              <div className="grid grid-cols-2 gap-2">
                {OVERLAY_TEMPLATES.map((tpl) => {
                  const active = overlay.template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => onChangeOverlay({ template: tpl.id })}
                      className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'border-[#C8102E] bg-[#C8102E]/[0.04]'
                          : 'border-[#E4E4E0] hover:border-[#B5B5AE] bg-white'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#111315]">{tpl.label}</div>
                      <div className="text-[11px] text-[#6B7078] mt-0.5">{tpl.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#ECECE8]" />

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="overlay-headline" className="block text-xs font-semibold text-[#2B2E34]">
                  메인 문구 (큰 제목)
                </label>
                <input
                  id="overlay-headline"
                  type="text"
                  maxLength={28}
                  value={overlay.headline}
                  onChange={(e) => onChangeOverlay({ headline: e.target.value })}
                  placeholder="예: 가을 산행의 시작, 고어텍스 자켓"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="overlay-subcopy" className="block text-xs font-semibold text-[#2B2E34]">
                  보조 설명 문구
                </label>
                <input
                  id="overlay-subcopy"
                  type="text"
                  maxLength={40}
                  value={overlay.subcopy}
                  onChange={(e) => onChangeOverlay({ subcopy: e.target.value })}
                  placeholder="예: 방수·방풍 완벽 대비 · 남녀 전 사이즈 입고"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="overlay-badge" className="block text-xs font-semibold text-[#2B2E34]">
                  가격 또는 매장 강조 포인트 (선택)
                </label>
                <input
                  id="overlay-badge"
                  type="text"
                  maxLength={24}
                  value={overlay.badgeText}
                  onChange={(e) => onChangeOverlay({ badgeText: e.target.value })}
                  placeholder="예: 신상 20% 혜택 · 김포모아점"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
                />
              </div>
            </div>

            <hr className="border-[#ECECE8]" />

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2B2E34]">배경 / 글자 톤</span>
                <div className="flex items-center gap-1 p-1 bg-[#EAE9E4] rounded-lg">
                  <button
                    type="button"
                    onClick={() => onChangeOverlay({ theme: 'dark' })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      overlay.theme === 'dark' ? 'bg-[#111315] text-white' : 'text-[#5A5E66]'
                    }`}
                  >
                    다크 톤
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeOverlay({ theme: 'light' })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      overlay.theme === 'light' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66]'
                    }`}
                  >
                    화이트 톤
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-xs font-semibold text-[#2B2E34]">MILLET · 김포모아점 로고 표시</span>
                <input
                  type="checkbox"
                  checked={overlay.showStoreMark}
                  onChange={(e) => onChangeOverlay({ showStoreMark: e.target.checked })}
                  className="w-4 h-4 accent-[#C8102E] cursor-pointer"
                />
              </label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2B2E34]">글자 크기</span>
                  <span className="font-mono tabular-nums text-[#5A5E66]">
                    {Math.round(overlay.fontScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.05}
                  value={overlay.fontScale}
                  onChange={(e) => onChangeOverlay({ fontScale: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          </>
        )}

        {tab === 'studio' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0] space-y-1">
              <div className="text-xs font-semibold text-[#111315]">AI 배경 스튜디오 재연출 (선택 기능)</div>
              <p className="text-[11px] text-[#5A5E66] leading-relaxed">
                매장 행거·진열대 배경을 스튜디오나 실제 산악 풍경으로 바꾸는 생성형 기능입니다. (이 기능은 결제가 연결된 유료 API 키가 필요하며, 일반 보정·프레임·문구 생성은 무료로 동작합니다.)
              </p>
            </div>

            <div className="space-y-2">
              {SCENE_OPTIONS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScene(sc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedScene === sc.id
                      ? 'border-[#C8102E] bg-[#C8102E]/[0.04]'
                      : 'border-[#E4E4E0] hover:border-[#B5B5AE] bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#111315]">{sc.label}</div>
                  <div className="text-[11px] text-[#6B7078] mt-0.5">{sc.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="scene-custom" className="block text-xs font-semibold text-[#2B2E34]">
                배경 추가 요청 (선택)
              </label>
              <input
                id="scene-custom"
                type="text"
                value={customSceneNote}
                onChange={(e) => setCustomSceneNote(e.target.value)}
                placeholder="예: 가을 단풍이 은은하게 보이도록"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCDCD6] bg-white focus:outline-none focus:border-[#111315]"
              />
            </div>

            <button
              type="button"
              disabled={!hasImage || isReimagining}
              onClick={() => onRunAiReimagine(selectedScene, customSceneNote)}
              className="w-full py-2.5 px-4 rounded-lg bg-[#111315] hover:bg-[#272A30] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isReimagining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>배경 재연출 이미지 생성 중...</span>
                </>
              ) : (
                <>
                  <Mountain className="w-4 h-4" />
                  <span>선택한 배경으로 재연출하기</span>
                </>
              )}
            </button>

            {reimagineError && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{reimagineError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
