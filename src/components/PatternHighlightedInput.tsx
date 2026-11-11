import React, { useState, useRef, useMemo } from 'react';
import { getGroupColor } from '../utils/groupColors';

interface PatternHighlightedInputProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

interface PatternToken {
  text: string;
  start: number;
  end: number;
  kind:
    | 'plain'
    | 'escape'
    | 'char-class-bracket'
    | 'char-class-body'
    | 'quantifier'
    | 'group-open'
    | 'group-close'
    | 'noncap-open'
    | 'noncap-close'
    | 'unmatched-bracket';
  groupIndex?: number;
  pairStart?: number;
  pairEnd?: number;
}

/**
 * Tokenizes a regex pattern to highlight:
 * - Capture group opening tags `(`, `(?<name>`, `(?'name'` and their matching `)` with synced group colors
 * - Non-capturing / lookaround groups `(?:`, `(?=`, `(?!`, `(?<=`, `(?<!` and their matching `)`
 * - Character class brackets `[` and `]`
 * - Quantifiers `{n,m}`
 * - Unmatched brackets in crimson
 */
function tokenizePatternForHighlight(pattern: string): PatternToken[] {
  if (!pattern) return [];

  const tokens: PatternToken[] = [];
  const parenStack: Array<{
    tokenIdx: number;
    isCapturing: boolean;
    groupIndex?: number;
    openStart: number;
    openEnd: number;
  }> = [];

  let i = 0;
  let inCharClass = false;
  let charClassOpenTokenIdx = -1;
  let groupCounter = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Escape sequence
    if (ch === '\\') {
      const len = i + 1 < pattern.length ? 2 : 1;
      // Check for \k<name> or \k'name'
      if (!inCharClass && pattern[i + 1] === 'k' && (pattern[i + 2] === '<' || pattern[i + 2] === "'")) {
        const closeChar = pattern[i + 2] === '<' ? '>' : "'";
        const closeIdx = pattern.indexOf(closeChar, i + 3);
        if (closeIdx !== -1) {
          tokens.push({
            text: pattern.slice(i, closeIdx + 1),
            start: i,
            end: closeIdx + 1,
            kind: 'escape',
          });
          i = closeIdx + 1;
          continue;
        }
      }
      tokens.push({
        text: pattern.slice(i, i + len),
        start: i,
        end: i + len,
        kind: inCharClass ? 'char-class-body' : 'escape',
      });
      i += len;
      continue;
    }

    // Character class [...]
    if (ch === '[' && !inCharClass) {
      inCharClass = true;
      charClassOpenTokenIdx = tokens.length;
      const openLen = pattern[i + 1] === '^' ? 2 : 1;
      tokens.push({
        text: pattern.slice(i, i + openLen),
        start: i,
        end: i + openLen,
        kind: 'char-class-bracket',
      });
      i += openLen;
      continue;
    }

    if (ch === ']' && inCharClass) {
      inCharClass = false;
      const openTok = tokens[charClassOpenTokenIdx];
      const closeTokIdx = tokens.length;
      tokens.push({
        text: ']',
        start: i,
        end: i + 1,
        kind: 'char-class-bracket',
        pairStart: openTok?.start,
      });
      if (openTok) {
        openTok.pairEnd = i;
      }
      void closeTokIdx;
      charClassOpenTokenIdx = -1;
      i += 1;
      continue;
    }

    if (inCharClass) {
      tokens.push({
        text: ch,
        start: i,
        end: i + 1,
        kind: 'char-class-body',
      });
      i += 1;
      continue;
    }

    // Opening parenthesis (
    if (ch === '(') {
      if (pattern[i + 1] === '?') {
        const rest = pattern.slice(i + 2);

        // .NET comment (?#...)
        if (rest.startsWith('#')) {
          const closeParen = pattern.indexOf(')', i + 3);
          if (closeParen !== -1) {
            tokens.push({
              text: pattern.slice(i, closeParen + 1),
              start: i,
              end: closeParen + 1,
              kind: 'noncap-open',
            });
            i = closeParen + 1;
            continue;
          }
        }

        // .NET inline modifier (?i)
        const inlineMod = rest.match(/^([imsx]+)\)/);
        if (inlineMod) {
          const totalLen = 2 + inlineMod[0].length;
          tokens.push({
            text: pattern.slice(i, i + totalLen),
            start: i,
            end: i + totalLen,
            kind: 'noncap-open',
          });
          i += totalLen;
          continue;
        }

        // .NET single-quote named group (?'name'
        if (rest.startsWith("'")) {
          const quoteEnd = rest.indexOf("'", 1);
          if (quoteEnd !== -1) {
            const groupName = rest.slice(1, quoteEnd);
            if (/^[A-Za-z_]\w*$/.test(groupName)) {
              groupCounter += 1;
              const openLen = 2 + quoteEnd + 1;
              const tokIdx = tokens.length;
              tokens.push({
                text: pattern.slice(i, i + openLen),
                start: i,
                end: i + openLen,
                kind: 'group-open',
                groupIndex: groupCounter,
              });
              parenStack.push({
                tokenIdx: tokIdx,
                isCapturing: true,
                groupIndex: groupCounter,
                openStart: i,
                openEnd: i + openLen,
              });
              i += openLen;
              continue;
            }
          }
        }

        // Lookbehind (?<= or (?<!
        if (rest.startsWith('<=') || rest.startsWith('<!')) {
          const tokIdx = tokens.length;
          tokens.push({
            text: pattern.slice(i, i + 4),
            start: i,
            end: i + 4,
            kind: 'noncap-open',
          });
          parenStack.push({
            tokenIdx: tokIdx,
            isCapturing: false,
            openStart: i,
            openEnd: i + 4,
          });
          i += 4;
          continue;
        }

        // .NET / JS angle-bracket named group (?<name>
        if (rest.startsWith('<')) {
          const angleEnd = rest.indexOf('>', 1);
          if (angleEnd !== -1) {
            const groupName = rest.slice(1, angleEnd);
            if (/^[A-Za-z_]\w*$/.test(groupName)) {
              groupCounter += 1;
              const openLen = 2 + angleEnd + 1;
              const tokIdx = tokens.length;
              tokens.push({
                text: pattern.slice(i, i + openLen),
                start: i,
                end: i + openLen,
                kind: 'group-open',
                groupIndex: groupCounter,
              });
              parenStack.push({
                tokenIdx: tokIdx,
                isCapturing: true,
                groupIndex: groupCounter,
                openStart: i,
                openEnd: i + openLen,
              });
              i += openLen;
              continue;
            }
          }
        }

        // Non-capturing (?:, (?=, (?!, (?>
        if (
          rest.startsWith(':') ||
          rest.startsWith('=') ||
          rest.startsWith('!') ||
          rest.startsWith('>')
        ) {
          const tokIdx = tokens.length;
          tokens.push({
            text: pattern.slice(i, i + 3),
            start: i,
            end: i + 3,
            kind: 'noncap-open',
          });
          parenStack.push({
            tokenIdx: tokIdx,
            isCapturing: false,
            openStart: i,
            openEnd: i + 3,
          });
          i += 3;
          continue;
        }
      }

      // Standard numbered group (
      groupCounter += 1;
      const tokIdx = tokens.length;
      tokens.push({
        text: '(',
        start: i,
        end: i + 1,
        kind: 'group-open',
        groupIndex: groupCounter,
      });
      parenStack.push({
        tokenIdx: tokIdx,
        isCapturing: true,
        groupIndex: groupCounter,
        openStart: i,
        openEnd: i + 1,
      });
      i += 1;
      continue;
    }

    // Closing parenthesis )
    if (ch === ')') {
      const top = parenStack.pop();
      if (!top) {
        tokens.push({
          text: ')',
          start: i,
          end: i + 1,
          kind: 'unmatched-bracket',
        });
      } else {
        const openTok = tokens[top.tokenIdx];
        if (openTok) {
          openTok.pairEnd = i;
        }
        tokens.push({
          text: ')',
          start: i,
          end: i + 1,
          kind: top.isCapturing ? 'group-close' : 'noncap-close',
          groupIndex: top.groupIndex,
          pairStart: top.openStart,
        });
      }
      i += 1;
      continue;
    }

    // Quantifiers {n,m} or *, +, ?
    if (ch === '{') {
      const qMatch = pattern.slice(i).match(/^\{\d+(?:,\d*)?\}\??/);
      if (qMatch) {
        tokens.push({
          text: qMatch[0],
          start: i,
          end: i + qMatch[0].length,
          kind: 'quantifier',
        });
        i += qMatch[0].length;
        continue;
      }
    }
    if (ch === '*' || ch === '+' || ch === '?') {
      const isLazy = pattern[i + 1] === '?';
      const len = isLazy ? 2 : 1;
      tokens.push({
        text: pattern.slice(i, i + len),
        start: i,
        end: i + len,
        kind: 'quantifier',
      });
      i += len;
      continue;
    }

    tokens.push({
      text: ch,
      start: i,
      end: i + 1,
      kind: 'plain',
    });
    i += 1;
  }

  // Mark any unclosed parens or char class brackets
  for (const unclosed of parenStack) {
    if (tokens[unclosed.tokenIdx]) {
      tokens[unclosed.tokenIdx].kind = 'unmatched-bracket';
    }
  }
  if (inCharClass && charClassOpenTokenIdx !== -1 && tokens[charClassOpenTokenIdx]) {
    tokens[charClassOpenTokenIdx].kind = 'unmatched-bracket';
  }

  return tokens;
}

