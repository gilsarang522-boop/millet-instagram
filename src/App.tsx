import { useState } from 'react';
import { TopBar, type WorkspaceFocus } from './components/TopBar';
import { PhotoControlsPanel } from './components/PhotoControlsPanel';
import { PhotoEditorStage } from './components/PhotoEditorStage';
import { MarketingCopilotPanel } from './components/MarketingCopilotPanel';
import { InstagramPreviewModal } from './components/InstagramPreviewModal';
import {
  CATEGORY_QUESTIONS,
  DEFAULT_ADJUSTMENTS,
  STUDIO_PRESETS,
  TONE_OPTIONS,
} from './data/presetsAndQuestions';
import type {
  AspectRatioOption,
  CropTransform,
  HashtagGroupItem,
  HashtagStrategy,
  HashtagStudioResult,
  MarketingResult,
  OverlayConfig,
  OverlaySuggestion,
  PhotoAdjustments,
  PhotoAnalysisResult,
  PresetId,
  ProductCategory,
  SamplePhoto,
} from './types/studio';
import {
  extractCompressedBase64,
  loadImage,
  renderStudioCanvas,
} from './utils/canvasRenderer';

const DEFAULT_TRANSFORM: CropTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

const DEFAULT_OVERLAY: OverlayConfig = {
  template: 'editorial',
  headline: '',
  subcopy: '',
  badgeText: '밀레김포모아점',
  showStoreMark: true,
  theme: 'dark',
  fontScale: 1,
};

