import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import { jsonDefinition } from "./json";

export const executeExtendScript = (script: string) => {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("This build supports only win32/amd64.");
  }

  // 一時フォルダ生成
  const dir = path.join(os.tmpdir(), "illustrator-mcp-tmp");
  fs.mkdirSync(dir, { recursive: true });

  const scriptDefinitions = [
    createUUIDDefinition,
    getDocumentDefinition,
    getPageItemDefinition,
    jsonDefinition,
    ptToMmDefinition,
    toPtDefinition,
  ];

  // ExtendScript 生成（文字化け防止のために BOM 付きで保存）
  const extendScriptPath = path.join(dir, "message.jsx");
  const combinedScript = `\ufeff
${scriptDefinitions.join("\n")}
${script}`;
  fs.writeFileSync(extendScriptPath, combinedScript);

  // PowerShell 生成
  const escapedPath = escapePowerShellSingleQuotedString(extendScriptPath);
  const powerShellScriptPath = path.join(dir, "message.ps1");
  const powerShellScript = `
$ErrorActionPreference = "Stop"
$jsxPath = '${escapedPath}'

try {
  $app = New-Object -ComObject Illustrator.Application
} catch {
  throw "Failed to create Illustrator COM object. Ensure Adobe Illustrator is installed. " + $_.Exception.Message
}

try {
  $jsx = Get-Content -LiteralPath $jsxPath -Raw -Encoding UTF8
  $result = $app.DoJavaScript($jsx)
  if ($null -eq $result) {
    [Console]::Out.Write("")
  } else {
    [Console]::Out.Write([string]$result)
  }
} catch {
  throw "Failed to execute ExtendScript. " + $_.Exception.Message
}
`;
  fs.writeFileSync(powerShellScriptPath, powerShellScript);

  try {
    return execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        powerShellScriptPath,
      ],
      { encoding: "utf8" }
    );
  } catch (error) {
    throw new Error(
      `Illustrator script execution failed.\n${formatExecFileError(error)}`
    );
  }
};

const escapePowerShellSingleQuotedString = (value: string) =>
  value.replace(/'/g, "''");

const formatExecFileError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Unknown PowerShell execution error.";
  }

  const execError = error as Error & {
    status?: number;
    signal?: string;
    stdout?: string | Buffer;
    stderr?: string | Buffer;
  };

  const lines = [error.message];
  if (typeof execError.status === "number") {
    lines.push(`status: ${execError.status}`);
  }
  if (typeof execError.signal === "string") {
    lines.push(`signal: ${execError.signal}`);
  }

  const stdout =
    typeof execError.stdout === "string"
      ? execError.stdout
      : execError.stdout?.toString();
  const stderr =
    typeof execError.stderr === "string"
      ? execError.stderr
      : execError.stderr?.toString();

  if (stdout && stdout.trim().length > 0) {
    lines.push(`stdout:\n${stdout.trim()}`);
  }
  if (stderr && stderr.trim().length > 0) {
    lines.push(`stderr:\n${stderr.trim()}`);
  }

  return lines.join("\n");
};

const toPtDefinition = `
function mmToPt(mm) {
  return mm * (72 / 25.4);
}

function toPt(value) {
  if (value.indexOf("mm") !== -1) {
    var mm = parseFloat(value.replace("mm", ""));
    return mmToPt(mm);
  }
  if (value.indexOf("Q") !== -1) {
    var mm = parseFloat(value.replace("Q", "")) / 4;
    return mmToPt(mm);
  }
  return parseFloat(value);
}`;

const ptToMmDefinition = `
function ptToMm(pt) {
  return pt * (25.4 / 72) + "mm";
}`;

const getDocumentDefinition = `
function getDocument() {
  if (app.documents.length > 0) {
    return app.activeDocument;
  }
  return app.documents.add();
}`;

const getPageItemDefinition = `
function getPageItem(uuid) {
  var doc = getDocument();
  for (var i = 0; i < doc.pageItems.length; i++) {
    if (doc.pageItems[i].note === uuid) {
      return doc.pageItems[i];
    }
  }
  return null;
}`;

const createUUIDDefinition = `
function createUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    if (c === "x") {
      return r.toString(16);
    } else {
      return (r & 0x3 | 0x8).toString(16);
    }
  });
}`;
