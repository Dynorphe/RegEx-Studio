export interface GroupMetadata {
  groupIndex: number;
  name?: string;
  syntaxType: 'numbered' | 'dotnet-angle' | 'dotnet-quote';
  rawTag: string;
}

export interface CapturedGroupInstance {
  groupIndex: number;
  name?: string;
  syntaxType: 'numbered' | 'dotnet-angle' | 'dotnet-quote';
  rawTag: string;
  value: string | undefined;
  startIndex: number;
  endIndex: number;
  length: number;
  matched: boolean;
}

export interface RegexMatchResult {
  matchIndex: number;
  value: string;
  startIndex: number;
  endIndex: number;
  length: number;
  lineNumber: number;
  columnNumber: number;
  groups: CapturedGroupInstance[];
}

export interface TranspiledRegexInfo {
  originalPattern: string;
  jsPattern: string;
  effectiveFlags: string;
  extractedInlineFlags: string[];
  definedGroups: GroupMetadata[];
  transpiledNotes: string[];
  error?: string;
}

export interface EvaluationResult {
  transpiled: TranspiledRegexInfo;
  matches: RegexMatchResult[];
  replacedText: string;
  executionTimeMs: number;
}

/**
 * Parses a regex pattern that may contain .NET specific syntax:
 * - (?'name'...) single-quoted named capture groups -> (?<name>...)
 * - (?<name>...) angle-bracket named capture groups
 * - \k'name' single-quoted backreferences -> \k<name>
 * - (?#comment) inline comments -> removed
 * - Leading or inline mode modifiers like (?i), (?m), (?s), (?im) -> extracted into flags
 */
