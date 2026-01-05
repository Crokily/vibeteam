import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { ipcClient } from '../../lib/ipc-client';
import { useAppStore } from '../../stores/app-store';

const terminalTheme = {
  background: '#0a0f14',
  foreground: '#e2e8f0',
  cursor: '#f97316',
  selection: 'rgba(249, 115, 22, 0.25)',
  black: '#0a0f14',
  red: '#f87171',
  green: '#34d399',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#fb923c',
  cyan: '#22d3ee',
  white: '#e2e8f0',
  brightBlack: '#1f2937',
  brightRed: '#fca5a5',
  brightGreen: '#6ee7b7',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#fdba74',
  brightCyan: '#67e8f9',
  brightWhite: '#f8fafc',
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
      return executionMode === 'headless' ? entry.cleaned : entry.raw;
    }) ?? EMPTY_OUTPUT;
  const isHeadless = executionMode === 'headless';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const outputIndexRef = useRef(0);
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
      allowTransparency: true,
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
  }, [output]);

  useEffect(() => {
    if (!active) {
      return;
    }

    terminalRef.current?.focus();
    fitAddonRef.current?.fit();
  }, [active]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-200 ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!active}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};
