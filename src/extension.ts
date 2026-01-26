import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseXaml, isXamlFile } from './xamlParser';
import { generateStub } from './stubGenerator';
import { injectTypeAnnotations } from './pythonInjector';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('XAML Python IntelliSense');
  outputChannel.appendLine('XAML Python IntelliSense extension activated');

  // Watch for XAML file changes
  const xamlWatcher = vscode.workspace.createFileSystemWatcher('**/*.xaml');

  xamlWatcher.onDidChange(uri => {
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    if (config.get<boolean>('autoGenerate', true)) {
      generateStubsForXaml(uri);
    }
  });

  xamlWatcher.onDidCreate(uri => {
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    if (config.get<boolean>('autoGenerate', true)) {
      generateStubsForXaml(uri);
    }
  });

  xamlWatcher.onDidDelete(uri => {
    deleteStubsForXaml(uri);
  });

  context.subscriptions.push(xamlWatcher);

  // Command to manually generate stubs for all XAML files
  const generateAllCommand = vscode.commands.registerCommand(
    'xaml-intellisense.generateStubs',
    async () => {
      const xamlFiles = await vscode.workspace.findFiles('**/*.xaml');
      let generated = 0;
      let pyModified = 0;

      for (const file of xamlFiles) {
        const result = await generateStubsForXaml(file);
        generated += result.stubs;
        pyModified += result.pyFiles;
      }

      vscode.window.showInformationMessage(
        `XAML IntelliSense: Generated ${generated} stub files, updated ${pyModified} Python files`
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

      const result = await generateStubsForXaml(editor.document.uri);
      if (result.stubs > 0) {
        vscode.window.showInformationMessage(
          `Generated ${result.stubs} stub file(s), updated ${result.pyFiles} Python file(s)`
        );
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
  let totalStubs = 0;
  let totalPyFiles = 0;

  for (const file of xamlFiles) {
    const result = await generateStubsForXaml(file, true);
    totalStubs += result.stubs;
    totalPyFiles += result.pyFiles;
  }

  if (totalStubs > 0) {
    outputChannel.appendLine(`Startup: Generated ${totalStubs} stub files, updated ${totalPyFiles} Python files`);
  }
}

/**
 * Find Python files that reference a XAML file
 */
function findPythonFilesUsingXaml(xamlPath: string): Array<{pyPath: string, className: string}> {
  const dir = path.dirname(xamlPath);
  const xamlFileName = path.basename(xamlPath);
  const xamlBaseName = path.basename(xamlPath, '.xaml');
  const results: Array<{pyPath: string, className: string}> = [];

  // Also check parent directory (for cases like UI/file.xaml with script in parent)
  const dirsToCheck = [dir, path.dirname(dir)];

  for (const checkDir of dirsToCheck) {
    if (!fs.existsSync(checkDir)) continue;

    const files = fs.readdirSync(checkDir);

    for (const file of files) {
      if (!file.endsWith('.py')) continue;

      const pyPath = path.join(checkDir, file);
      const content = fs.readFileSync(pyPath, 'utf-8');

      // Check if this Python file references the XAML file
      if (content.includes(xamlFileName) || content.includes(xamlBaseName)) {
        // Find class names that inherit from WPFWindow
        const classMatches = content.matchAll(/class\s+(\w+)\s*\([^)]*(?:WPFWindow|forms\.WPFWindow)[^)]*\)/g);

        for (const match of classMatches) {
          results.push({
            pyPath: pyPath,
            className: match[1]
          });
        }
      }
    }
  }

  return results;
}

interface GenerationResult {
  stubs: number;
  pyFiles: number;
}

async function generateStubsForXaml(xamlUri: vscode.Uri, silent: boolean = false): Promise<GenerationResult> {
  const result: GenerationResult = { stubs: 0, pyFiles: 0 };

  try {
    const xamlPath = xamlUri.fsPath;
    const dir = path.dirname(xamlPath);
    const baseName = path.basename(xamlPath, '.xaml');

    // Parse XAML
    const elements = await parseXaml(xamlPath);

    if (elements.length === 0) {
      outputChannel.appendLine(`Skipped ${baseName}.xaml - no named elements`);
      return result;
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    const prefix = config.get<string>('stubFilePrefix', '_');
    const suffix = config.get<string>('stubFileSuffix', '_xaml');
    const autoInject = config.get<boolean>('autoInjectAnnotations', true);

    // Generate the XAML-named stub file
    const stubClassName = baseName
      .split(/[-_\s]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Elements';

    const stubContent = generateStub(stubClassName, elements);
    const stubFileName = `${prefix}${baseName}${suffix}.pyi`;
    const stubPath = path.join(dir, stubFileName);

    fs.writeFileSync(stubPath, stubContent, 'utf-8');
    outputChannel.appendLine(`Generated stub: ${stubFileName} (${elements.length} elements)`);
    result.stubs++;

    // Find Python files that use this XAML and inject type annotations
    if (autoInject) {
      const pyFiles = findPythonFilesUsingXaml(xamlPath);

      for (const { pyPath, className } of pyFiles) {
        const pyDir = path.dirname(pyPath);

        // Copy stub file to Python file directory if different
        if (pyDir !== dir) {
          const targetStubPath = path.join(pyDir, stubFileName);
          fs.copyFileSync(stubPath, targetStubPath);
          outputChannel.appendLine(`Copied stub to: ${path.basename(pyDir)}/${stubFileName}`);
        }

        // Inject type annotations into Python file
        const injected = injectTypeAnnotations(pyPath, className, elements, stubFileName);
        if (injected) {
          outputChannel.appendLine(`Injected type annotations into: ${path.basename(pyPath)}`);
          result.pyFiles++;
        }
      }
    }

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`Error generating stub for ${xamlUri.fsPath}: ${errorMessage}`);
    if (!silent) {
      vscode.window.showErrorMessage(`Error generating XAML stub: ${errorMessage}`);
    }
    return result;
  }
}

function deleteStubsForXaml(xamlUri: vscode.Uri): void {
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