export function transpileDotNetPattern(pattern: string, userFlags: string): TranspiledRegexInfo {
  const definedGroups: GroupMetadata[] = [];
  const transpiledNotes: string[] = [];
  const extractedInlineFlagsSet = new Set<string>();

  if (!pattern) {
    return {
      originalPattern: '',
      jsPattern: '',
      effectiveFlags: userFlags,
      extractedInlineFlags: [],
      definedGroups: [],
      transpiledNotes: [],
    };
  }

  let jsPattern = '';
  let i = 0;
  let inCharClass = false;
  let groupCounter = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Handle escape sequences
    if (ch === '\\') {
      if (i + 1 < pattern.length) {
        const nextCh = pattern[i + 1];
        // Check for .NET \k'name' backreference outside character class
        if (!inCharClass && nextCh === 'k' && pattern[i + 2] === "'") {
          const closeQuote = pattern.indexOf("'", i + 3);
          if (closeQuote !== -1) {
            const refName = pattern.slice(i + 3, closeQuote);
            if (/^[A-Za-z_]\w*$/.test(refName)) {
              jsPattern += `\\k<${refName}>`;
              transpiledNotes.push(`已将 .NET 反向引用 \\k'${refName}' 转换为 \\k<${refName}>`);
              i = closeQuote + 1;
              continue;
            }
          }
        }
        jsPattern += ch + nextCh;
        i += 2;
        continue;
      } else {
        jsPattern += ch;
        i += 1;
        continue;
      }
    }

    // Track character class [...]
    if (ch === '[' && !inCharClass) {
      inCharClass = true;
      jsPattern += ch;
      i += 1;
      continue;
    }
    if (ch === ']' && inCharClass) {
      inCharClass = false;
      jsPattern += ch;
      i += 1;
      continue;
    }

    // Inside character class, copy as-is
    if (inCharClass) {
      jsPattern += ch;
      i += 1;
      continue;
    }

    // Handle groups (...) outside character class
    if (ch === '(') {
      if (pattern[i + 1] === '?') {
        const rest = pattern.slice(i + 2);

        // 1. Check .NET inline comment (?#...)
        if (rest.startsWith('#')) {
          const closeParen = pattern.indexOf(')', i + 3);
          if (closeParen !== -1) {
            transpiledNotes.push(`已忽略 .NET 内联注释 (?#${pattern.slice(i + 3, closeParen)})`);
            i = closeParen + 1;
            continue;
          }
        }

        // 2. Check .NET inline mode modifiers e.g. (?i), (?im), (?s), (?m)
        const inlineFlagMatch = rest.match(/^([imsx]+)\)/);
        if (inlineFlagMatch) {
          const flagsStr = inlineFlagMatch[1];
          for (const f of flagsStr) {
            if (f === 'i' || f === 'm' || f === 's') {
              extractedInlineFlagsSet.add(f);
            }
          }
          transpiledNotes.push(`已识别 .NET 内联修饰符 (?${flagsStr}) 并合并至全局 Flags`);
          i += 2 + inlineFlagMatch[0].length;
          continue;
        }

        // 3. Check .NET single-quote named capture group (?'name'...)
        if (rest.startsWith("'")) {
          const quoteEnd = rest.indexOf("'", 1);
          if (quoteEnd !== -1) {
            const groupName = rest.slice(1, quoteEnd);
            if (/^[A-Za-z_]\w*$/.test(groupName)) {
              groupCounter += 1;
              definedGroups.push({
                groupIndex: groupCounter,
                name: groupName,
                syntaxType: 'dotnet-quote',
                rawTag: `(?'${groupName}')`,
              });
              jsPattern += `(?<${groupName}>`;
              transpiledNotes.push(`已兼容 .NET 单引号命名分组 (?'${groupName}'...)`);
              i += 2 + quoteEnd + 1;
              continue;
            }
          }
        }

        // 4. Check lookbehind (?<=...) or (?<!...) -> non-capturing
        if (rest.startsWith('<=') || rest.startsWith('<!')) {
          jsPattern += pattern.slice(i, i + 4);
          i += 4;
          continue;
        }

        // 5. Check standard & .NET angle-bracket named capture group (?<name>...)
        if (rest.startsWith('<')) {
          const angleEnd = rest.indexOf('>', 1);
          if (angleEnd !== -1) {
            const groupName = rest.slice(1, angleEnd);
            if (/^[A-Za-z_]\w*$/.test(groupName)) {
              groupCounter += 1;
              definedGroups.push({
                groupIndex: groupCounter,
                name: groupName,
                syntaxType: 'dotnet-angle',
                rawTag: `(?<${groupName}>)`,
              });
              jsPattern += `(?<${groupName}>`;
              i += 2 + angleEnd + 1;
              continue;
            }
          }
        }

        // 6. Check non-capturing (?:...), lookahead (?=...), (?!...)
        if (rest.startsWith(':') || rest.startsWith('=') || rest.startsWith('!')) {
          jsPattern += pattern.slice(i, i + 3);
          i += 3;
          continue;
        }

        // 7. Check .NET atomic group (?>...) -> convert to non-capturing (?:...) with note
        if (rest.startsWith('>')) {
          jsPattern += '(?:';
          transpiledNotes.push('已将 .NET 原子分组 (?>...) 兼容映射为非捕获分组 (?:...)');
          i += 3;
          continue;
        }
      } else {
        // Standard numbered capturing group (...)
        groupCounter += 1;
        definedGroups.push({
          groupIndex: groupCounter,
          syntaxType: 'numbered',
          rawTag: `$${groupCounter}`,
        });
      }
    }

    jsPattern += ch;
    i += 1;
  }

  // Merge user flags + extracted inline flags
  const flagChars = new Set<string>(userFlags.split(''));
  extractedInlineFlagsSet.forEach((f) => flagChars.add(f));
  const effectiveFlags = Array.from(flagChars).join('');

  return {
    originalPattern: pattern,
    jsPattern,
    effectiveFlags,
    extractedInlineFlags: Array.from(extractedInlineFlagsSet),
    definedGroups,
    transpiledNotes,
  };
}

/**
 * Helper to compute 1-based line and column number for a character index in text
 */
