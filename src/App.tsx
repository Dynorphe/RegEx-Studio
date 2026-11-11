/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  WrapText,
  AlignLeft,
  AlertCircle,
  Sparkles,
  Replace,
  Table as TableIcon,
  Sun,
  Moon,
  Trash2,
  Eye,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react';
import { evaluateDotNetRegex } from './utils/dotnetRegex';
import { REGEX_PRESETS, RegexPreset } from './data/regexPresetsAndCheatsheet';
import { HighlightViewport } from './components/HighlightViewport';
import { CheatSheetPanel } from './components/CheatSheetPanel';
import { PatternHighlightedInput } from './components/PatternHighlightedInput';
import { getGroupColor } from './utils/groupColors';

const FLAG_OPTIONS = [
  { flag: 'g', label: 'g 全局', desc: '全局匹配所有结果 (Global)' },
  { flag: 'i', label: 'i 忽略大小写', desc: '不区分大小写 (IgnoreCase)' },
  { flag: 'm', label: 'm 多行', desc: '^ 和 $ 匹配每行首尾 (Multiline)' },
  { flag: 's', label: 's 单行通配', desc: '. 匹配包含换行符在内的所有字符 (Singleline)' },
];

type ColumnKey = 'id' | 'tag' | 'index' | 'length' | 'lineCol' | 'value' | 'action';

const INITIAL_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  id: 190,
  tag: 210,
  index: 105,
  length: 95,
  lineCol: 105,
  value: 380,
  action: 68,
};

