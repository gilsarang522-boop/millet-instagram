import { Download, RotateCcw } from 'lucide-react';

export type WorkspaceFocus = 'editor' | 'marketing' | 'preview';

interface TopBarProps {
  activeFocus: WorkspaceFocus;
  onSelectFocus: (focus: WorkspaceFocus) => void;
  onResetAll: () => void;
  onDownloadImage: () => void;
  hasImage: boolean;
  isExporting: boolean;
}

export function TopBar({
  activeFocus,
  onSelectFocus,
  onResetAll,
  onDownloadImage,
  hasImage,
  isExporting,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E4E4E0] px-4 lg:px-8 flex items-center justify-between gap-8">
      {/* Zone 1: Single-line Brand Wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectFocus('editor');
        }}
        className="text-lg font-bold tracking-tight text-[#111315] whitespace-nowrap shrink-0"
      >
        밀레김포모아점 스튜디오
      </a>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5A5E66]">
        <button
          type="button"
          onClick={() => onSelectFocus('editor')}
          className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
            activeFocus === 'editor'
              ? 'text-[#111315] border-[#C8102E] font-semibold'
              : 'border-transparent hover:text-[#111315]'
          }`}
        >
          사진 보정
        </button>
        <button
          type="button"
          onClick={() => onSelectFocus('marketing')}
          className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
            activeFocus === 'marketing'
              ? 'text-[#111315] border-[#C8102E] font-semibold'
              : 'border-transparent hover:text-[#111315]'
          }`}
        >
          홍보 문구 질문
        </button>
        <button
          type="button"
          onClick={() => onSelectFocus('preview')}
          className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
            activeFocus === 'preview'
              ? 'text-[#111315] border-[#C8102E] font-semibold'
              : 'border-transparent hover:text-[#111315]'
          }`}
        >
          인스타 미리보기
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 py-1 text-[#787C84] hover:text-[#111315] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>초기화</span>
        </button>
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onDownloadImage}
          disabled={!hasImage || isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#C8102E] hover:bg-[#A60D26] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? '저장 중...' : '이미지 저장'}</span>
        </button>
      </div>
    </header>
  );
}
