import React, { useState } from 'react';
import { CapturedGroupInstance, RegexMatchResult } from '../utils/dotnetRegex';
import { getGroupColor } from '../utils/groupColors';

interface HighlightViewportProps {
  testText: string;
  matches: RegexMatchResult[];
  wordWrap: boolean;
  showWhitespace: boolean;
  activeMatchIndex: number | null;
  activeGroupFilter: string;
  onSelectMatch: (matchIndex: number | null) => void;
}

interface MatchSubSpan {
  startIndex: number;
  endIndex: number;
  text: string;
  primaryGroup?: CapturedGroupInstance;
  allCoveringGroups: CapturedGroupInstance[];
}

interface TopLevelSegment {
  type: 'plain' | 'match';
  text: string;
  startIndex: number;
  endIndex: number;
  match?: RegexMatchResult;
  subSpans?: MatchSubSpan[];
}

interface HoverTooltipState {
  x: number;
  y: number;
  match: RegexMatchResult;
  primaryGroup?: CapturedGroupInstance;
  allCoveringGroups: CapturedGroupInstance[];
}

function formatVisibleWhitespace(str: string, enabled: boolean): string {
  if (!enabled) return str;
  return str.replace(/ /g, '·').replace(/\t/g, '→   ');
}

/**
 * Splits a single RegexMatchResult into non-overlapping sub-spans so each captured group
 * gets its own highlight color while preserving exact character alignment.
 */
function buildMatchSubSpans(
  testText: string,
  match: RegexMatchResult
): MatchSubSpan[] {
  if (match.length === 0) {
    return [
      {
        startIndex: match.startIndex,
        endIndex: match.endIndex,
        text: '',
        allCoveringGroups: [],
      },
    ];
  }

  const validGroups = match.groups.filter(
    (g) =>
      g.matched &&
      g.startIndex >= match.startIndex &&
      g.endIndex <= match.endIndex &&
      g.endIndex > g.startIndex
  );

  if (validGroups.length === 0) {
    return [
      {
        startIndex: match.startIndex,
        endIndex: match.endIndex,
        text: match.value,
        allCoveringGroups: [],
      },
    ];
  }

  // Collect all sorted boundary points within [match.startIndex, match.endIndex]
  const boundarySet = new Set<number>([match.startIndex, match.endIndex]);
  for (const g of validGroups) {
    boundarySet.add(g.startIndex);
    boundarySet.add(g.endIndex);
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

  const subSpans: MatchSubSpan[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const e = boundaries[i + 1];
    if (e <= s) continue;

    // Find all groups covering [s, e]
    const covering = validGroups.filter(
      (g) => g.startIndex <= s && g.endIndex >= e
    );

    // Choose the innermost group (smallest length, or highest groupIndex on tie)
    let primaryGroup: CapturedGroupInstance | undefined;
    if (covering.length > 0) {
      primaryGroup = [...covering].sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return b.groupIndex - a.groupIndex;
      })[0];
    }

    subSpans.push({
      startIndex: s,
      endIndex: e,
      text: testText.slice(s, e),
      primaryGroup,
      allCoveringGroups: covering,
    });
  }

  return subSpans;
}

