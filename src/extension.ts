import * as vscode from 'vscode';

const SQUIGGLE_KEYS = [
  'editorError.foreground',
  'editorWarning.foreground',
  'editorError.border',
  'editorWarning.border',
] as const;

const SQUIGGLE_OFF = '#00000000';
const STATE_KEY = 'errorBoxxy.prevSquiggleColors';

const errorDeco = vscode.window.createTextEditorDecorationType({
  border: '1px solid #e74c3c',
  borderRadius: '3px',
  backgroundColor: 'rgba(255, 100, 135, 0.09)',
});

const warnDeco = vscode.window.createTextEditorDecorationType({
  border: '1px solid #ffcf70a8',
  borderRadius: '3px',
  backgroundColor: 'rgba(255, 155, 0, 0.09)',
});

function paint(editor: vscode.TextEditor) {
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

  editor.setDecorations(errorDeco, errors);
  editor.setDecorations(warnDeco, warns);
}

function paintAll() {
  for (const editor of vscode.window.visibleTextEditors) {
    paint(editor);
  }
}

async function hideSquiggles(ctx: vscode.ExtensionContext) {
  if (!vscode.workspace.getConfiguration('errorBoxxy').get('hideSquiggles', true)) {
    return;
  }

  const cfg = vscode.workspace.getConfiguration('workbench');
  const colors = {
    ...(cfg.get<Record<string, string>>('colorCustomizations') ?? {}),
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
    ...(cfg.get<Record<string, string>>('colorCustomizations') ?? {}),
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

let extensionCtx: vscode.ExtensionContext | undefined;

export function activate(ctx: vscode.ExtensionContext) {
  extensionCtx = ctx;
  ctx.subscriptions.push(errorDeco, warnDeco);
  ctx.subscriptions.push(vscode.languages.onDidChangeDiagnostics(paintAll));
  ctx.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(paintAll));
  ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      paint(editor);
    }
  }));

  void hideSquiggles(ctx);
  paintAll();
}

export function deactivate() {
  if (extensionCtx) {
    void restoreSquiggles(extensionCtx);
  }
}
