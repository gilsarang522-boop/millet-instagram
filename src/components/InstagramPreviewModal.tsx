import { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Send, Bookmark, Copy, Check, Download } from 'lucide-react';
import type {
  AspectRatioOption,
  CropTransform,
  MarketingResult,
  OverlayConfig,
  PhotoAdjustments,
} from '../types/studio';
import { loadImage, renderStudioCanvas } from '../utils/canvasRenderer';

interface InstagramPreviewModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string | null;
  aspectRatio: AspectRatioOption;
  adjustments: PhotoAdjustments;
  transform: CropTransform;
  overlay: OverlayConfig;
  marketingResult: MarketingResult | null;
  selectedCaptionIndex: number;
  activeHashtags: string[];
  onDownloadImage: () => void;
}

export function InstagramPreviewModal({
  open,
  onClose,
  imageSrc,
  aspectRatio,
  adjustments,
  transform,
  overlay,
  marketingResult,
  selectedCaptionIndex,
  activeHashtags,
  onDownloadImage,
}: InstagramPreviewModalProps) {
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !imageSrc) return;
    let cancelled = false;
    loadImage(imageSrc)
      .then((img) => {
        if (cancelled) return;
        const offscreen = document.createElement('canvas');
        renderStudioCanvas({
          canvas: offscreen,
          image: img,
          aspectRatio,
          adjustments,
          transform,
          overlay,
          outputWidth: 720,
          applyConvolution: false,
        });
        setPreviewDataUrl(offscreen.toDataURL('image/png'));
      })
      .catch(() => {
        if (!cancelled) setPreviewDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, aspectRatio, adjustments, transform, overlay]);

  if (!open) return null;

  const caption = marketingResult?.captions[selectedCaptionIndex];
  const hashtags =
    activeHashtags.length > 0
      ? activeHashtags.join(' ')
      : marketingResult?.hashtags.join(' ') ?? '#밀레김포모아점 #밀레 #김포아웃도어';
  const fullText = caption
    ? `${caption.body}\n\n${hashtags}`
    : `${overlay.headline || '밀레김포모아점 신상 입고 안내'}\n${overlay.subcopy || '매장에서 직접 착용해보시고 맞춤 상담 받아보세요.'}\n\n${hashtags}`;

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#E4E4E0] flex items-center justify-between">
          <span className="text-sm font-bold text-[#111315]">인스타그램 피드 미리보기</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg text-[#5A5E66] hover:bg-[#F3F3F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto studio-scroll flex-1">
          {/* Mock Instagram Header */}
          <div className="px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center">
                M
              </div>
              <div>
                <div className="text-xs font-bold text-[#111315] leading-tight">millet_gimpomoa</div>
                <div className="text-[11px] text-[#6B7078] leading-tight">밀레 김포모아점 · Gimpo</div>
              </div>
            </div>
          </div>

          {/* Rendered Image */}
          <div className="bg-[#181A1F] w-full flex items-center justify-center">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="인스타그램 미리보기"
                referrerPolicy="no-referrer"
                className="w-full max-h-[420px] object-contain"
              />
            ) : (
              <div className="py-20 text-xs text-white/60">사진을 먼저 업로드해 주세요</div>
            )}
          </div>

          {/* Action Row */}
          <div className="px-3.5 py-2.5 flex items-center justify-between text-[#111315]">
            <div className="flex items-center gap-3.5">
              <Heart className="w-5 h-5" />
              <MessageCircle className="w-5 h-5" />
              <Send className="w-5 h-5" />
            </div>
            <Bookmark className="w-5 h-5" />
          </div>

          {/* Caption Body */}
          <div className="px-3.5 pb-5 space-y-2 text-xs text-[#22252A] leading-relaxed">
            <div className="font-semibold text-[#111315]">좋아요 48개</div>
            <div className="whitespace-pre-line">
              <span className="font-bold mr-1.5">millet_gimpomoa</span>
              {fullText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#E4E4E0] bg-[#FAF9F7] flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex-1 py-2.5 px-3 rounded-lg border border-[#DCDCD6] bg-white hover:bg-[#F3F3F0] text-xs font-semibold text-[#111315] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>문구+태그 복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>문구+태그 복사</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={!imageSrc}
            onClick={onDownloadImage}
            className="flex-1 py-2.5 px-3 rounded-lg bg-[#C8102E] hover:bg-[#A60D26] disabled:bg-[#D1D5DB] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>고화질 이미지 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
}
