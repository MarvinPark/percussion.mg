export function PreviewPlaceholder() {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-800">상세페이지 미리보기</p>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        STEP 3에서 입력 내용과 실시간으로 연결됩니다. 폭 860px 기준 템플릿이 이 영역에
        표시됩니다.
      </p>
    </div>
  )
}
