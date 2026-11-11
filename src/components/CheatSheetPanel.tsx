import React, { useState } from 'react';
import { Search, Copy, Check, Plus, X, BookOpen } from 'lucide-react';
import { CHEAT_SHEET_CATEGORIES, CheatSheetItem } from '../data/regexPresetsAndCheatsheet';

interface CheatSheetPanelProps {
  onInsertToken: (token: string) => void;
  onClose: () => void;
}

export const CheatSheetPanel: React.FC<CheatSheetPanelProps> = ({
  onInsertToken,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopy = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanToken = token.split(' / ')[0];
    navigator.clipboard.writeText(cleanToken);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const handleInsert = (item: CheatSheetItem) => {
    // Extract actionable pattern snippet if token has alternatives like "*? / +?"
    const raw = item.token.split(' / ')[0].replace(/\s*\(.*?\)$/, '');
    onInsertToken(raw);
  };

  const filteredCategories = CHEAT_SHEET_CATEGORIES.map((cat) => {
    if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
      return { ...cat, items: [] };
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cat;
    return {
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.token.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.example && item.example.toLowerCase().includes(q))
      ),
    };
  }).filter((cat) => cat.items.length > 0);

  return (
    <aside className="w-full lg:w-96 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col max-h-[calc(100vh-7rem)] lg:sticky lg:top-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            正则表达式速查表 (.NET & JS)
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
          title="关闭速查表"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索语法如 (?<name>、断言、量词..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Segmented Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            全部
          </button>
          {CHEAT_SHEET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {cat.id === 'dotnet-groups' ? '.NET 分组' : cat.name.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Syntax List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            没有找到匹配的正则语法条目
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                <span>{category.name}</span>
                {category.badge && (
                  <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">
                    {category.badge}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                {category.items.map((item) => (
                  <div
                    key={item.token}
                    className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="text-xs font-semibold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-xs shrink-0">
                          {item.token}
                        </code>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleInsert(item)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title="插入到当前正则表达式末尾"
                        >
                          <Plus className="w-3 h-3" />
                          <span>插入</span>
                        </button>
                        <button
                          onClick={(e) => handleCopy(item.token, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xs transition-colors cursor-pointer"
                          title="复制语法"
                        >
                          {copiedToken === item.token ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                    {item.example && (
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        示例: <span className="text-slate-600 dark:text-slate-300">{item.example}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
