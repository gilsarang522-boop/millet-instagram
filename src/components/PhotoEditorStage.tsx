import { useEffect, useRef, useState } from 'react';
import { Upload, Eye, ZoomIn, RotateCw, RefreshCw, Image as ImageIcon } from 'lucide-react';
import type {
  AspectRatioOption,
  CropTransform,
  OverlayConfig,
  PhotoAdjustments,
  SamplePhoto,
} from '../types/studio';
import { SAMPLE_PHOTOS } from '../data/presetsAndQuestions';
import { loadImage, renderStudioCanvas } from '../utils/canvasRenderer';

interface PhotoEditorStageProps {
  imageSrc: string | null;
  aspectRatio: AspectRatioOption;
  adjustments: PhotoAdjustments;
  transform: CropTransform;
  overlay: OverlayConfig;
  onChangeAspectRatio: (ratio: AspectRatioOption) => void;
  onChangeTransform: (patch: Partial<CropTransform>) => void;
  onUploadFile: (file: File) => void;
  onSelectSample: (sample: SamplePhoto) => void;
  onRevertOriginalImage?: () => void;
  canRevertAiImage?: boolean;
}

const RATIO_OPTIONS: Array<{ id: AspectRatioOption; label: string; sizeText: string }> = [
  { id: '1:1', label: '1:1 피드', sizeText: '1080×1080' },
  { id: '4:5', label: '4:5 세로 추천', sizeText: '1080×1350' },
  { id: '9:16', label: '9:16 릴스·스토리', sizeText: '1080×1920' },
];

