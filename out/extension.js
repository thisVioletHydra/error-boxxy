"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const SQUIGGLE_KEYS = [
    'editorError.foreground',
    'editorWarning.foreground',
    'editorError.border',
    'editorWarning.border',
];
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
function paint(editor) {
    const diags = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = [];
    const warns = [];
    for (const d of diags) {
        if (d.severity === vscode.DiagnosticSeverity.Error) {
            errors.push(d.range);
        }
        else if (d.severity === vscode.DiagnosticSeverity.Warning) {
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
async function hideSquiggles(ctx) {
    if (!vscode.workspace.getConfiguration('errorBoxxy').get('hideSquiggles', true)) {
        return;
    }
    const cfg = vscode.workspace.getConfiguration('workbench');
    const colors = {
        ...(cfg.get('colorCustomizations') ?? {}),
    };
    const prev = ctx.globalState.get(STATE_KEY) ?? {};
    for (const key of SQUIGGLE_KEYS) {
        if (!(key in prev)) {
            prev[key] = colors[key];
        }
        colors[key] = SQUIGGLE_OFF;
    }
    await ctx.globalState.update(STATE_KEY, prev);
    await cfg.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
}
async function restoreSquiggles(ctx) {
    const prev = ctx.globalState.get(STATE_KEY);
    if (!prev) {
        return;
    }
    const cfg = vscode.workspace.getConfiguration('workbench');
    const colors = {
        ...(cfg.get('colorCustomizations') ?? {}),
    };
    for (const key of SQUIGGLE_KEYS) {
        const old = prev[key];
        if (old === undefined) {
            delete colors[key];
        }
        else {
            colors[key] = old;
        }
    }
    await cfg.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
    await ctx.globalState.update(STATE_KEY, undefined);
}
let extensionCtx;
function activate(ctx) {
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
function deactivate() {
    if (extensionCtx) {
        void restoreSquiggles(extensionCtx);
    }
}
//# sourceMappingURL=extension.js.map