export default function App() {
  const [activeFocus, setActiveFocus] = useState<WorkspaceFocus>('editor');
  const [mobilePanel, setMobilePanel] = useState<'photo' | 'controls' | 'marketing'>('photo');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalBeforeAiSrc, setOriginalBeforeAiSrc] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:5');
  const [activePreset, setActivePreset] = useState<PresetId>('original');
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>({ ...DEFAULT_ADJUSTMENTS });
  const [transform, setTransform] = useState<CropTransform>({ ...DEFAULT_TRANSFORM });
  const [overlay, setOverlay] = useState<OverlayConfig>({ ...DEFAULT_OVERLAY });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRetouchNote, setAiRetouchNote] = useState<string | null>(null);
  const [isReimagining, setIsReimagining] = useState(false);
  const [reimagineError, setReimagineError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [category, setCategory] = useState<ProductCategory>('apparel');
  const [productName, setProductName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extraNotes, setExtraNotes] = useState('');
  const [tone, setTone] = useState<string>('friendly');
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [marketingError, setMarketingError] = useState<string | null>(null);
  const [marketingResult, setMarketingResult] = useState<MarketingResult | null>(null);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);

  // Dedicated Final Hashtag Generator State
  const [hashtagStrategy, setHashtagStrategy] = useState<HashtagStrategy>('balanced');
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [hashtagError, setHashtagError] = useState<string | null>(null);
  const [hashtagResult, setHashtagResult] = useState<HashtagStudioResult | null>(null);

  const handleSelectFocus = (focus: WorkspaceFocus) => {
    setActiveFocus(focus);
    if (focus === 'preview') {
      setPreviewModalOpen(true);
    } else if (focus === 'marketing') {
      setMobilePanel('marketing');
    } else {
      setMobilePanel('photo');
    }
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setOriginalBeforeAiSrc(null);
        setAiRetouchNote(null);
        setReimagineError(null);
        setTransform({ ...DEFAULT_TRANSFORM });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: SamplePhoto) => {
    setImageSrc(sample.src);
    setOriginalBeforeAiSrc(null);
    setCategory(sample.category);
    setProductName(sample.productName);
    setAiRetouchNote(null);
    setReimagineError(null);
    setTransform({ ...DEFAULT_TRANSFORM });
    setOverlay((prev) => ({
      ...prev,
      headline: prev.headline || sample.productName,
      subcopy: prev.subcopy || '밀레김포모아점 매장에서 직접 확인하세요',
    }));
  };

  const handleSelectPreset = (presetId: PresetId) => {
    setActivePreset(presetId);
    const found = STUDIO_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setAdjustments({ ...found.adjustments });
    }
  };

  const handleChangeAdjustment = (key: keyof PhotoAdjustments, value: number) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetAdjustments = () => {
    setActivePreset('original');
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setAiRetouchNote(null);
  };

  const handleResetAll = () => {
    setImageSrc(null);
    setOriginalBeforeAiSrc(null);
    setActivePreset('original');
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setTransform({ ...DEFAULT_TRANSFORM });
    setOverlay({ ...DEFAULT_OVERLAY });
    setAiRetouchNote(null);
    setReimagineError(null);
    setProductName('');
    setAnswers({});
    setExtraNotes('');
    setMarketingResult(null);
    setMarketingError(null);
    setHashtagResult(null);
    setHashtagError(null);
  };

  const handleRunAutoAnalyze = async () => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    setAiRetouchNote(null);

    try {
      const { base64, mimeType } = await extractCompressedBase64(imageSrc, 1024);
      const res = await fetch('/api/gemini/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          categoryHint: category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '사진 분석 중 오류가 발생했습니다.');
      }

      const result = data as PhotoAnalysisResult;
      if (
        result.detectedCategory === 'apparel' ||
        result.detectedCategory === 'footwear' ||
        result.detectedCategory === 'gear'
      ) {
        setCategory(result.detectedCategory);
      }
      if (result.detectedProduct) {
        setProductName(result.detectedProduct);
      }
      if (result.recommendedPreset) {
        setActivePreset(result.recommendedPreset);
      }
      if (result.suggestedAdjustments) {
        setAdjustments({
          brightness: Math.round(result.suggestedAdjustments.brightness ?? 10),
          contrast: Math.round(result.suggestedAdjustments.contrast ?? 12),
          saturation: Math.round(result.suggestedAdjustments.saturation ?? 8),
          warmth: Math.round(result.suggestedAdjustments.warmth ?? 0),
          sharpness: Math.round(result.suggestedAdjustments.sharpness ?? 20),
          vignette: Math.round(result.suggestedAdjustments.vignette ?? 18),
        });
      }
      setAiRetouchNote(result.retouchReason || '사진의 밝기와 색감을 아웃도어 룩북 스타일로 보정했습니다.');
      setOverlay((prev) => ({
        ...prev,
        template: prev.template === 'clean' ? 'editorial' : prev.template,
        headline: result.suggestedHeadline || prev.headline,
        subcopy: result.suggestedSubcopy || prev.subcopy,
      }));
    } catch (err) {
      setAiRetouchNote(err instanceof Error ? err.message : '자동 보정 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunAiReimagine = async (sceneStyle: string, customPrompt: string) => {
    if (!imageSrc) return;
    setIsReimagining(true);
    setReimagineError(null);

    try {
      const sourceForAi = originalBeforeAiSrc ?? imageSrc;
      const { base64, mimeType } = await extractCompressedBase64(sourceForAi, 1024);
      const res = await fetch('/api/gemini/reimagine-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          sceneStyle,
          aspectRatio,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI 배경 변환 요청에 실패했습니다.');
      }
      if (data.imageDataUrl) {
        if (!originalBeforeAiSrc) {
          setOriginalBeforeAiSrc(imageSrc);
        }
        setImageSrc(data.imageDataUrl);
        setTransform({ ...DEFAULT_TRANSFORM });
      }
    } catch (err) {
      setReimagineError(err instanceof Error ? err.message : '배경 변환 중 오류가 발생했습니다.');
    } finally {
      setIsReimagining(false);
    }
  };

  const handleGenerateMarketing = async () => {
    setIsGeneratingMarketing(true);
    setMarketingError(null);

    try {
      let imagePayload: { imageBase64?: string; mimeType?: string } = {};
      if (imageSrc) {
        const compressed = await extractCompressedBase64(imageSrc, 800);
        imagePayload = { imageBase64: compressed.base64, mimeType: compressed.mimeType };
      }

      const questions = CATEGORY_QUESTIONS[category];
      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? '',
      }));

      const selectedTone = TONE_OPTIONS.find((t) => t.id === tone)?.label ?? '친근한 매장 소식';

      const res = await fetch('/api/gemini/generate-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...imagePayload,
          category,
          productName,
          answers: formattedAnswers,
          extraNotes,
          tone: selectedTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '문구 생성 중 오류가 발생했습니다.');
      }

      const result = data as MarketingResult;
      setMarketingResult(result);
      setSelectedCaptionIndex(0);

      if (result.overlaySuggestions?.[0] && !overlay.headline.trim()) {
        setOverlay((prev) => ({
          ...prev,
          headline: result.overlaySuggestions[0].headline,
          subcopy: result.overlaySuggestions[0].subcopy,
        }));
      }

      if (!hashtagResult && result.hashtags?.length) {
        const seededItems: HashtagGroupItem[] = result.hashtags.map((raw, idx) => {
          const clean = raw.startsWith('#') ? raw : `#${raw}`;
          const group =
            idx < 5 ? 'storeAndLocal' : idx < 11 ? 'brandAndProduct' : 'activityAndSeason';
          return { tag: clean, group, enabled: true };
        });
        setHashtagResult({
          items: seededItems,
          tip: '문구 생성 시 함께 추천된 기본 해시태그입니다. 아래 "완료된 작업으로 해시태그 생성"을 누르면 이미지 문구와 수정한 본문까지 반영해 다시 최적화할 수 있습니다.',
        });
      }
    } catch (err) {
      setMarketingError(err instanceof Error ? err.message : '홍보 문구 생성에 실패했습니다.');
    } finally {
      setIsGeneratingMarketing(false);
    }
  };

  const handleGenerateHashtags = async () => {
    setIsGeneratingHashtags(true);
    setHashtagError(null);

    try {
      let imagePayload: { imageBase64?: string; mimeType?: string } = {};
      if (imageSrc) {
        const compressed = await extractCompressedBase64(imageSrc, 720);
        imagePayload = { imageBase64: compressed.base64, mimeType: compressed.mimeType };
      }

      const questions = CATEGORY_QUESTIONS[category];
      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? '',
      }));

      const selectedCaptionBody = marketingResult?.captions[selectedCaptionIndex]?.body ?? '';

      const res = await fetch('/api/gemini/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...imagePayload,
          category,
          productName,
          overlayHeadline: overlay.headline,
          overlaySubcopy: overlay.subcopy,
          overlayBadgeText: overlay.badgeText,
          answers: formattedAnswers,
          selectedCaptionBody,
          hashtagStrategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '해시태그 생성 중 오류가 발생했습니다.');
      }

      const normalize = (arr: unknown, group: HashtagGroupItem['group']): HashtagGroupItem[] => {
        if (!Array.isArray(arr)) return [];
        return arr
          .map((t) => String(t).trim().replace(/\s+/g, ''))
          .filter(Boolean)
          .map((t) => ({
            tag: t.startsWith('#') ? t : `#${t}`,
            group,
            enabled: true,
          }));
      };

      const seen = new Set<string>();
      const merged: HashtagGroupItem[] = [
        ...normalize(data.storeAndLocal, 'storeAndLocal'),
        ...normalize(data.brandAndProduct, 'brandAndProduct'),
        ...normalize(data.activityAndSeason, 'activityAndSeason'),
      ].filter((item) => {
        if (seen.has(item.tag)) return false;
        seen.add(item.tag);
        return true;
      });

      setHashtagResult({
        items: merged,
        tip: typeof data.tip === 'string' ? data.tip : '',
      });
    } catch (err) {
      setHashtagError(err instanceof Error ? err.message : '해시태그 생성에 실패했습니다.');
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleToggleHashtag = (tag: string) => {
    setHashtagResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.tag === tag ? { ...item, enabled: !item.enabled } : item
        ),
      };
    });
  };

  const handleAddCustomHashtag = (tag: string) => {
    setHashtagResult((prev) => {
      if (!prev) {
        return {
          items: [{ tag, group: 'brandAndProduct', enabled: true }],
          tip: '',
        };
      }
      if (prev.items.some((i) => i.tag === tag)) {
        return {
          ...prev,
          items: prev.items.map((i) => (i.tag === tag ? { ...i, enabled: true } : i)),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { tag, group: 'brandAndProduct', enabled: true }],
      };
    });
  };

  const handleApplyOverlaySuggestion = (suggestion: OverlaySuggestion) => {
    setOverlay((prev) => ({
      ...prev,
      template: prev.template === 'clean' ? 'editorial' : prev.template,
      headline: suggestion.headline,
      subcopy: suggestion.subcopy,
    }));
  };

  const handleUpdateCaptionBody = (idx: number, body: string) => {
    setMarketingResult((prev) => {
      if (!prev) return prev;
      const next = [...prev.captions];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], body };
      return { ...prev, captions: next };
    });
  };

  const handleDownloadImage = async () => {
    if (!imageSrc) return;
    setIsExporting(true);
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const img = await loadImage(imageSrc);
      const exportCanvas = document.createElement('canvas');
      renderStudioCanvas({
        canvas: exportCanvas,
        image: img,
        aspectRatio,
        adjustments,
        transform,
        overlay,
        showOriginal: false,
        outputWidth: 1080,
        applyConvolution: adjustments.sharpness > 0,
      });

      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeName = (productName || 'millet_gimpomoa').replace(/[^\w가-힣-]+/g, '_');
      link.download = `${safeName}_${aspectRatio.replace(':', 'x')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const activeHashtags = (hashtagResult?.items ?? []).filter((i) => i.enabled).map((i) => i.tag);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#111315]">
      <TopBar
        activeFocus={activeFocus}
        onSelectFocus={handleSelectFocus}
        onResetAll={handleResetAll}
        onDownloadImage={handleDownloadImage}
        hasImage={Boolean(imageSrc)}
        isExporting={isExporting}
      />

      {/* Mobile Compact Switcher */}
      <div className="lg:hidden px-4 pt-3">
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAE9E4] rounded-lg">
          <button
            type="button"
            onClick={() => setMobilePanel('photo')}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mobilePanel === 'photo' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66]'
            }`}
          >
            사진 캔버스
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('controls')}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mobilePanel === 'controls' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66]'
            }`}
          >
            보정·프레임
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('marketing')}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mobilePanel === 'marketing' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5A5E66]'
            }`}
          >
            문구·해시태그
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)_410px] gap-5 items-start">
        <div className={mobilePanel === 'controls' ? 'block' : 'hidden lg:block'}>
          <PhotoControlsPanel
            hasImage={Boolean(imageSrc)}
            activePreset={activePreset}
            adjustments={adjustments}
            overlay={overlay}
            aiRetouchNote={aiRetouchNote}
            isAnalyzing={isAnalyzing}
            isReimagining={isReimagining}
            reimagineError={reimagineError}
            onSelectPreset={handleSelectPreset}
            onChangeAdjustment={handleChangeAdjustment}
            onResetAdjustments={handleResetAdjustments}
            onChangeOverlay={(patch) => setOverlay((prev) => ({ ...prev, ...patch }))}
            onRunAutoAnalyze={handleRunAutoAnalyze}
            onRunAiReimagine={handleRunAiReimagine}
          />
        </div>

        <div className={mobilePanel === 'photo' ? 'block' : 'hidden lg:block'}>
          <PhotoEditorStage
            imageSrc={imageSrc}
            aspectRatio={aspectRatio}
            adjustments={adjustments}
            transform={transform}
            overlay={overlay}
            onChangeAspectRatio={setAspectRatio}
            onChangeTransform={(patch) => setTransform((prev) => ({ ...prev, ...patch }))}
            onUploadFile={handleUploadFile}
            onSelectSample={handleSelectSample}
            canRevertAiImage={Boolean(originalBeforeAiSrc)}
            onRevertOriginalImage={() => {
              if (originalBeforeAiSrc) {
                setImageSrc(originalBeforeAiSrc);
                setOriginalBeforeAiSrc(null);
              }
            }}
          />
        </div>

        <div className={mobilePanel === 'marketing' ? 'block' : 'hidden lg:block'}>
          <MarketingCopilotPanel
            category={category}
            productName={productName}
            answers={answers}
            extraNotes={extraNotes}
            tone={tone}
            isGenerating={isGeneratingMarketing}
            marketingResult={marketingResult}
            marketingError={marketingError}
            selectedCaptionIndex={selectedCaptionIndex}
            hashtagStrategy={hashtagStrategy}
            isGeneratingHashtags={isGeneratingHashtags}
            hashtagResult={hashtagResult}
            hashtagError={hashtagError}
            onChangeCategory={(cat) => {
              setCategory(cat);
              setAnswers({});
            }}
            onChangeProductName={setProductName}
            onChangeAnswer={(qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))}
            onChangeExtraNotes={setExtraNotes}
            onChangeTone={setTone}
            onGenerateMarketing={handleGenerateMarketing}
            onApplyOverlaySuggestion={handleApplyOverlaySuggestion}
            onSelectCaptionIndex={setSelectedCaptionIndex}
            onUpdateCaptionBody={handleUpdateCaptionBody}
            onChangeHashtagStrategy={setHashtagStrategy}
            onGenerateHashtags={handleGenerateHashtags}
            onToggleHashtag={handleToggleHashtag}
            onAddCustomHashtag={handleAddCustomHashtag}
            onOpenInstagramPreview={() => setPreviewModalOpen(true)}
          />
        </div>
      </main>

      <InstagramPreviewModal
        open={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          if (activeFocus === 'preview') setActiveFocus('editor');
        }}
        imageSrc={imageSrc}
        aspectRatio={aspectRatio}
        adjustments={adjustments}
        transform={transform}
        overlay={overlay}
        marketingResult={marketingResult}
        selectedCaptionIndex={selectedCaptionIndex}
        activeHashtags={activeHashtags}
        onDownloadImage={handleDownloadImage}
      />
    </div>
  );
}
