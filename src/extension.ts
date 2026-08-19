import * as vscode from 'vscode';

const SQUIGGLE_KEYS = [
  'editorError.foreground',
  'editorWarning.foreground',
  'editorError.border',
  'editorWarning.border',
] as const;

const SQUIGGLE_OFF = '#00000000';
const STATE_KEY = 'errorBoxxy.prevSquiggleColors';

type BoxDecos = {
  error: vscode.TextEditorDecorationType;
  warn: vscode.TextEditorDecorationType;
};

function readStyle() {
  const cfg = vscode.workspace.getConfiguration('errorBoxxy');

  return {
    hideSquiggles: cfg.get('hideSquiggles', true),
    errorBorder: cfg.get('errorBorder', '1px solid #e74c3c'),
    errorBackground: cfg.get('errorBackground', 'rgba(255, 100, 135, 0.09)'),
    warningBorder: cfg.get('warningBorder', '1px solid #ffcf70a8'),
    warningBackground: cfg.get('warningBackground', 'rgba(255, 155, 0, 0.09)'),
  };
}

function createDecos(): BoxDecos {
  const style = readStyle();

  return {
    error: vscode.window.createTextEditorDecorationType({
      border: style.errorBorder,
      borderRadius: '3px',
      backgroundColor: style.errorBackground,
    }),
    warn: vscode.window.createTextEditorDecorationType({
      border: style.warningBorder,
      borderRadius: '3px',
      backgroundColor: style.warningBackground,
    }),
  };
}

function paint(editor: vscode.TextEditor, decos: BoxDecos) {
  const diags = vscode.languages.getDiagnostics(editor.document.uri);
  const errors: vscode.Range[] = [];
  const warns: vscode.Range[] = [];

  for (const d of diags) {
    if (d.severity === vscode.DiagnosticSeverity.Error) {
      errors.push(d.range);
    } else if (d.severity === vscode.DiagnosticSeverity.Warning) {
      warns.push(d.range);
    }
  }

  editor.setDecorations(decos.error, errors);
  editor.setDecorations(decos.warn, warns);
}

function paintAll(decos: BoxDecos) {

  for (const editor of vscode.window.visibleTextEditors) {
    paint(editor, decos);
  }
}

async function hideSquiggles(ctx: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('workbench');
  const colors = {
    ...cfg.get<Record<string, string>>('colorCustomizations'),
  };

  const prev: Record<string, string | undefined> = ctx.globalState.get(STATE_KEY) ?? {};

  for (const key of SQUIGGLE_KEYS) {
    if (!(key in prev)) {
      prev[key] = colors[key];
    }
    colors[key] = SQUIGGLE_OFF;
  }

  await ctx.globalState.update(STATE_KEY, prev);
  await cfg.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
}

async function restoreSquiggles(ctx: vscode.ExtensionContext) {
  const prev = ctx.globalState.get<Record<string, string | undefined>>(STATE_KEY);
  if (!prev) {

    return;
  }

  const cfg = vscode.workspace.getConfiguration('workbench');
  const colors = {
    ...cfg.get<Record<string, string>>('colorCustomizations'),
  };

  for (const key of SQUIGGLE_KEYS) {
    const old = prev[key];
    if (old === undefined) {
      delete colors[key];
    } else {
      colors[key] = old;
    }
  }

  await cfg.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
  await ctx.globalState.update(STATE_KEY, undefined);
}

export function activate(ctx: vscode.ExtensionContext) {
  let decos = createDecos();
  ctx.subscriptions.push(decos.error, decos.warn);

  const repaint = () => paintAll(decos);

  ctx.subscriptions.push(vscode.languages.onDidChangeDiagnostics(repaint));
  ctx.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(repaint));
  ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      paint(editor, decos);
    }
  }));

  ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration('errorBoxxy')) {

      return;
    }
    decos.error.dispose();
    decos.warn.dispose();
    decos = createDecos();
    ctx.subscriptions.push(decos.error, decos.warn);
    void syncSquiggles(ctx);
    paintAll(decos);
  }));

  ctx.subscriptions.push(vscode.commands.registerCommand('errorBoxxy.hideSquiggles', () => hideSquiggles(ctx)));
  ctx.subscriptions.push(vscode.commands.registerCommand('errorBoxxy.restoreSquiggles', () => restoreSquiggles(ctx)));

  void syncSquiggles(ctx);
  paintAll(decos);
}

async function syncSquiggles(ctx: vscode.ExtensionContext) {
  if (readStyle().hideSquiggles) {
    await hideSquiggles(ctx);

    return;
  }
  await restoreSquiggles(ctx);
}

export function deactivate() {}
