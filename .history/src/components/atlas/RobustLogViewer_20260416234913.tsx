import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Search, Maximize2, Minimize2, AlertCircle, Terminal, Bot, User, Info, AlertTriangle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LogEntry, LogType, TruncatedLogEntry, LogGroup } from '@/types';
import { cn } from '@/lib/utils';

const MAX_MESSAGE_LENGTH = 500;
const MAX_VISIBLE_ENTRIES_PER_GROUP = 100;
const MAX_ENTRY_LINES = 5;
const MAX_ENTRY_HEIGHT = 32; // lines approx

interface RobustLogViewerProps {
  logs: LogEntry[];
  className?: string;
  initiallyCollapsed?: LogType[];
}

// Helper to extract time portion from timestamp
const getTimeString = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return timestamp.slice(11, 19) || timestamp;
  }
};

// Truncation styles
const truncatedStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  maxHeight: '4.5em',
  overflowWrap: 'break-word',
};

const expandedStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export const RobustLogViewer: React.FC<RobustLogViewerProps> = ({
  logs,
  className,
  initiallyCollapsed = [LogType.ERROR]
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(initiallyCollapsed.map(t => t))
  );
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const logTypeConfig: Record<LogType, { label: string; colorClass: string; icon: React.ReactNode; bgClass: string }> = {
    [LogType.SYSTEM]: { label: 'SYSTEM', colorClass: 'text-cyan-400', icon: <Terminal className="h-3 w-3" />, bgClass: 'bg-cyan-950/30' },
    [LogType.AI]: { label: 'AI', colorClass: 'text-purple-400', icon: <Bot className="h-3 w-3" />, bgClass: 'bg-purple-950/30' },
    [LogType.ERROR]: { label: 'ERROR', colorClass: 'text-red-400', icon: <AlertTriangle className="h-3 w-3" />, bgClass: 'bg-red-950/30' },
    [LogType.USER]: { label: 'USER', colorClass: 'text-green-400', icon: <User className="h-3 w-3" />, bgClass: 'bg-green-950/30' },
    [LogType.INFO]: { label: 'INFO', colorClass: 'text-blue-400', icon: <Info className="h-3 w-3" />, bgClass: 'bg-blue-950/30' },
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    setIsNearBottom(distanceFromBottom < 50);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (viewportRef.current && isNearBottom) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [isNearBottom]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const toggleEntry = useCallback((entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedGroups(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    const allTypes = Object.keys(logTypeConfig) as LogType[];
    setCollapsedGroups(new Set(allTypes));
  }, []);

  const processLogs = useCallback((): LogGroup[] => {
    const groupsMap = new Map<LogType, TruncatedLogEntry[]>();

    logs.forEach((log) => {
      const truncated = log.message.length > MAX_MESSAGE_LENGTH;
      const displayMessage = truncated
        ? log.message.slice(0, MAX_MESSAGE_LENGTH) + '...'
        : log.message;

      const entry: TruncatedLogEntry = {
        id: `${log.id}-${log.timestamp}`,
        type: log.type,
        message: displayMessage,
        timestamp: log.timestamp,
        truncated,
        originalLength: log.message.length,
        groupId: log.type,
      };

      const existing = groupsMap.get(log.type) || [];
      existing.push(entry);
      groupsMap.set(log.type, existing);
    });

    const groups: LogGroup[] = [];
    groupsMap.forEach((entries, type) => {
      const config = logTypeConfig[type];
      const collapsed = collapsedGroups.has(type);
      const visibleEntries = collapsed && entries.length > MAX_VISIBLE_ENTRIES_PER_GROUP
        ? entries.slice(0, MAX_VISIBLE_ENTRIES_PER_GROUP)
        : entries;

      groups.push({
        id: type,
        type,
        label: config.label,
        colorClass: config.colorClass,
        icon: config.icon,
        bgClass: config.bgClass,
        entries: visibleEntries,
        collapsed,
        totalCount: entries.length,
        visibleCount: visibleEntries.length,
      });
    });

    const typeOrder: LogType[] = [LogType.ERROR, LogType.WARN, LogType.SYSTEM, LogType.AI, LogType.USER, LogType.INFO];
    return groups.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
  }, [logs, collapsedGroups]);

  const filteredGroups = useMemo(() => {
    const groups = processLogs();

    if (!searchQuery.trim()) return groups;

    return groups
      .map(group => ({
        ...group,
        entries: group.entries.filter(entry =>
          entry.message.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(group => group.entries.length > 0);
  }, [processLogs, searchQuery]);

  useEffect(() => {
    scrollToBottom();
  }, [logs.length, scrollToBottom]);

  return (
    <div className={cn("h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono", className)}>
      <div className="flex-shrink-0 flex items-center gap-2 p-2 border-b border-zinc-800/50">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={expandAll}
          className="h-8 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
          title="Expand all groups"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={collapseAll}
          className="h-8 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
          title="Collapse all groups"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea onScrollCapture={handleScroll}>
          <div ref={viewportRef} className="p-4 space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center text-zinc-600 py-10">
                {searchQuery ? 'No logs match your search' : 'No logs to display'}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    "rounded-lg border border-zinc-800/50 overflow-hidden transition-colors",
                    group.bgClass
                  )}
                >
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors"
                  >
                    {group.collapsed ? (
                      <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <span className={cn("font-bold text-xs uppercase tracking-wider flex items-center gap-1.5", group.colorClass)}>
                      {group.icon}
                      {group.label}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs bg-zinc-900/50 border-zinc-700 text-zinc-400">
                      {group.totalCount}
                    </Badge>
                    {group.totalCount > MAX_VISIBLE_ENTRIES_PER_GROUP && group.collapsed && (
                      <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
                        Showing {MAX_VISIBLE_ENTRIES_PER_GROUP}
                      </Badge>
                    )}
                  </button>

                  {!group.collapsed && (
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-zinc-800/30">
                      {group.entries.map((entry) => {
                        const isExpanded = expandedEntries.has(entry.id);
                        const isTruncated = entry.truncated && !isExpanded;

                        return (
                          <div
                            key={entry.id}
                            className="group flex flex-col bg-zinc-900/50 rounded border border-zinc-800/50 overflow-hidden"
                          >
                            <div className="flex items-start gap-2 p-2">
                              <span className="text-zinc-600 text-[10px] font-mono mt-0.5 flex-shrink-0">
                                {getTimeString(entry.timestamp)}
                              </span>
                              <div
                                style={isTruncated ? truncatedStyle : expandedStyle}
                                className="flex-1"
                              >
                                {entry.message}
                              </div>
                              {isTruncated && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleEntry(entry.id)}
                                  className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white flex-shrink-0 ml-1"
                                >
                                  Show all ({entry.originalLength - MAX_MESSAGE_LENGTH} chars)
                                </Button>
                              )}
                              {entry.truncated && isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleEntry(entry.id)}
                                  className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white flex-shrink-0"
                                >
                                  Show less
                                </Button>
                              )}
                            </div>

                            {isTruncated && (
                              <div className="px-2 pb-2">
                                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Message truncated at {MAX_MESSAGE_LENGTH} characters</span>
                                </div>
                                <div className="h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-transparent mt-1" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {group.totalCount > group.visibleCount && (
                        <div className="px-2 py-2 text-center">
                          <Badge variant="outline" className="text-xs bg-zinc-800/50 border-zinc-700 text-zinc-400">
                            {group.totalCount - group.visibleCount} more entries hidden
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default RobustLogViewer;