export const HighlightViewport: React.FC<HighlightViewportProps> = ({
  testText,
  matches,
  wordWrap,
  showWhitespace,
  activeMatchIndex,
  activeGroupFilter,
  onSelectMatch,
}) => {
  const [tooltip, setTooltip] = useState<HoverTooltipState | null>(null);

  if (!testText) {
    return (
      <div className="py-10 px-6 text-center text-sm text-slate-400 dark:text-slate-500">
        请在上方输入测试文本，匹配结果将在此处实时高亮显示。
      </div>
    );
  }

  // Build top-level segments across the entire testText
  const segments: TopLevelSegment[] = [];
  let cursor = 0;

  for (const m of matches) {
    if (m.startIndex < cursor) continue;
    if (m.startIndex > cursor) {
      segments.push({
        type: 'plain',
        text: testText.slice(cursor, m.startIndex),
        startIndex: cursor,
        endIndex: m.startIndex,
      });
    }

    segments.push({
      type: 'match',
      text: m.value,
      startIndex: m.startIndex,
      endIndex: m.endIndex,
      match: m,
      subSpans: buildMatchSubSpans(testText, m),
    });

    cursor = m.endIndex;
  }

  if (cursor < testText.length) {
    segments.push({
      type: 'plain',
      text: testText.slice(cursor),
      startIndex: cursor,
      endIndex: testText.length,
    });
  }

  const lineCount = testText.split('\n').length;

  const handleSpanMouseEnter = (
    e: React.MouseEvent<HTMLSpanElement>,
    match: RegexMatchResult,
    subSpan: MatchSubSpan
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: Math.min(window.innerWidth - 280, Math.max(12, rect.left)),
      y: rect.top,
      match,
      primaryGroup: subSpan.primaryGroup,
      allCoveringGroups: subSpan.allCoveringGroups,
    });
    onSelectMatch(match.matchIndex);
  };

  return (
    <div
      className={`relative flex font-mono text-sm leading-6 ${
        wordWrap ? 'overflow-x-hidden' : 'overflow-x-auto'
      }`}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Line numbers gutter */}
      <div
        aria-hidden="true"
        className="select-none shrink-0 py-3 px-2.5 text-right text-xs leading-6 text-slate-400 dark:text-slate-600 bg-slate-50/80 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 tabular-nums"
      >
        {Array.from({ length: lineCount }, (_, idx) => (
          <div key={idx} className="leading-6">
            {idx + 1}
          </div>
        ))}
      </div>

      {/* Highlighted content body */}
      <div
        className={`flex-1 py-3 px-4 leading-6 text-slate-800 dark:text-slate-200 ${
          wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre min-w-max'
        }`}
      >
        {segments.map((seg, idx) => {
          if (seg.type === 'plain' || !seg.match || !seg.subSpans) {
            return (
              <span key={idx}>
                {formatVisibleWhitespace(seg.text, showWhitespace)}
              </span>
            );
          }

          const m = seg.match;
          const isMatchSelected = activeMatchIndex === m.matchIndex;

          return (
            <span
              key={idx}
              onClick={() =>
                onSelectMatch(isMatchSelected ? null : m.matchIndex)
              }
              className={`inline rounded-xs transition-shadow ${
                isMatchSelected
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                  : ''
              }`}
            >
              {m.length === 0 ? (
                <span
                  onMouseEnter={(e) =>
                    handleSpanMouseEnter(e, m, seg.subSpans![0])
                  }
                  className="inline-block w-1.5 h-4 align-middle bg-rose-500/80 rounded-xs cursor-pointer"
                />
              ) : (
                seg.subSpans.map((sub, sIdx) => {
                  const grp = sub.primaryGroup;
                  if (grp) {
                    const color = getGroupColor(grp.groupIndex);
                    const grpKey = grp.name ? grp.name : `$${grp.groupIndex}`;
                    const isDimmed =
                      activeGroupFilter !== 'all' &&
                      activeGroupFilter !== grpKey;

                    return (
                      <span
                        key={sIdx}
                        onMouseEnter={(e) => handleSpanMouseEnter(e, m, sub)}
                        className={`cursor-pointer rounded-xs transition-colors ${
                          isDimmed
                            ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500'
                            : `${color.segmentBg} ${color.segmentBorder} ${color.segmentText}`
                        }`}
                      >
                        {formatVisibleWhitespace(sub.text, showWhitespace)}
                      </span>
                    );
                  }

                  // Portion of full match not inside any capture group
                  return (
                    <span
                      key={sIdx}
                      onMouseEnter={(e) => handleSpanMouseEnter(e, m, sub)}
                      className="cursor-pointer bg-blue-100/70 dark:bg-blue-950/60 hover:bg-blue-200/80 dark:hover:bg-blue-900/70 border-b-2 border-dashed border-blue-400 dark:border-blue-500 text-blue-950 dark:text-blue-100"
                    >
                      {formatVisibleWhitespace(sub.text, showWhitespace)}
                    </span>
                  );
                })
              )}
            </span>
          );
        })}
      </div>

      {/* Floating Hover Tooltip showing .NET Group Tag Name, Index & Length */}
      {tooltip && (
        <div
          style={{
            left: `${tooltip.x}px`,
            top: `${Math.max(8, tooltip.y - 8)}px`,
            transform: 'translateY(-100%)',
          }}
          className="fixed z-50 pointer-events-none max-w-xs sm:max-w-sm bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md shadow-lg border border-slate-700 px-3 py-2 space-y-1 font-sans"
        >
          {tooltip.primaryGroup ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 font-mono font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      getGroupColor(tooltip.primaryGroup.groupIndex).dotBg
                    }`}
                  />
                  <span className="text-amber-300">
                    {tooltip.primaryGroup.rawTag}
                  </span>
                  {tooltip.primaryGroup.name && (
                    <span className="text-slate-300 font-normal">
                      ({tooltip.primaryGroup.name})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Match #{tooltip.match.matchIndex} · Group #
                  {tooltip.primaryGroup.groupIndex}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                Index: {tooltip.primaryGroup.startIndex} · Length:{' '}
                {tooltip.primaryGroup.length}
              </div>

              <div className="text-xs font-mono text-slate-100 bg-slate-950/70 px-2 py-1 rounded-xs truncate">
                {tooltip.primaryGroup.value}
              </div>

              {tooltip.allCoveringGroups.length > 1 && (
                <div className="text-[11px] text-slate-400 pt-0.5 border-t border-slate-700/80 font-mono">
                  外层嵌套分组:{' '}
                  {tooltip.allCoveringGroups
                    .filter(
                      (g) => g.groupIndex !== tooltip.primaryGroup?.groupIndex
                    )
                    .map((g) => g.rawTag)
                    .join(', ')}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-semibold text-blue-300">
                  Match #{tooltip.match.matchIndex} ($0 全文匹配)
                </span>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Index: {tooltip.match.startIndex} · Length:{' '}
                  {tooltip.match.length}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-100 bg-slate-950/70 px-2 py-1 rounded-xs truncate">
                {tooltip.match.value || '(零宽匹配)'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