export const PatternHighlightedInput: React.FC<PatternHighlightedInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  inputRef,
}) => {
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => tokenizePatternForHighlight(value), [value]);

  const syncScroll = () => {
    if (inputRef.current && backdropRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const updateCursor = () => {
    if (inputRef.current) {
      setCursorPos(inputRef.current.selectionStart);
    }
  };

  return (
    <div className="relative flex-1 min-w-0 flex items-center overflow-hidden">
      {/* Syntax Highlighted Backdrop Layer */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none w-full overflow-x-hidden whitespace-pre font-mono text-sm leading-6 select-none"
      >
        {value.length === 0 ? (
          <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
        ) : (
          tokens.map((tok, idx) => {
            // Check if cursor is touching this bracket or its paired bracket
            const isCursorOnThis =
              cursorPos !== null &&
              cursorPos >= tok.start &&
              cursorPos <= tok.end;
            const isCursorOnPair =
              cursorPos !== null &&
              ((tok.pairEnd !== undefined &&
                (cursorPos === tok.pairEnd || cursorPos === tok.pairEnd + 1)) ||
                (tok.pairStart !== undefined &&
                  (cursorPos === tok.pairStart || cursorPos === tok.pairStart + 1)));
            const isPairActive =
              (isCursorOnThis || isCursorOnPair) &&
              (tok.kind === 'group-open' ||
                tok.kind === 'group-close' ||
                tok.kind === 'noncap-open' ||
                tok.kind === 'noncap-close' ||
                tok.kind === 'char-class-bracket');

            if (tok.kind === 'group-open' || tok.kind === 'group-close') {
              const color = getGroupColor(tok.groupIndex || 1);
              return (
                <span
                  key={idx}
                  className={`${color.bracketText} ${color.bracketBg} ${
                    isPairActive
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                      : ''
                  }`}
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'noncap-open' || tok.kind === 'noncap-close') {
              return (
                <span
                  key={idx}
                  className={`text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/60 rounded-xs ${
                    isPairActive ? 'ring-2 ring-teal-500' : ''
                  }`}
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'char-class-bracket') {
              return (
                <span
                  key={idx}
                  className={`text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-950/50 rounded-xs ${
                    isPairActive ? 'ring-2 ring-orange-500' : ''
                  }`}
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'char-class-body') {
              return (
                <span
                  key={idx}
                  className="text-orange-800 dark:text-orange-200 bg-orange-50/40 dark:bg-orange-950/25"
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'quantifier') {
              return (
                <span
                  key={idx}
                  className="text-blue-600 dark:text-blue-400 font-medium"
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'escape') {
              return (
                <span
                  key={idx}
                  className="text-sky-700 dark:text-sky-300"
                >
                  {tok.text}
                </span>
              );
            }

            if (tok.kind === 'unmatched-bracket') {
              return (
                <span
                  key={idx}
                  className="text-white bg-red-600 font-bold rounded-xs px-0.5"
                >
                  {tok.text}
                </span>
              );
            }

            return (
              <span key={idx} className="text-slate-900 dark:text-slate-100">
                {tok.text}
              </span>
            );
          })
        )}
      </div>

      {/* Transparent Foreground Input for Native Editing & Caret */}
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updateCursor();
          syncScroll();
        }}
        onScroll={syncScroll}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onFocus={updateCursor}
        onBlur={() => setCursorPos(null)}
        spellCheck={false}
        autoComplete="off"
        className="absolute inset-0 w-full h-full font-mono text-sm leading-6 text-transparent caret-slate-900 dark:caret-white bg-transparent focus:outline-none selection:bg-blue-500/25"
      />
    </div>
  );
};
