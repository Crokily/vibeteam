import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { ipcClient } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/app-store';

const terminalTheme = {
  background: '#292f39',
  foreground: '#e2e8f0', // iron
  cursor: '#f97316',     // accent
  selection: 'rgba(255, 255, 255, 0.1)',
  black: '#0a0f14',      // ink
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#d946ef',
  cyan: '#06b6d4',
  white: '#f8fafc',
  brightBlack: '#475569',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
} as const;

type XTermTerminalProps = {
  taskId: string;
  active: boolean;
  canInteract: boolean;
  onInteractionSubmitted: (taskId: string) => void;
};

const EMPTY_OUTPUT: string[] = [];

export const XTermTerminal = ({
  taskId,
  active,
  canInteract,
  onInteractionSubmitted,
}: XTermTerminalProps) => {
  const executionMode = useAppStore(
    (state) => state.taskMeta[taskId]?.executionMode ?? 'interactive'
  );
  const output =
    useAppStore((state) => {
      const entry = state.taskOutputs[taskId];
      if (!entry) {
        return EMPTY_OUTPUT;
      }
      return entry.raw;
    }) ?? EMPTY_OUTPUT;
  const isHeadless = executionMode === 'headless';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const outputIndexRef = useRef(0);
  const executionModeRef = useRef(executionMode);
  const canInteractRef = useRef(canInteract);
  const interactionRef = useRef(onInteractionSubmitted);

  useEffect(() => {
    canInteractRef.current = canInteract;
  }, [canInteract]);

  useEffect(() => {
    interactionRef.current = onInteractionSubmitted;
  }, [onInteractionSubmitted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily:
        '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      convertEol: isHeadless,
      disableStdin: isHeadless,
      scrollback: 5000,
      theme: terminalTheme,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    const inputDisposable = terminal.onData((data) => {
      if (!canInteractRef.current || !window.electronAPI) {
        return;
      }

      void ipcClient.task.interact(taskId, data).catch(() => undefined);
      interactionRef.current(taskId);
    });

    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (!window.electronAPI) {
        return;
      }

      void ipcClient.task.resize(taskId, cols, rows).catch(() => undefined);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      resizeObserver.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [taskId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    const modeChanged = executionModeRef.current !== executionMode;
    if (modeChanged) {
      executionModeRef.current = executionMode;
      terminal.options.convertEol = isHeadless;
      terminal.options.disableStdin = isHeadless;
      terminal.reset();
      outputIndexRef.current = 0;
    }

    if (output.length < outputIndexRef.current) {
      terminal.reset();
      outputIndexRef.current = 0;
    }

    if (output.length > outputIndexRef.current) {
      const chunk = output.slice(outputIndexRef.current).join('');
      if (chunk.length > 0) {
        terminal.write(chunk);
      }
      outputIndexRef.current = output.length;
    }
  }, [executionMode, isHeadless, output]);

  useEffect(() => {
    if (!active) {
      return;
    }

    terminalRef.current?.focus();
    fitAddonRef.current?.fit();
  }, [active]);

  const handleComplete = () => {
    void ipcClient.task.complete(taskId).catch(() => undefined);
  };

  return (
    <div
      className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      } bg-[#292f39]`}
      aria-hidden={!active}
    >
      <div className="relative flex-1 min-h-0 p-4 pb-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      
      {!isHeadless && (
        <div className="flex items-center justify-between border-t border-white/5 bg-[#292f39] px-4 py-2 text-xs text-[#e2e8f0]">
          <span className="opacity-50">When this task has finished running, click —&gt;</span>
          <button
            onClick={handleComplete}
            className="rounded-full border border-border/60 bg-transparent px-3 py-1 text-xs text-ash transition hover:border-iron/60 hover:text-iron active:bg-white/5"
          >
            Finish
          </button>
        </div>
      )}
    </div>
  );
};