function getLineAndCol(text: string, index: number): { lineNumber: number; columnNumber: number } {
  let lineNumber = 1;
  let lastNewlineIdx = -1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') {
      lineNumber += 1;
      lastNewlineIdx = i;
    }
  }
  return {
    lineNumber,
    columnNumber: index - lastNewlineIdx,
  };
}

/**
 * Formats replacement template supporting both .NET (${name}, $1, $&, $$, $_, $`, $')
 * and JS ($<name>) syntax.
 */
function applyDotNetReplacement(
  testText: string,
  matches: RegexMatchResult[],
  replaceTemplate: string
): string {
  if (matches.length === 0) return testText;

  // Interpret common escape sequences \n, \r, \t if user typed literal backslash + n/t
  const normalizedTemplate = replaceTemplate
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');

  let result = '';
  let lastCursor = 0;

  for (const match of matches) {
    result += testText.slice(lastCursor, match.startIndex);

    // Replace tokens in normalizedTemplate for this match
    let segment = '';
    let idx = 0;
    while (idx < normalizedTemplate.length) {
      const ch = normalizedTemplate[idx];
      if (ch === '$' && idx + 1 < normalizedTemplate.length) {
        const next = normalizedTemplate[idx + 1];

        // $$ -> literal $
        if (next === '$') {
          segment += '$';
          idx += 2;
          continue;
        }
        // $& or $0 -> whole match
        if (next === '&' || (next === '0' && !/\d/.test(normalizedTemplate[idx + 2] || ''))) {
          segment += match.value;
          idx += 2;
          continue;
        }
        // $` -> text before match
        if (next === '`') {
          segment += testText.slice(0, match.startIndex);
          idx += 2;
          continue;
        }
        // $' -> text after match
        if (next === "'") {
          segment += testText.slice(match.endIndex);
          idx += 2;
          continue;
        }
        // $_ -> entire input string (.NET specific)
        if (next === '_') {
          segment += testText;
          idx += 2;
          continue;
        }
        // ${name} or ${number} (.NET style named/numbered replacement)
        if (next === '{') {
          const closeBrace = normalizedTemplate.indexOf('}', idx + 2);
          if (closeBrace !== -1) {
            const key = normalizedTemplate.slice(idx + 2, closeBrace);
            if (/^\d+$/.test(key)) {
              const num = parseInt(key, 10);
              if (num === 0) {
                segment += match.value;
              } else {
                const grp = match.groups.find((g) => g.groupIndex === num);
                segment += grp && grp.value !== undefined ? grp.value : '';
              }
              idx = closeBrace + 1;
              continue;
            } else {
              const grp = match.groups.find((g) => g.name === key);
              segment += grp && grp.value !== undefined ? grp.value : '';
              idx = closeBrace + 1;
              continue;
            }
          }
        }
        // $<name> (JS style named replacement)
        if (next === '<') {
          const closeAngle = normalizedTemplate.indexOf('>', idx + 2);
          if (closeAngle !== -1) {
            const key = normalizedTemplate.slice(idx + 2, closeAngle);
            const grp = match.groups.find((g) => g.name === key);
            segment += grp && grp.value !== undefined ? grp.value : '';
            idx = closeAngle + 1;
            continue;
          }
        }
        // $1 .. $99 numbered group
        const numMatch = normalizedTemplate.slice(idx + 1).match(/^(\d{1,2})/);
        if (numMatch) {
          const numStr = numMatch[1];
          const num = parseInt(numStr, 10);
          const grp = match.groups.find((g) => g.groupIndex === num);
          if (grp) {
            segment += grp.value !== undefined ? grp.value : '';
            idx += 1 + numStr.length;
            continue;
          } else if (numStr.length === 2) {
            // Try 1-digit group fallback
            const singleNum = parseInt(numStr[0], 10);
            const singleGrp = match.groups.find((g) => g.groupIndex === singleNum);
            if (singleGrp) {
              segment += singleGrp.value !== undefined ? singleGrp.value : '';
              idx += 2;
              continue;
            }
          }
        }
      }

      segment += ch;
      idx += 1;
    }

    result += segment;
    lastCursor = match.endIndex;
  }

  result += testText.slice(lastCursor);
  return result;
}

