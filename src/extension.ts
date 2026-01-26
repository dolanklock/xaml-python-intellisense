import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseXaml, isXamlFile } from './xamlParser';
import { generateStub } from './stubGenerator';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('XAML Python IntelliSense');
  outputChannel.appendLine('XAML Python IntelliSense extension activated');

  // Watch for XAML file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.xaml');

  watcher.onDidChange(uri => {
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    if (config.get<boolean>('autoGenerate', true)) {
      generateStubForXaml(uri);
    }
  });

  watcher.onDidCreate(uri => {
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    if (config.get<boolean>('autoGenerate', true)) {
      generateStubForXaml(uri);
    }
  });

  watcher.onDidDelete(uri => {
    // Remove the stub file when XAML is deleted
    deleteStubForXaml(uri);
  });

  context.subscriptions.push(watcher);

  // Command to manually generate stubs for all XAML files
  const generateAllCommand = vscode.commands.registerCommand(
    'xaml-intellisense.generateStubs',
    async () => {
      const xamlFiles = await vscode.workspace.findFiles('**/*.xaml');
      let generated = 0;
      let skipped = 0;

      for (const file of xamlFiles) {
        const result = await generateStubForXaml(file);
        if (result) {
          generated++;
        } else {
          skipped++;
        }
      }

      vscode.window.showInformationMessage(
        `XAML Stubs: Generated ${generated}, Skipped ${skipped} (no named elements)`
      );
    }
  );

  // Command to generate stub for current file
  const generateCurrentCommand = vscode.commands.registerCommand(
    'xaml-intellisense.generateStubsForFile',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const filePath = editor.document.uri.fsPath;
      if (!isXamlFile(filePath)) {
        vscode.window.showWarningMessage('Current file is not a XAML file');
        return;
      }

      const result = await generateStubForXaml(editor.document.uri);
      if (result) {
        vscode.window.showInformationMessage(`Generated stub: ${result}`);
      } else {
        vscode.window.showWarningMessage('No named elements found in XAML file');
      }
    }
  );

  context.subscriptions.push(generateAllCommand);
  context.subscriptions.push(generateCurrentCommand);

  // Generate stubs for existing XAML files on activation
  generateAllStubsOnStartup();
}

async function generateAllStubsOnStartup(): Promise<void> {
  const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
  if (!config.get<boolean>('autoGenerate', true)) {
    return;
  }

  const xamlFiles = await vscode.workspace.findFiles('**/*.xaml');
  for (const file of xamlFiles) {
    await generateStubForXaml(file, true); // silent mode on startup
  }

  if (xamlFiles.length > 0) {
    outputChannel.appendLine(`Generated stubs for ${xamlFiles.length} XAML files on startup`);
  }
}

async function generateStubForXaml(xamlUri: vscode.Uri, silent: boolean = false): Promise<string | null> {
  try {
    const xamlPath = xamlUri.fsPath;
    const dir = path.dirname(xamlPath);
    const baseName = path.basename(xamlPath, '.xaml');

    // Parse XAML
    const elements = await parseXaml(xamlPath);

    if (elements.length === 0) {
      outputChannel.appendLine(`Skipped ${baseName}.xaml - no named elements`);
      return null;
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    const prefix = config.get<string>('stubFilePrefix', '_');
    const suffix = config.get<string>('stubFileSuffix', '_xaml');

    // Generate class name from file name (PascalCase)
    const className = baseName
      .split(/[-_\s]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Elements';

    // Generate stub content
    const stubContent = generateStub(className, elements);
    const stubFileName = `${prefix}${baseName}${suffix}.pyi`;
    const stubPath = path.join(dir, stubFileName);

    fs.writeFileSync(stubPath, stubContent, 'utf-8');

    outputChannel.appendLine(`Generated stub: ${stubFileName} (${elements.length} elements)`);

    return stubFileName;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`Error generating stub for ${xamlUri.fsPath}: ${errorMessage}`);
    if (!silent) {
      vscode.window.showErrorMessage(`Error generating XAML stub: ${errorMessage}`);
    }
    return null;
  }
}

function deleteStubForXaml(xamlUri: vscode.Uri): void {
  try {
    const xamlPath = xamlUri.fsPath;
    const dir = path.dirname(xamlPath);
    const baseName = path.basename(xamlPath, '.xaml');

    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    const prefix = config.get<string>('stubFilePrefix', '_');
    const suffix = config.get<string>('stubFileSuffix', '_xaml');

    const stubFileName = `${prefix}${baseName}${suffix}.pyi`;
    const stubPath = path.join(dir, stubFileName);

    if (fs.existsSync(stubPath)) {
      fs.unlinkSync(stubPath);
      outputChannel.appendLine(`Deleted stub: ${stubFileName}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`Error deleting stub: ${errorMessage}`);
  }
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