export function PhotoEditorStage({
  imageSrc,
  aspectRatio,
  adjustments,
  transform,
  overlay,
  onChangeAspectRatio,
  onChangeTransform,
  onUploadFile,
  onSelectSample,
  onRevertOriginalImage,
  canRevertAiImage,
}: PhotoEditorStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const [imageReadyTick, setImageReadyTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!imageSrc) {
      loadedImageRef.current = null;
      return;
    }
    loadImage(imageSrc)
      .then((img) => {
        if (!cancelled) {
          loadedImageRef.current = img;
          setImageReadyTick((t) => t + 1);
        }
      })
      .catch(() => {
        if (!cancelled) loadedImageRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    renderStudioCanvas({
      canvas,
      image: img,
      aspectRatio,
      adjustments,
      transform,
      overlay,
      showOriginal,
      outputWidth: 720,
      applyConvolution: false,
    });
  }, [imageReadyTick, aspectRatio, adjustments, transform, overlay, showOriginal]);

  const handleFilePick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onUploadFile(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageSrc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: transform.offsetX,
      origY: transform.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPanning || !panStartRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - panStartRef.current.x) / rect.width) * 2;
    const dy = ((e.clientY - panStartRef.current.y) / rect.height) * 2;
    const nextX = Math.max(-0.85, Math.min(0.85, panStartRef.current.origX + dx));
    const nextY = Math.max(-0.85, Math.min(0.85, panStartRef.current.origY + dy));
    onChangeTransform({ offsetX: Number(nextX.toFixed(3)), offsetY: Number(nextY.toFixed(3)) });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const aspectClass =
    aspectRatio === '1:1'
      ? 'aspect-square max-h-[520px]'
      : aspectRatio === '4:5'
        ? 'aspect-[4/5] max-h-[540px]'
        : 'aspect-[9/16] max-h-[560px]';

  return (
    <section className="bg-[#181A1F] text-white rounded-xl border border-[#2A2D35] flex flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFilePick(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Top Stage Toolbar */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#131519]">
        <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-lg">
          {RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeAspectRatio(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                aspectRatio === opt.id
                  ? 'bg-white text-[#111315] font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {canRevertAiImage && onRevertOriginalImage && (
            <button
              type="button"
              onClick={onRevertOriginalImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>AI 배경 전 원본 복구</span>
            </button>
          )}
          {imageSrc && (
            <button
              type="button"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              onClick={() => setShowOriginal((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                showOriginal
                  ? 'bg-[#C8102E] border-[#C8102E] text-white'
                  : 'border-white/15 bg-white/[0.05] hover:bg-white/10 text-white/90'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showOriginal ? '원본 보는 중' : '원본 비교'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#111315] hover:bg-white/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{imageSrc ? '다른 사진 올리기' : '사진 올리기'}</span>
          </button>
        </div>
      </div>

      {/* Main Darkroom Viewport */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          handleFilePick(e.dataTransfer.files);
        }}
        className={`relative flex-1 min-h-[440px] flex items-center justify-center p-5 transition-colors ${
          isDraggingFile ? 'bg-[#C8102E]/15' : 'bg-[#181A1F]'
        }`}
      >
        {!imageSrc ? (
          <div className="w-full max-w-lg text-center space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/25 hover:border-white/50 rounded-xl p-8 cursor-pointer transition-colors bg-white/[0.02]"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 mx-auto flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-white/80" />
              </div>
              <h2 className="text-base font-semibold text-white">매장에서 찍은 제품 사진을 올려주세요</h2>
              <p className="text-xs text-white/65 mt-2 leading-relaxed">
                스마트폰으로 대충 찍은 사진도 AI 자동 보정과 아웃도어 프레임으로
                <br />
                인스타그램 홍보용 이미지로 깔끔하게 바꿔드립니다.
              </p>
              <span className="inline-block mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[#C8102E] text-white">
                파일 선택 또는 여기에 드래그
              </span>
            </div>

            <div className="space-y-2.5 text-left">
              <div className="text-xs font-medium text-white/60">
                사진이 없다면 매장 샘플 사진으로 바로 체험해보세요
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SAMPLE_PHOTOS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => onSelectSample(sample)}
                    className="group rounded-lg overflow-hidden border border-white/15 hover:border-white/40 bg-white/[0.04] text-left transition-all cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-black/40">
                      <img
                        src={sample.src}
                        alt={sample.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2 text-[11px] font-medium text-white/85 truncate">{sample.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className={`relative w-auto mx-auto shadow-2xl rounded-sm overflow-hidden ${aspectClass}`}>
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`w-full h-full object-contain touch-none select-none ${
                  isPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              />
            </div>
            <p className="text-[11px] text-white/55">
              사진을 드래그하여 위치를 맞추고, 아래 슬라이더로 확대·기울기를 조절할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Framing & Sample Strip */}
      <div className="px-4 py-3 border-t border-white/10 bg-[#131519] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <ZoomIn className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs text-white/75 whitespace-nowrap">확대</span>
            <input
              type="range"
              min={1}
              max={2.4}
              step={0.05}
              disabled={!imageSrc}
              value={transform.zoom}
              onChange={(e) => onChangeTransform({ zoom: Number(e.target.value) })}
              className="w-24 accent-[#C8102E]"
            />
            <span className="text-xs font-mono tabular-nums text-white/70 w-10">
              {Math.round(transform.zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <RotateCw className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs text-white/75 whitespace-nowrap">수평</span>
            <input
              type="range"
              min={-15}
              max={15}
              step={0.5}
              disabled={!imageSrc}
              value={transform.rotation}
              onChange={(e) => onChangeTransform({ rotation: Number(e.target.value) })}
              className="w-24 accent-[#C8102E]"
            />
            <span className="text-xs font-mono tabular-nums text-white/70 w-10">
              {transform.rotation > 0 ? `+${transform.rotation}°` : `${transform.rotation}°`}
            </span>
          </div>

          {imageSrc && (transform.zoom !== 1 || transform.rotation !== 0 || transform.offsetX !== 0 || transform.offsetY !== 0) && (
            <button
              type="button"
              onClick={() => onChangeTransform({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
              className="text-xs text-white/65 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              위치 초기화
            </button>
          )}
        </div>

        {/* Quick Sample Switcher */}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="whitespace-nowrap">샘플:</span>
          {SAMPLE_PHOTOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSample(s)}
              className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                imageSrc === s.src ? 'bg-white/20 text-white font-semibold' : 'bg-white/5 hover:bg-white/10 text-white/75'
              }`}
            >
              {s.id === 'jacket' ? '자켓' : s.id === 'boots' ? '등산화' : '배낭·스틱'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