/**
 * Evaluates a .NET / JS regex pattern against testText and computes matches,
 * capture group details (with index, length, and .NET tag syntax), and replacement preview.
 */
export function evaluateDotNetRegex(
  pattern: string,
  userFlags: string,
  testText: string,
  replaceTemplate: string
): EvaluationResult {
  const startTime = performance.now();
  const transpiled = transpileDotNetPattern(pattern, userFlags);

  if (!pattern) {
    return {
      transpiled,
      matches: [],
      replacedText: testText,
      executionTimeMs: 0,
    };
  }

  // Ensure valid flags and append 'd' for indices if supported
  let regex: RegExp;
  let supportsIndices = true;
  try {
    const cleanFlags = Array.from(new Set((transpiled.effectiveFlags + 'd').split(''))).join('');
    regex = new RegExp(transpiled.jsPattern, cleanFlags);
  } catch (err) {
    try {
      supportsIndices = false;
      const fallbackFlags = Array.from(new Set(transpiled.effectiveFlags.split(''))).join('');
      regex = new RegExp(transpiled.jsPattern, fallbackFlags);
    } catch (innerErr) {
      transpiled.error = innerErr instanceof Error ? innerErr.message : String(innerErr);
      return {
        transpiled,
        matches: [],
        replacedText: testText,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      };
    }
  }

  const matches: RegexMatchResult[] = [];
  const isGlobal = regex.global;
  const maxSafetyIterations = 5000;
  let iterations = 0;

  while (iterations < maxSafetyIterations) {
    iterations += 1;
    const execResult = regex.exec(testText);
    if (!execResult) break;

    const matchValue = execResult[0];
    const startIndex = execResult.index;
    const endIndex = startIndex + matchValue.length;
    const { lineNumber, columnNumber } = getLineAndCol(testText, startIndex);

    // Extract capture groups
    const groups: CapturedGroupInstance[] = [];
    const indicesArray = supportsIndices
      ? (execResult as RegExpExecArray & { indices?: Array<[number, number] | undefined> }).indices
      : undefined;

    for (let gIdx = 1; gIdx < execResult.length; gIdx++) {
      const gVal = execResult[gIdx];
      const meta = transpiled.definedGroups[gIdx - 1] || {
        groupIndex: gIdx,
        syntaxType: 'numbered' as const,
        rawTag: `$${gIdx}`,
      };

      let gStart = -1;
      let gEnd = -1;
      if (indicesArray && indicesArray[gIdx]) {
        gStart = indicesArray[gIdx]![0];
        gEnd = indicesArray[gIdx]![1];
      } else if (gVal !== undefined) {
        const relativeIdx = matchValue.indexOf(gVal);
        if (relativeIdx !== -1) {
          gStart = startIndex + relativeIdx;
          gEnd = gStart + gVal.length;
        }
      }

      groups.push({
        groupIndex: gIdx,
        name: meta.name,
        syntaxType: meta.syntaxType,
        rawTag: meta.rawTag,
        value: gVal,
        startIndex: gStart,
        endIndex: gEnd,
        length: gVal !== undefined ? gVal.length : 0,
        matched: gVal !== undefined,
      });
    }

    matches.push({
      matchIndex: matches.length + 1,
      value: matchValue,
      startIndex,
      endIndex,
      length: matchValue.length,
      lineNumber,
      columnNumber,
      groups,
    });

    if (!isGlobal) break;

    // Prevent infinite loop on zero-length matches (e.g., ^, $, \b, or empty group)
    if (matchValue.length === 0) {
      regex.lastIndex += 1;
      if (regex.lastIndex > testText.length) break;
    }
  }

  const replacedText = applyDotNetReplacement(testText, matches, replaceTemplate);
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    transpiled,
    matches,
    replacedText,
    executionTimeMs,
  };
}
