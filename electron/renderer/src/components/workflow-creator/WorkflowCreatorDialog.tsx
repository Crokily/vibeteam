import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdapterMeta,
  AgentUsageConfig,
  ExecutionMode,
  WorkflowDefinition,
} from '../../../../shared/ipc-types';
import { workflowDefinitionSchema } from '../../../../shared/ipc-schemas';
import { ipcClient } from '../../lib/ipc-client';

import { AdapterIcon, ChevronDownIcon, ModeIcon } from '../icons';
import { FrequentAgentsBar } from './FrequentAgentsBar';
import { FrequentWorkflowsSidebar } from './FrequentWorkflowsSidebar';
import { WorkflowCanvas } from './WorkflowCanvas';
import type { AgentConfig, EnvEntry, LayoutState } from './types';

type WorkflowCreatorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FormErrors = {
  adapter?: string;
  prompt?: string;
  extraArgs?: string;
};

const createWorkflowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `workflow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const buildLayoutFromDefinition = (definition: WorkflowDefinition): LayoutState => {
  const agents: Record<string, AgentConfig> = {};
  const rows = definition.stages.map((stage) =>
    stage.tasks.map((task) => {
      const id = task.id;
      agents[id] = {
        id,
        adapter: task.adapter,
        executionMode: task.executionMode ?? 'interactive',
        prompt: task.prompt ?? '',
        extraArgs: task.extraArgs,
        cwd: task.cwd,
        env: task.env,
        name: task.name,
      };
      return id;
    }),
  );

  return {
    agents,
    rows: rows.filter((row) => row.length > 0),
  };
};

const buildEnvObject = (entries: EnvEntry[]): Record<string, string | undefined> | undefined => {
  const env: Record<string, string | undefined> = {};
  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (!key) {
      return;
    }
    const value = entry.value.trim();
    env[key] = value || undefined;
  });

  return Object.keys(env).length > 0 ? env : undefined;
};

const parseExtraArgs = (
  value: string,
): { value?: string[]; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
        return { error: 'Extra args must be a string array.' };
      }
      return { value: parsed };
    } catch {
      return { error: 'Extra args JSON is invalid.' };
    }
  }

  const args = trimmed
    .split(',')
    .map((arg) => arg.trim())
    .filter(Boolean);

  return { value: args.length > 0 ? args : undefined };
};

const buildWorkflowDefinition = (
  workflowId: string,
  workflowName: string,
  baseDir: string,
  layout: LayoutState,
): WorkflowDefinition => {
  const trimmedId = workflowId.trim() || createWorkflowId();
  const trimmedName = workflowName.trim();
  const trimmedBaseDir = baseDir.trim();

  const stages = layout.rows
    .filter((row) => row.length > 0)
    .map((row, index) => {
      const tasks = row
        .map((agentId) => layout.agents[agentId])
        .filter(Boolean)
        .map((agent) => {
          const task: {
            id: string;
            adapter: string;
            executionMode?: ExecutionMode;
            prompt?: string;
            extraArgs?: string[];
            cwd?: string;
            env?: Record<string, string | undefined>;
            name?: string;
          } = {
            id: agent.id,
            adapter: agent.adapter,
          };

          if (agent.executionMode) {
            task.executionMode = agent.executionMode;
          }

          const prompt = agent.prompt.trim();
          if (prompt) {
            task.prompt = prompt;
          }

          if (agent.extraArgs && agent.extraArgs.length > 0) {
            task.extraArgs = agent.extraArgs;
          }

          const resolvedCwd = agent.cwd?.trim() || trimmedBaseDir;
          if (resolvedCwd) {
            task.cwd = resolvedCwd;
          }

          if (agent.env && Object.keys(agent.env).length > 0) {
            task.env = agent.env;
          }

          const name = agent.name?.trim();
          if (name) {
            task.name = name;
          }

          return task;
        });

      return {
        id: `stage-${index + 1}`,
        tasks,
      };
    })
    .filter((stage) => stage.tasks.length > 0);

  return {
    id: trimmedId,
    goal: trimmedName || undefined,
    stages,
  };
};

const validateWorkflowDefinition = (
  workflow: WorkflowDefinition,
  adapterLookup: Record<string, AdapterMeta>,
  validateAdapters: boolean,
): string | null => {
  if (!workflow.stages || workflow.stages.length === 0) {
    return 'Add at least one agent.';
  }

  if (validateAdapters && Object.keys(adapterLookup).length === 0) {
    return 'No CLIs available.';
  }

  const seenTaskIds = new Set<string>();

  for (const stage of workflow.stages) {
    if (!stage.tasks || stage.tasks.length === 0) {
      return `Stage "${stage.id}" must contain at least one task.`;
    }

    for (const task of stage.tasks) {
      if (!task.id || !task.id.trim()) {
        return 'Workflow task is missing an id.';
      }
      if (!task.adapter || !task.adapter.trim()) {
        return `Workflow task "${task.id}" CLI must be a non-empty string.`;
      }
      if (validateAdapters && !adapterLookup[task.adapter]) {
        return `Workflow task "${task.id}" CLI type "${task.adapter}" is not registered.`;
      }
      if (task.executionMode === 'headless' && (!task.prompt || !task.prompt.trim())) {
        return `Workflow task "${task.id}" prompt is required for headless mode.`;
      }
      if (seenTaskIds.has(task.id)) {
        return `Workflow task id "${task.id}" must be unique.`;
      }
      seenTaskIds.add(task.id);
    }
  }

  return null;
};

export const WorkflowCreatorDialog = ({ isOpen, onClose }: WorkflowCreatorDialogProps) => {
  const [workflowId, setWorkflowId] = useState(createWorkflowId());
  const [workflowName, setWorkflowName] = useState('');
  const [baseDir, setBaseDir] = useState('');
  const [adapters, setAdapters] = useState<AdapterMeta[]>([]);
  const [adaptersLoaded, setAdaptersLoaded] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('interactive');
  const [prompt, setPrompt] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [cwd, setCwd] = useState('');
  const [extraArgs, setExtraArgs] = useState('');
  const [agentName, setAgentName] = useState('');
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutState>({ rows: [], agents: {} });
  const [importOpen, setImportOpen] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const adapterMenuRef = useRef<HTMLDivElement | null>(null);
  const initialStateRef = useRef<{
    workflowId: string;
    workflowName: string;
    selectedAdapter: string;
    mode: ExecutionMode;
  }>({ workflowId: '', workflowName: '', selectedAdapter: '', mode: 'interactive' });
  const isInitializingRef = useRef(false);

  const adapterMetaLookup = useMemo(() => {
    const lookup: Record<string, AdapterMeta> = {};
    adapters.forEach((adapter) => {
      lookup[adapter.type] = adapter;
    });
    return lookup;
  }, [adapters]);

  const adapterDisplayLookup = useMemo(() => {
    const lookup: Record<string, { displayName: string; icon: string }> = {};
    adapters.forEach((adapter) => {
      lookup[adapter.type] = {
        displayName: adapter.displayName,
        icon: adapter.icon,
      };
    });
    return lookup;
  }, [adapters]);

  const selectedAdapterMeta = adapterMetaLookup[selectedAdapter];
  const supportedModes =
    selectedAdapterMeta?.supportedModes.length
      ? selectedAdapterMeta.supportedModes
      : (['interactive', 'headless'] as ExecutionMode[]);

  const hasChanges =
    layout.rows.length > 0 ||
    prompt.trim().length > 0 ||
    baseDir.trim().length > 0 ||
    agentName.trim().length > 0 ||
    extraArgs.trim().length > 0 ||
    cwd.trim().length > 0 ||
    envEntries.some((entry) => entry.key.trim() || entry.value.trim()) ||
    importValue.trim().length > 0 ||
    workflowName.trim().length > 0 ||
    selectedAdapter !== initialStateRef.current.selectedAdapter ||
    mode !== initialStateRef.current.mode;

  const resetState = useCallback(() => {
    const nextWorkflowId = createWorkflowId();
    setWorkflowId(nextWorkflowId);
    setWorkflowName('');
    setBaseDir('');
    setLayout({ rows: [], agents: {} });
    setPrompt('');
    setMode('interactive');
    setSelectedAdapter('');
    setAdapterOpen(false);
    setAdvancedOpen(false);
    setCwd('');
    setExtraArgs('');
    setAgentName('');
    setEnvEntries([]);
    setFormErrors({});
    setCanvasError(null);
    setImportOpen(false);
    setImportValue('');
    setImportError(null);
    setAdaptersLoaded(false);
    initialStateRef.current = {
      workflowId: nextWorkflowId,
      workflowName: '',
      selectedAdapter: '',
      mode: 'interactive',
    };
    isInitializingRef.current = true;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetState();
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setAdaptersLoaded(false);
    ipcClient.adapter
      .list()
      .then((list) => {
        if (!isMounted) {
          return;
        }
        setAdapters(list);
        setSelectedAdapter((current) => {
          const nextAdapter = current || list[0]?.type || '';
          if (isInitializingRef.current && !current) {
            initialStateRef.current = {
              ...initialStateRef.current,
              selectedAdapter: nextAdapter,
            };
          }
          return nextAdapter;
        });
        setAdaptersLoaded(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setAdapters([]);
        setAdaptersLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!adaptersLoaded) {
      return;
    }

    if (supportedModes.includes(mode)) {
      if (isInitializingRef.current) {
        isInitializingRef.current = false;
      }
      return;
    }
    const nextMode = supportedModes[0] ?? 'interactive';
    setMode(nextMode);
    if (isInitializingRef.current) {
      initialStateRef.current = {
        ...initialStateRef.current,
        mode: nextMode,
      };
    }
  }, [adaptersLoaded, mode, supportedModes]);

  useEffect(() => {
    if (!adapterOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!adapterMenuRef.current) {
        return;
      }
      if (!adapterMenuRef.current.contains(event.target as Node)) {
        setAdapterOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [adapterOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (!hasChanges || window.confirm('Discard this workflow draft?')) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const selectedAdapterLabel =
    selectedAdapterMeta?.displayName || selectedAdapter || 'Select CLI';
  const selectedAdapterIcon = selectedAdapterMeta?.icon || 'adapter';

  const handleCreateAgent = () => {
    const errors: FormErrors = {};

    if (!selectedAdapter || !selectedAdapterMeta) {
      errors.adapter = adapters.length > 0 ? 'Select a valid CLI.' : 'No CLIs available.';
    }

    if (mode === 'headless' && !prompt.trim()) {
      errors.prompt = 'Prompt is required for headless mode.';
    }

    const parsedExtraArgs = parseExtraArgs(extraArgs);
    if (parsedExtraArgs.error) {
      errors.extraArgs = parsedExtraArgs.error;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const id = `task-${createWorkflowId()}`;
    const env = buildEnvObject(envEntries);
    const resolvedCwd = cwd.trim() || baseDir.trim() || undefined;

    const agent: AgentConfig = {
      id,
      adapter: selectedAdapter,
      executionMode: mode,
      prompt: prompt.trim(),
      extraArgs: parsedExtraArgs.value,
      cwd: resolvedCwd,
      env,
      name: agentName.trim() || undefined,
    };

    setLayout((current) => {
      const rows = current.rows.length > 0
        ? current.rows.map((row, index) =>
            index === current.rows.length - 1 ? [...row, id] : row,
          )
        : [[id]];
      return {
        rows,
        agents: {
          ...current.agents,
          [id]: agent,
        },
      };
    });

    setPrompt('');
    setExtraArgs('');
    setAgentName('');
    setEnvEntries([]);
    setFormErrors({});
    setCanvasError(null);
  };

  const handleRemoveAgent = (id: string) => {
    setLayout((current) => {
      const rest = { ...current.agents };
      delete rest[id];
      const rows = current.rows
        .map((row) => row.filter((agentId) => agentId !== id))
        .filter((row) => row.length > 0);

      return { rows, agents: rest };
    });
  };

  const handleUpdateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setLayout((current) => {
      const existing = current.agents[id];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        agents: {
          ...current.agents,
          [id]: {
            ...existing,
            ...updates,
          },
        },
      };
    });
  };

  const handleDuplicateAgent = (id: string) => {
    setLayout((current) => {
      const source = current.agents[id];
      if (!source) {
        return current;
      }
      const newId = `task-${createWorkflowId()}`;
      const rowIndex = current.rows.findIndex((row) => row.includes(id));
      let rows = current.rows.map((row) => [...row]);

      if (rowIndex >= 0) {
        const targetRow = rows[rowIndex];
        const sourceIndex = targetRow.indexOf(id);
        targetRow.splice(sourceIndex + 1, 0, newId);
      } else if (rows.length > 0) {
        rows[rows.length - 1] = [...rows[rows.length - 1], newId];
      } else {
        rows = [[newId]];
      }

      return {
        rows,
        agents: {
          ...current.agents,
          [newId]: {
            ...source,
            id: newId,
          },
        },
      };
    });
  };

  const handleClose = () => {
    if (hasChanges && !window.confirm('Discard this workflow draft?')) {
      return;
    }
    onClose();
  };

  const handleCreateWorkflow = async () => {
    const workflow = buildWorkflowDefinition(workflowId, workflowName, baseDir, layout);
    const validationError = validateWorkflowDefinition(
      workflow,
      adapterMetaLookup,
      adaptersLoaded,
    );
    if (validationError) {
      setCanvasError(validationError);
      return;
    }

    setCanvasError(null);

    try {
      await ipcClient.workflow.execute(workflow);
      onClose();
    } catch {
      setCanvasError('Failed to create workflow.');
    }
  };

  const handleImport = () => {
    if (layout.rows.length > 0) {
      const confirmed = window.confirm('Replace current layout with imported JSON?');
      if (!confirmed) {
        return;
      }
    }

    setImportError(null);

    try {
      const parsed = JSON.parse(importValue);
      const validation = workflowDefinitionSchema.safeParse(parsed);
      if (!validation.success) {
        setImportError('Workflow JSON is invalid.');
        return;
      }

      const definition = validation.data;
      const semanticError = validateWorkflowDefinition(
        definition,
        adapterMetaLookup,
        adaptersLoaded,
      );
      if (semanticError) {
        setImportError(semanticError);
        return;
      }
      setWorkflowId(definition.id);
      setWorkflowName(definition.goal || '');
      setLayout(buildLayoutFromDefinition(definition));
      setCanvasError(null);
      setImportOpen(false);
      setImportValue('');
    } catch {
      setImportError('Workflow JSON is invalid.');
    }
  };

  const handleApplyFrequentWorkflow = (definition: WorkflowDefinition) => {
    if (layout.rows.length > 0) {
      const confirmed = window.confirm('Replace current canvas?');
      if (!confirmed) {
        return;
      }
    }
    setLayout(buildLayoutFromDefinition(definition));
    setWorkflowName(definition.goal || '');
    setCanvasError(null);
  };

  const handleAddFrequentAgent = (config: AgentUsageConfig) => {
    const id = `task-${createWorkflowId()}`;
    const executionMode = config.executionMode ?? 'interactive';
    const agent: AgentConfig = {
      id,
      adapter: config.adapter,
      executionMode,
      prompt: config.prompt ?? '',
      extraArgs: config.extraArgs,
      cwd: config.cwd,
      env: config.env,
    };

    setLayout((current) => {
      const rows = current.rows.length > 0
        ? current.rows.map((row, index) =>
            index === current.rows.length - 1 ? [...row, id] : row,
          )
        : [[id]];
      return {
        rows,
        agents: {
          ...current.agents,
          [id]: agent,
        },
      };
    });

    setCanvasError(null);
  };

  const handleBrowseBaseDir = async () => {
    const path = await ipcClient.dialog.openDirectory();
    if (path) {
      setBaseDir(path);
    }
  };

  const handleBrowseCwd = async () => {
    const path = await ipcClient.dialog.openDirectory();
    if (path) {
      setCwd(path);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4 py-6 backdrop-blur">
      <div className="relative flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-slate/90 shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-ink/60 px-6 py-4">
          <div className="text-sm uppercase tracking-[0.35em] text-ash">
            New Workflow
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="rounded-full border border-border/70 bg-ink/60 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-ash transition hover:border-rose-300/70 hover:text-rose-200"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWorkflow}
              className="rounded-full border border-amber-400/70 bg-amber-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-100 transition hover:border-amber-300 hover:text-amber-50"
              type="button"
            >
              Create Workflow
            </button>
          </div>
        </header>

        <div className="grid gap-4 border-b border-border/60 bg-ink/50 px-6 py-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto]">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
              Workflow Name
            </label>
            <input
              value={workflowName}
              onChange={(event) => setWorkflowName(event.target.value)}
              placeholder="Describe your goal (optional)"
              className="rounded-2xl border border-border/60 bg-ink/70 px-4 py-2 text-xs text-iron outline-none transition focus:border-amber-300/70"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
              Base directory
            </label>
            <input
              value={baseDir}
              onChange={(event) => setBaseDir(event.target.value)}
              onClick={handleBrowseBaseDir}
              placeholder="Auto (Click to browse)"
              className="cursor-pointer rounded-2xl border border-border/60 bg-ink/70 px-4 py-2 text-xs text-iron outline-none transition focus:border-amber-300/70"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-full border border-border/70 bg-ink/60 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-ash transition hover:border-iron hover:text-iron"
              type="button"
            >
              Import
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)_260px]">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <div className="rounded-3xl border border-border/60 bg-ink/60 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-ash">
                Create Agent
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2" ref={adapterMenuRef}>
                  <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                    CLI
                  </label>
                  <button
                    onClick={() => setAdapterOpen((open) => !open)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-xs transition ${
                      formErrors.adapter
                        ? 'border-rose-300/70 text-rose-200'
                        : 'border-border/60 text-iron'
                    } bg-ink/70`}
                    type="button"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-graphite/80 text-iron">
                        <AdapterIcon name={selectedAdapterIcon} className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.2em]">
                        {selectedAdapterLabel}
                      </span>
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-ash" />
                  </button>
                  {formErrors.adapter ? (
                    <div className="text-[11px] text-rose-200">{formErrors.adapter}</div>
                  ) : null}
                  {adapterOpen ? (
                    <div className="relative z-10 mt-2 rounded-2xl border border-border/70 bg-ink/90 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                      {adapters.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-ash">
                          No CLIs
                        </div>
                      ) : (
                        adapters.map((adapter) => (
                          <button
                            key={adapter.type}
                            onClick={() => {
                              setSelectedAdapter(adapter.type);
                              setAdapterOpen(false);
                              setFormErrors((current) => ({ ...current, adapter: undefined }));
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-ash transition hover:bg-ink/70 hover:text-iron"
                            type="button"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-graphite/80 text-iron">
                              <AdapterIcon name={adapter.icon} className="h-4 w-4" />
                            </span>
                            {adapter.displayName}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      if (formErrors.prompt) {
                        setFormErrors((current) => ({ ...current, prompt: undefined }));
                      }
                    }}
                    rows={4}
                    className={`rounded-2xl border px-4 py-3 text-xs text-iron outline-none transition ${
                      formErrors.prompt
                        ? 'border-rose-300/70'
                        : 'border-border/60'
                    } bg-ink/70 focus:border-amber-300/70`}
                  />
                  {formErrors.prompt ? (
                    <div className="text-[11px] text-rose-200">{formErrors.prompt}</div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['interactive', 'headless'] as ExecutionMode[]).map((option) => {
                      const isActive = mode === option;
                      const isEnabled = supportedModes.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            if (isEnabled) {
                              setMode(option);
                            }
                          }}
                          disabled={!isEnabled}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] uppercase tracking-[0.24em] transition ${
                            isActive
                              ? 'border-amber-300/70 text-amber-100 bg-amber-400/10'
                              : 'border-border/60 text-ash bg-ink/70'
                          } ${!isEnabled ? 'opacity-40' : 'hover:border-iron hover:text-iron'}`}
                          type="button"
                        >
                          <ModeIcon mode={option} className="h-3 w-3" />
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setAdvancedOpen((open) => !open)}
                  className="rounded-full border border-border/60 bg-ink/70 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-ash transition hover:border-iron hover:text-iron"
                  type="button"
                >
                  Advanced Options
                </button>

                {advancedOpen ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-ink/70 px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                        Working directory
                      </label>
                      <input
                        value={cwd}
                        onChange={(event) => setCwd(event.target.value)}
                        onClick={handleBrowseCwd}
                        placeholder={baseDir || 'Auto (Click to browse)'}
                        className="cursor-pointer rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-xs text-iron outline-none transition focus:border-amber-300/70"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                        Agent name
                      </label>
                      <input
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                        placeholder="Optional"
                        className="rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-xs text-iron outline-none transition focus:border-amber-300/70"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                        Extra args
                      </label>
                      <input
                        value={extraArgs}
                        onChange={(event) => {
                          setExtraArgs(event.target.value);
                          if (formErrors.extraArgs) {
                            setFormErrors((current) => ({
                              ...current,
                              extraArgs: undefined,
                            }));
                          }
                        }}
                        placeholder="--flag, value"
                        className={`rounded-xl border px-3 py-2 text-xs text-iron outline-none transition ${
                          formErrors.extraArgs
                            ? 'border-rose-300/70'
                            : 'border-border/60'
                        } bg-ink/70 focus:border-amber-300/70`}
                      />
                      {formErrors.extraArgs ? (
                        <div className="text-[11px] text-rose-200">
                          {formErrors.extraArgs}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-[0.24em] text-ash">
                        Environment
                      </label>
                      <div className="flex flex-col gap-2">
                        {envEntries.map((entry, index) => (
                          <div key={`${entry.key}-${index}`} className="flex gap-2">
                            <input
                              value={entry.key}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEnvEntries((current) =>
                                  current.map((item, idx) =>
                                    idx === index ? { ...item, key: value } : item,
                                  ),
                                );
                              }}
                              placeholder="KEY"
                              className="flex-1 rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-[11px] text-iron outline-none transition focus:border-amber-300/70"
                            />
                            <input
                              value={entry.value}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEnvEntries((current) =>
                                  current.map((item, idx) =>
                                    idx === index ? { ...item, value } : item,
                                  ),
                                );
                              }}
                              placeholder="VALUE"
                              className="flex-1 rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-[11px] text-iron outline-none transition focus:border-amber-300/70"
                            />
                            <button
                              onClick={() =>
                                setEnvEntries((current) =>
                                  current.filter((_, idx) => idx !== index),
                                )
                              }
                              className="rounded-xl border border-border/60 bg-ink/70 px-2 text-[10px] uppercase tracking-[0.2em] text-ash transition hover:border-rose-300/70 hover:text-rose-200"
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEnvEntries((current) => [...current, { key: '', value: '' }])}
                          className="rounded-xl border border-border/60 bg-ink/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-ash transition hover:border-iron hover:text-iron"
                          type="button"
                        >
                          Add env
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={handleCreateAgent}
                  className="rounded-full border border-amber-300/70 bg-amber-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
                  type="button"
                >
                  Create Agent
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.3em] text-ash">
                Workflow Canvas
              </div>
              {canvasError ? (
                <div className="text-[11px] text-rose-200">{canvasError}</div>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
              <WorkflowCanvas
                rows={layout.rows}
                agents={layout.agents}
                adapterMeta={adapterDisplayLookup}
                onRowsChange={(rows) => {
                  setLayout((current) => ({ ...current, rows }));
                  setCanvasError(null);
                }}
                onRemoveAgent={handleRemoveAgent}
                onUpdateAgent={handleUpdateAgent}
                onDuplicateAgent={handleDuplicateAgent}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
            <FrequentWorkflowsSidebar
              isOpen={isOpen}
              adapterLookup={adapterDisplayLookup}
              onSelectWorkflow={handleApplyFrequentWorkflow}
            />
          </div>
        </div>

        <FrequentAgentsBar
          isOpen={isOpen}
          adapterLookup={adapterDisplayLookup}
          onAddAgent={handleAddFrequentAgent}
        />

        {importOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 px-4 py-6 backdrop-blur">
            <div className="w-full max-w-2xl rounded-3xl border border-border/70 bg-slate/90 px-6 py-6">
              <div className="text-[11px] uppercase tracking-[0.3em] text-ash">
                Import JSON
              </div>
              <textarea
                value={importValue}
                onChange={(event) => setImportValue(event.target.value)}
                rows={10}
                className="mt-4 w-full rounded-2xl border border-border/60 bg-ink/70 px-4 py-3 text-xs text-iron outline-none transition focus:border-amber-300/70"
              />
              {importError ? (
                <div className="mt-2 text-[11px] text-rose-200">{importError}</div>
              ) : null}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setImportOpen(false);
                    setImportError(null);
                  }}
                  className="rounded-full border border-border/70 bg-ink/60 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-ash transition hover:border-iron hover:text-iron"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="rounded-full border border-amber-300/70 bg-amber-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
                  type="button"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