export default function App() {
  const defaultPreset = REGEX_PRESETS[0];

  const [pattern, setPattern] = useState<string>(defaultPreset.pattern);
  const [flags, setFlags] = useState<string>(defaultPreset.flags);
  const [testText, setTestText] = useState<string>(defaultPreset.sampleText);
  const [replaceTemplate, setReplaceTemplate] = useState<string>(defaultPreset.replaceTemplate);

  // User layout & inspection preferences
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(true);
  const [showWhitespace, setShowWhitespace] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'groups' | 'replace'>('groups');
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  const [groupFilterName, setGroupFilterName] = useState<string>('all');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Collapsible states for bottom inspector & individual Match rows
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState<boolean>(false);
  const [collapsedMatches, setCollapsedMatches] = useState<Set<number>>(new Set());

  // Resizable table column widths
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(
    INITIAL_COLUMN_WIDTHS
  );
  const resizingRef = useRef<{
    col: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Copy states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const patternInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle mouse drag for resizing table columns
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const nextWidth = Math.max(64, startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [col]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startColumnResize = (
    col: ColumnKey,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      col,
      startX: e.clientX,
      startWidth: columnWidths[col],
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Evaluate regex in real time
  const evaluation = useMemo(() => {
    return evaluateDotNetRegex(pattern, flags, testText, replaceTemplate);
  }, [pattern, flags, testText, replaceTemplate]);

  const { transpiled, matches, replacedText, executionTimeMs } = evaluation;

  const totalCapturedGroupsCount = useMemo(() => {
    return matches.reduce(
      (acc, m) => acc + m.groups.filter((g) => g.matched).length,
      0
    );
  }, [matches]);

  const toggleFlag = (flagChar: string) => {
    setFlags((prev) =>
      prev.includes(flagChar)
        ? prev.replace(flagChar, '')
        : prev + flagChar
    );
  };

  const applyPreset = (preset: RegexPreset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestText(preset.sampleText);
    setReplaceTemplate(preset.replaceTemplate);
    setActiveMatchIndex(null);
    setGroupFilterName('all');
    setCollapsedMatches(new Set());
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const insertIntoPattern = (snippet: string) => {
    const input = patternInputRef.current;
    if (!input) {
      setPattern((prev) => prev + snippet);
      return;
    }
    const start = input.selectionStart ?? pattern.length;
    const end = input.selectionEnd ?? pattern.length;
    const nextPattern = pattern.slice(0, start) + snippet + pattern.slice(end);
    setPattern(nextPattern);
    setTimeout(() => {
      input.focus();
      const cursor = start + snippet.length;
      input.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const insertIntoReplace = (token: string) => {
    setReplaceTemplate((prev) => prev + token);
    setActiveBottomTab('replace');
    setIsBottomPanelCollapsed(false);
  };

  const toggleMatchRowCollapse = (matchIndex: number) => {
    setCollapsedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchIndex)) {
        next.delete(matchIndex);
      } else {
        next.add(matchIndex);
      }
      return next;
    });
  };

  const collapseAllMatches = () => {
    setCollapsedMatches(new Set(matches.map((m) => m.matchIndex)));
  };

  const expandAllMatches = () => {
    setCollapsedMatches(new Set());
  };

  const testTextLineCount = useMemo(() => {
    return Math.max(1, testText.split('\n').length);
  }, [testText]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#workbench"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          RegEx Studio
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#workbench"
            className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            工作台
          </a>
          <a
            href="#presets-bar"
            className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            常用模板
          </a>
          <a
            href="#inspector-section"
            onClick={() => {
              setActiveBottomTab('groups');
              setIsBottomPanelCollapsed(false);
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            捕获分组
          </a>
          <a
            href="#inspector-section"
            onClick={() => {
              setActiveBottomTab('replace');
              setIsBottomPanelCollapsed(false);
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            替换测试
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCheatSheet
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showCheatSheet ? '隐藏速查表' : '打开速查表'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="workbench" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        {/* Top Utility & Presets Strip */}
        <section
          id="presets-bar"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
              预设模板:
            </span>
            {REGEX_PRESETS.map((preset) => {
              const isActive = pattern === preset.pattern;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => applyPreset(defaultPreset)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="重置为默认示例"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>

            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="切换浅色/深色外观"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>浅色模式</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>深色模式</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Workspace Layout: Left Main Column + Right Collapsible Cheat Sheet */}
        <div className="flex flex-col lg:flex-row items-start gap-5">
          {/* Left Main Workbench Column */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Pattern Input Box & Flags Section */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="regex-pattern-input"
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                  >
                    正则表达式
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · 支持{' '}
                    <code className="text-blue-600 dark:text-blue-400 font-mono">
                      (?&lt;name&gt;...)
                    </code>{' '}
                    与{' '}
                    <code className="text-blue-600 dark:text-blue-400 font-mono">
                      (?&#39;name&#39;...)
                    </code>{' '}
                    括号配对高亮
                  </span>
                </div>

                {/* Quick .NET Group Snippet Insertion Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    快捷插入:
                  </span>
                  <button
                    onClick={() => insertIntoPattern('(?<name>\\w+)')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="插入 .NET 尖括号命名捕获组"
                  >
                    <Plus className="w-3 h-3" />
                    <span>(?&lt;name&gt;...)</span>
                  </button>
                  <button
                    onClick={() => insertIntoPattern("(?'name'\\w+)")}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="插入 .NET 单引号命名捕获组"
                  >
                    <Plus className="w-3 h-3" />
                    <span>(?&#39;name&#39;...)</span>
                  </button>
                  <button
                    onClick={() => insertIntoPattern('\\k<name>')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="插入 .NET 命名反向引用"
                  >
                    <Plus className="w-3 h-3" />
                    <span>\k&lt;name&gt;</span>
                  </button>
                </div>
              </div>

              {/* Highlighted Pattern Input Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div
                  className={`flex-1 min-w-0 flex items-center bg-slate-50 dark:bg-slate-950 border rounded-md px-3 py-2 transition-colors ${
                    transpiled.error
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-400'
                  }`}
                >
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-base select-none mr-1.5 shrink-0">
                    /
                  </span>

                  <PatternHighlightedInput
                    id="regex-pattern-input"
                    value={pattern}
                    onChange={setPattern}
                    placeholder="在此输入正则表达式，例如 (?<year>\d{4})-(?'month'\d{2})"
                    inputRef={patternInputRef}
                  />

                  <span className="text-slate-400 dark:text-slate-500 font-mono text-base select-none ml-1.5 shrink-0">
                    /{transpiled.effectiveFlags}
                  </span>

                  {pattern && (
                    <button
                      onClick={() => setPattern('')}
                      className="ml-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xs cursor-pointer shrink-0"
                      title="清空正则表达式"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(pattern, 'pattern')}
                    className="ml-1 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xs cursor-pointer shrink-0"
                    title="复制正则表达式"
                  >
                    {copiedKey === 'pattern' ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Flags Segmented Controls */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-md shrink-0">
                  {FLAG_OPTIONS.map((item) => {
                    const active = flags.includes(item.flag);
                    return (
                      <button
                        key={item.flag}
                        onClick={() => toggleFlag(item.flag)}
                        title={item.desc}
                        className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Banner or Synced Group Color Legend Bar */}
              {transpiled.error ? (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-mono break-all">
                    语法错误：{transpiled.error}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  {/* Defined Groups List with Synced Colors */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      捕获分组 ({transpiled.definedGroups.length}):
                    </span>
                    {transpiled.definedGroups.length === 0 ? (
                      <span>无捕获分组</span>
                    ) : (
                      <>
                        {groupFilterName !== 'all' && (
                          <button
                            onClick={() => setGroupFilterName('all')}
                            className="px-1.5 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            显示全部
                          </button>
                        )}
                        {transpiled.definedGroups.map((g) => {
                          const color = getGroupColor(g.groupIndex);
                          const key = g.name ? g.name : `$${g.groupIndex}`;
                          const isSelected = groupFilterName === key;
                          return (
                            <button
                              key={g.groupIndex}
                              onClick={() => {
                                setGroupFilterName(
                                  isSelected ? 'all' : key
                                );
                                setActiveBottomTab('groups');
                                setIsBottomPanelCollapsed(false);
                              }}
                              className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                color.badgeBg
                              } ${color.badgeText} ${
                                isSelected
                                  ? 'ring-2 ring-blue-600 dark:ring-blue-400'
                                  : 'opacity-90 hover:opacity-100'
                              }`}
                              title={`点击筛选该分组 (${
                                g.syntaxType === 'dotnet-quote'
                                  ? '.NET 单引号命名分组'
                                  : g.syntaxType === 'dotnet-angle'
                                  ? '.NET 尖括号命名分组'
                                  : '序号捕获组'
                              })`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${color.dotBg}`}
                              />
                              <span className="opacity-70">#{g.groupIndex}</span>
                              <span className="font-semibold">{g.rawTag}</span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* .NET Compatibility Transpilation Note */}
                  {transpiled.transpiledNotes.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{transpiled.transpiledNotes.join(' · ')}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Test Text & Match Highlighting Workbench */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              {/* Shared Control Bar with Word Wrap Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  <span>
                    匹配结果:{' '}
                    <strong className="text-blue-600 dark:text-blue-400 font-mono">
                      {matches.length}
                    </strong>{' '}
                    处
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    捕获分组:{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {totalCapturedGroupsCount}
                    </strong>{' '}
                    个
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    耗时:{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {executionTimeMs} ms
                    </strong>
                  </span>
                </div>

                {/* Interactive Toggles: Word Wrap Switch & Whitespace Switch */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setWordWrap((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      wordWrap
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-blue-500'
                    }`}
                    title="开启或关闭自动换行。关闭自动换行时可横向滚动核对长文本"
                  >
                    {wordWrap ? (
                      <>
                        <WrapText className="w-3.5 h-3.5" />
                        <span>自动换行: 开启</span>
                      </>
                    ) : (
                      <>
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span>自动换行: 关闭</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowWhitespace((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      showWhitespace
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                    title="将空格显示为中点 (·)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>显示空格</span>
                  </button>
                </div>
              </div>

              {/* Test Text Input */}
              <div className="border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="test-text-textarea"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      测试文本
                    </label>
                    <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                      · {testText.length} 字符 · {testTextLineCount} 行
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(testText, 'testText')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'testText' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>复制</span>
                    </button>
                    <button
                      onClick={() => setTestText('')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清空</span>
                    </button>
                  </div>
                </div>

                <div className="relative flex max-h-64 overflow-y-auto bg-white dark:bg-slate-950">
                  <div
                    aria-hidden="true"
                    className="select-none shrink-0 py-3 px-2.5 text-right text-xs font-mono leading-6 text-slate-400 dark:text-slate-600 bg-slate-50/80 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 tabular-nums"
                  >
                    {Array.from({ length: testTextLineCount }, (_, idx) => (
                      <div key={idx} className="leading-6">
                        {idx + 1}
                      </div>
                    ))}
                  </div>

                  <textarea
                    id="test-text-textarea"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={Math.min(10, Math.max(5, testTextLineCount))}
                    wrap={wordWrap ? 'soft' : 'off'}
                    spellCheck={false}
                    placeholder="在此输入或粘贴待测试的文本..."
                    className={`flex-1 py-3 px-4 font-mono text-sm leading-6 text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none resize-y ${
                      wordWrap
                        ? 'whitespace-pre-wrap break-all overflow-x-hidden'
                        : 'whitespace-pre overflow-x-auto'
                    }`}
                  />
                </div>
              </div>

              {/* Match Results Highlighted */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      匹配结果
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      · 悬停高亮片段可查看对应分组名称与位置信息
                    </span>
                  </div>

                  {matches.length > 0 && (
                    <button
                      onClick={() =>
                        copyToClipboard(
                          matches.map((m) => m.value).join('\n'),
                          'allMatches'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'allMatches' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>复制全部匹配 ({matches.length} 项)</span>
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto bg-white dark:bg-slate-950">
                  <HighlightViewport
                    testText={testText}
                    matches={matches}
                    wordWrap={wordWrap}
                    showWhitespace={showWhitespace}
                    activeMatchIndex={activeMatchIndex}
                    activeGroupFilter={groupFilterName}
                    onSelectMatch={setActiveMatchIndex}
                  />
                </div>
              </div>
            </section>

            {/* Bottom Inspector Section: Collapsible & Resizable Capture Group Table / Replacement Test */}
            <section
              id="inspector-section"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Tabs & Folding Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                    <button
                      onClick={() => {
                        setActiveBottomTab('groups');
                        setIsBottomPanelCollapsed(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeBottomTab === 'groups'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>
                        捕获分组 ({matches.length} 处匹配 /{' '}
                        {totalCapturedGroupsCount} 个分组)
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveBottomTab('replace');
                        setIsBottomPanelCollapsed(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeBottomTab === 'replace'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Replace className="w-3.5 h-3.5" />
                      <span>替换测试 ($1 / $&#123;name&#125;)</span>
                    </button>
                  </div>
                </div>

                {/* Right Toolbar: Expand/Collapse All Matches, Filter, and Panel Collapse */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isBottomPanelCollapsed &&
                    activeBottomTab === 'groups' &&
                    matches.length > 0 && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          onClick={expandAllMatches}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title="展开所有匹配项的子分组"
                        >
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                          <span>全部展开</span>
                        </button>
                        <button
                          onClick={collapseAllMatches}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title="折叠所有匹配项的子分组，仅看全文匹配"
                        >
                          <span>全部折叠</span>
                        </button>
                      </div>
                    )}

                  <button
                    onClick={() =>
                      setIsBottomPanelCollapsed((prev) => !prev)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isBottomPanelCollapsed ? (
                      <>
                        <PanelBottomOpen className="w-3.5 h-3.5" />
                        <span>展开列表</span>
                      </>
                    ) : (
                      <>
                        <PanelBottomClose className="w-3.5 h-3.5" />
                        <span>折叠列表</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Panel Body (Hidden when collapsed) */}
              {!isBottomPanelCollapsed && (
                <>
                  {activeBottomTab === 'groups' ? (
                    <div className="overflow-x-auto max-h-96">
                      {matches.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                          当前没有匹配项。请调整正则表达式或测试文本。
                        </div>
                      ) : (
                        <table
                          style={{
                            width:
                              Object.values(columnWidths).reduce(
                                (a, b) => a + b,
                                0
                              ) + 'px',
                            minWidth: '100%',
                          }}
                          className="table-fixed text-left border-collapse text-xs font-mono tabular-nums"
                        >
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-sans select-none">
                              <th
                                style={{ width: `${columnWidths.id}px` }}
                                className="relative py-2.5 px-3 font-semibold truncate"
                              >
                                <span>匹配 / 分组序号</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('id', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.tag}px` }}
                                className="relative py-2.5 px-3 font-semibold truncate"
                              >
                                <span>分组名称 / 标签</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('tag', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.index}px` }}
                                className="relative py-2.5 px-3 font-semibold text-right truncate"
                              >
                                <span>起始索引 (Index)</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('index', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.length}px` }}
                                className="relative py-2.5 px-3 font-semibold text-right truncate"
                              >
                                <span>长度 (Length)</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('length', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.lineCol}px` }}
                                className="relative py-2.5 px-3 font-semibold text-right truncate"
                              >
                                <span>行列 (Line:Col)</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('lineCol', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.value}px` }}
                                className="relative py-2.5 px-3 font-semibold truncate"
                              >
                                <span>匹配 / 捕获内容</span>
                                <div
                                  onMouseDown={(e) =>
                                    startColumnResize('value', e)
                                  }
                                  title="左右拖动调整列宽"
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 transition-colors"
                                />
                              </th>

                              <th
                                style={{ width: `${columnWidths.action}px` }}
                                className="py-2.5 px-3 font-semibold text-right truncate"
                              >
                                复制
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {matches.map((m) => {
                              const isHighlighted =
                                activeMatchIndex === m.matchIndex;
                              const isMatchCollapsed = collapsedMatches.has(
                                m.matchIndex
                              );
                              const visibleGroups = m.groups.filter((g) => {
                                if (groupFilterName === 'all') return true;
                                const key = g.name
                                  ? g.name
                                  : `$${g.groupIndex}`;
                                return key === groupFilterName;
                              });

                              return (
                                <React.Fragment key={m.matchIndex}>
                                  {/* Full Match Row ($0) */}
                                  {groupFilterName === 'all' && (
                                    <tr
                                      onMouseEnter={() =>
                                        setActiveMatchIndex(m.matchIndex)
                                      }
                                      onClick={() =>
                                        toggleMatchRowCollapse(m.matchIndex)
                                      }
                                      className={`cursor-pointer transition-colors ${
                                        isHighlighted
                                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                                          : 'bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                      }`}
                                    >
                                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        <div className="flex items-center gap-1.5">
                                          {m.groups.length > 0 ? (
                                            isMatchCollapsed ? (
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            ) : (
                                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )
                                          ) : (
                                            <span className="w-3.5 inline-block shrink-0" />
                                          )}
                                          <span>Match #{m.matchIndex}</span>
                                          <span className="text-slate-400 font-normal">
                                            ($0)
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate">
                                        全文匹配
                                        {m.groups.length > 0 &&
                                          isMatchCollapsed && (
                                            <span className="ml-1.5 text-[11px] text-blue-600 dark:text-blue-400">
                                              (已折叠 {m.groups.length} 个分组)
                                            </span>
                                          )}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 truncate">
                                        {m.startIndex}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 truncate">
                                        {m.length}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 truncate">
                                        {m.lineNumber}:{m.columnNumber}
                                      </td>
                                      <td className="py-2 px-3 text-slate-900 dark:text-slate-100 break-all">
                                        <span className="bg-blue-100/70 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-xs">
                                          {m.value}
                                        </span>
                                      </td>
                                      <td
                                        className="py-2 px-3 text-right"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() =>
                                            copyToClipboard(
                                              m.value,
                                              `m-${m.matchIndex}`
                                            )
                                          }
                                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                          title="复制此匹配项"
                                        >
                                          {copiedKey === `m-${m.matchIndex}` ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500 inline" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5 inline" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  )}

                                  {/* Sub-groups for this match (hidden if match is collapsed) */}
                                  {(!isMatchCollapsed ||
                                    groupFilterName !== 'all') &&
                                    visibleGroups.map((g) => {
                                      const color = getGroupColor(g.groupIndex);
                                      return (
                                        <tr
                                          key={`${m.matchIndex}-${g.groupIndex}`}
                                          onMouseEnter={() =>
                                            setActiveMatchIndex(m.matchIndex)
                                          }
                                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                          <td className="py-2 pl-8 pr-3 text-slate-500 dark:text-slate-400 truncate">
                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${color.dotBg}`}
                                              />
                                              <span>Group #{g.groupIndex}</span>
                                              <span className="text-slate-400">
                                                (${g.groupIndex})
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 truncate">
                                            {g.name ? (
                                              <div className="flex items-center gap-1.5 truncate">
                                                <span
                                                  className={`font-semibold ${color.badgeText}`}
                                                >
                                                  {g.name}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                  · {g.rawTag}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-slate-400">
                                                序号组 (${g.groupIndex})
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 truncate">
                                            {g.matched && g.startIndex >= 0
                                              ? g.startIndex
                                              : '-'}
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 truncate">
                                            {g.matched ? g.length : 0}
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-400 truncate">
                                            -
                                          </td>
                                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200 break-all">
                                            {g.matched ? (
                                              <span
                                                className={`px-1.5 py-0.5 rounded-xs ${color.segmentBg} ${color.segmentText}`}
                                              >
                                                {g.value}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 italic font-sans">
                                                未参与匹配
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            {g.matched &&
                                              g.value !== undefined && (
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(
                                                      g.value || '',
                                                      `g-${m.matchIndex}-${g.groupIndex}`
                                                    )
                                                  }
                                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                                  title="复制捕获组内容"
                                                >
                                                  {copiedKey ===
                                                  `g-${m.matchIndex}-${g.groupIndex}` ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 inline" />
                                                  ) : (
                                                    <Copy className="w-3.5 h-3.5 inline" />
                                                  )}
                                                </button>
                                              )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    /* TAB 2: Live Regex Replacement Test ($1 and ${name}) */
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor="replace-template-input"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                          >
                            替换表达式 · 支持{' '}
                            <code className="text-blue-600 dark:text-blue-400 font-mono">
                              $1
                            </code>
                            、
                            <code className="text-blue-600 dark:text-blue-400 font-mono">
                              $&#123;name&#125;
                            </code>{' '}
                            与{' '}
                            <code className="text-blue-600 dark:text-blue-400 font-mono">
                              $&lt;name&gt;
                            </code>
                          </label>

                          {/* Quick Insert Group Tokens for Replacement */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-slate-400 mr-1">
                              点击插入分组引用:
                            </span>
                            <button
                              onClick={() => insertIntoReplace('$&')}
                              className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 rounded-xs cursor-pointer"
                              title="插入全文匹配 $&"
                            >
                              $&amp;
                            </button>
                            {transpiled.definedGroups.map((g) => {
                              const token = g.name
                                ? `\${${g.name}}`
                                : `$${g.groupIndex}`;
                              const color = getGroupColor(g.groupIndex);
                              return (
                                <button
                                  key={g.groupIndex}
                                  onClick={() => insertIntoReplace(token)}
                                  className={`px-2 py-0.5 text-xs font-mono rounded-xs cursor-pointer ${color.badgeBg} ${color.badgeText}`}
                                  title={`插入分组 #${g.groupIndex} 引用`}
                                >
                                  {token}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="replace-template-input"
                            type="text"
                            value={replaceTemplate}
                            onChange={(e) => setReplaceTemplate(e.target.value)}
                            placeholder="输入替换表达式，例如 [${level}] ${date} ($1)"
                            spellCheck={false}
                            className="flex-1 px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                          />
                          <button
                            onClick={() =>
                              copyToClipboard(replacedText, 'replacedText')
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {copiedKey === 'replacedText' ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>复制结果</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Replaced Output Preview */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>替换结果预览:</span>
                          <span>
                            已替换 {matches.length} 处匹配 · 自动换行:{' '}
                            {wordWrap ? '开启' : '关闭'}
                          </span>
                        </div>
                        <pre
                          className={`p-3.5 max-h-64 overflow-y-auto font-mono text-sm leading-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200 ${
                            wordWrap
                              ? 'whitespace-pre-wrap break-all overflow-x-hidden'
                              : 'whitespace-pre overflow-x-auto'
                          }`}
                        >
                          {replacedText || '（空结果）'}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Toggleable Regex Cheat Sheet Side Panel */}
          {showCheatSheet && (
            <CheatSheetPanel
              onInsertToken={insertIntoPattern}
              onClose={() => setShowCheatSheet(false)}
            />
          )}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            RegEx Studio · 纯静态客户端正则表达式检查工具（可直接托管至 GitHub Pages）
          </div>
          <div className="flex items-center gap-3">
            <span>支持 (?&lt;name&gt;...)</span>
            <span aria-hidden="true">·</span>
            <span>支持 (?&#39;name&#39;...)</span>
            <span aria-hidden="true">·</span>
            <span>支持 $1 / $&#123;name&#125; 替换</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
