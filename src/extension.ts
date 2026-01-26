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

      // Ensure stubs folder and VS Code settings are configured
      await ensureStubsFolderConfigured();

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

      // Ensure stubs folder and VS Code settings are configured
      await ensureStubsFolderConfigured();

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

  // Command to configure VS Code settings for stub path
  const configureSettingsCommand = vscode.commands.registerCommand(
    'xaml-intellisense.configureSettings',
    async () => {
      await ensureStubsFolderConfigured(true);
      vscode.window.showInformationMessage('XAML IntelliSense: VS Code settings configured');
    }
  );

  context.subscriptions.push(generateAllCommand);
  context.subscriptions.push(generateCurrentCommand);
  context.subscriptions.push(configureSettingsCommand);

  // Generate stubs for existing XAML files on activation
  generateAllStubsOnStartup();
}

/**
 * Get the stubs folder path (creates it if needed)
 */
function getStubsFolderPath(): string | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return null;
  }

  const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
  const stubsFolderName = config.get<string>('stubsFolder', 'typings');

  const stubsPath = path.join(workspaceFolder.uri.fsPath, stubsFolderName);

  // Create folder if it doesn't exist
  if (!fs.existsSync(stubsPath)) {
    fs.mkdirSync(stubsPath, { recursive: true });
    outputChannel.appendLine(`Created stubs folder: ${stubsFolderName}/`);
  }

  return stubsPath;
}

/**
 * Ensure VS Code settings are configured for stub path
 */
async function ensureStubsFolderConfigured(force: boolean = false): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
  const stubsFolderName = config.get<string>('stubsFolder', 'typings');
  const autoConfigureSettings = config.get<boolean>('autoConfigureSettings', true);

  if (!autoConfigureSettings && !force) {
    return;
  }

  // Create stubs folder
  const stubsPath = getStubsFolderPath();
  if (!stubsPath) {
    return;
  }

  // Check current Python analysis settings
  const pythonAnalysisConfig = vscode.workspace.getConfiguration('python.analysis');
  const currentStubPath = pythonAnalysisConfig.get<string>('stubPath');
  const currentAnalysisExtraPaths = pythonAnalysisConfig.get<string[]>('extraPaths') || [];

  // Check current Python autoComplete settings
  const pythonConfig = vscode.workspace.getConfiguration('python');
  const currentAutoCompleteExtraPaths = pythonConfig.get<string[]>('autoComplete.extraPaths') || [];

  // Update stubPath if not set or different
  if (currentStubPath !== `./${stubsFolderName}` || force) {
    await pythonAnalysisConfig.update('stubPath', `./${stubsFolderName}`, vscode.ConfigurationTarget.Workspace);
    outputChannel.appendLine(`Configured python.analysis.stubPath = "./${stubsFolderName}"`);
  }

  // Add stubs folder to python.analysis.extraPaths if not present
  const stubsExtraPath = `\${workspaceFolder}/${stubsFolderName}`;
  if (!currentAnalysisExtraPaths.includes(stubsExtraPath)) {
    const newExtraPaths = [...currentAnalysisExtraPaths, stubsExtraPath];
    await pythonAnalysisConfig.update('extraPaths', newExtraPaths, vscode.ConfigurationTarget.Workspace);
    outputChannel.appendLine(`Added "${stubsExtraPath}" to python.analysis.extraPaths`);
  }

  // Add stubs folder to python.autoComplete.extraPaths if not present
  if (!currentAutoCompleteExtraPaths.includes(stubsExtraPath)) {
    const newAutoCompletePaths = [...currentAutoCompleteExtraPaths, stubsExtraPath];
    await pythonConfig.update('autoComplete.extraPaths', newAutoCompletePaths, vscode.ConfigurationTarget.Workspace);
    outputChannel.appendLine(`Added "${stubsExtraPath}" to python.autoComplete.extraPaths`);
  }

  // Create __init__.py for stubs folder to make it a proper Python package
  const initPyPath = path.join(stubsPath, '__init__.py');
  if (!fs.existsSync(initPyPath)) {
    fs.writeFileSync(initPyPath, '# Auto-generated typings for XAML Python IntelliSense\n', 'utf-8');
    outputChannel.appendLine(`Created ${stubsFolderName}/__init__.py`);
  }

  // Create .gitignore for stubs folder if it doesn't exist
  const gitignorePath = path.join(stubsPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '# Auto-generated stub files\n*.py\n!__init__.py\n!wpf_helpers.py\n', 'utf-8');
    outputChannel.appendLine(`Created ${stubsFolderName}/.gitignore`);
  }

  // Copy wpf_helpers.py to stubs folder for IDE type checking
  const wpfHelpersPath = path.join(stubsPath, 'wpf_helpers.py');
  if (!fs.existsSync(wpfHelpersPath) || force) {
    const wpfHelpersContent = getWpfHelpersContent();
    fs.writeFileSync(wpfHelpersPath, wpfHelpersContent, 'utf-8');
    outputChannel.appendLine(`Created ${stubsFolderName}/wpf_helpers.py`);
  }

  // Copy wpf_helpers.py to pyRevit extension lib folders for runtime support
  await ensurePyRevitLibSetup(force);
}

/**
 * Find all pyRevit extension folders in the workspace and set up lib/wpf_helpers.py
 */
async function ensurePyRevitLibSetup(force: boolean = false): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const extensionFolders = findPyRevitExtensions(workspacePath);

  for (const extFolder of extensionFolders) {
    const libPath = path.join(extFolder, 'lib');
    const wpfHelpersLibPath = path.join(libPath, 'wpf_helpers.py');

    // Create lib folder if it doesn't exist
    if (!fs.existsSync(libPath)) {
      fs.mkdirSync(libPath, { recursive: true });
      outputChannel.appendLine(`Created pyRevit lib folder: ${path.relative(workspacePath, libPath)}`);
    }

    // Copy wpf_helpers.py to lib folder for runtime imports
    if (!fs.existsSync(wpfHelpersLibPath) || force) {
      const wpfHelpersContent = getWpfHelpersContent();
      fs.writeFileSync(wpfHelpersLibPath, wpfHelpersContent, 'utf-8');
      outputChannel.appendLine(`Created ${path.relative(workspacePath, wpfHelpersLibPath)}`);
    }
  }
}

/**
 * Find all pyRevit extension folders (folders ending with .extension)
 */
function findPyRevitExtensions(startPath: string, maxDepth: number = 3): string[] {
  const extensions: string[] = [];

  function search(currentPath: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (item.endsWith('.extension')) {
            extensions.push(fullPath);
          } else if (!item.startsWith('.') && item !== 'node_modules') {
            search(fullPath, depth + 1);
          }
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }

  search(startPath, 0);
  return extensions;
}

/**
 * Get the content of wpf_helpers.py for runtime type group support
 */
function getWpfHelpersContent(): string {
  return `"""
Runtime helper for XAML Python IntelliSense type group access.

This module provides runtime support for the type group accessor pattern
(self.ComboBox.element_name, self.Button.element_name, etc.)

The stub files generated by the VS Code extension provide IDE autocomplete,
but this helper is needed to make the type groups work at runtime.

Usage:
    from pyrevit import forms
    from wpf_helpers import setup_element_groups

    class MyWindow(forms.WPFWindow):
        def __init__(self):
            forms.WPFWindow.__init__(self, 'MainWindow.xaml')
            setup_element_groups(self)

        def setup_ui(self):
            # Now both patterns work:
            self.project_combobox.SelectedIndex = 0  # Direct access
            self.ComboBox.project_combobox.ItemsSource = items  # Type group access
"""


class ElementGroup:
    """
    Runtime accessor for grouped XAML elements.

    Provides attribute access that delegates to the parent window,
    allowing patterns like self.ComboBox.my_combobox to work.
    """

    def __init__(self, window, element_names):
        """
        Initialize the element group.

        Args:
            window: The parent WPFWindow instance
            element_names: List of element names in this group
        """
        self._window = window
        self._names = element_names

    def __getattr__(self, name):
        """Delegate attribute access to the parent window."""
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        if name in self._names:
            return getattr(self._window, name)
        raise AttributeError("'{}' has no element '{}'".format(type(self).__name__, name))

    def __iter__(self):
        """Iterate over all elements in this group."""
        for name in self._names:
            yield getattr(self._window, name)

    def __len__(self):
        """Return the number of elements in this group."""
        return len(self._names)

    @property
    def names(self):
        """Return the list of element names in this group."""
        return list(self._names)


def setup_element_groups(window):
    """
    Set up type group accessors on a WPFWindow instance.

    This function inspects all attributes of the window, identifies
    WPF control types, and creates group accessors for each type.

    Call this after the XAML has been loaded (in __init__ after
    calling the parent constructor).

    Args:
        window: A WPFWindow instance with XAML already loaded

    Example:
        class MyWindow(forms.WPFWindow):
            def __init__(self):
                forms.WPFWindow.__init__(self, 'MainWindow.xaml')
                setup_element_groups(self)
    """
    # Import WPF types
    try:
        from System.Windows.Controls import (
            Button, TextBox, ComboBox, CheckBox, RadioButton,
            ListView, ListBox, DataGrid, TextBlock, Label,
            ProgressBar, Slider, TabControl, TabItem, Image,
            Menu, MenuItem, TreeView, TreeViewItem, ToolBar,
            StatusBar, Expander, GroupBox, ScrollViewer,
            PasswordBox, RichTextBox, DatePicker, Calendar,
            Grid, StackPanel, WrapPanel, DockPanel, Canvas, Border
        )

        type_map = {
            Button: 'Button',
            TextBox: 'TextBox',
            ComboBox: 'ComboBox',
            CheckBox: 'CheckBox',
            RadioButton: 'RadioButton',
            ListView: 'ListView',
            ListBox: 'ListBox',
            DataGrid: 'DataGrid',
            TextBlock: 'TextBlock',
            Label: 'Label',
            ProgressBar: 'ProgressBar',
            Slider: 'Slider',
            TabControl: 'TabControl',
            TabItem: 'TabItem',
            Image: 'Image',
            Menu: 'Menu',
            MenuItem: 'MenuItem',
            TreeView: 'TreeView',
            TreeViewItem: 'TreeViewItem',
            ToolBar: 'ToolBar',
            StatusBar: 'StatusBar',
            Expander: 'Expander',
            GroupBox: 'GroupBox',
            ScrollViewer: 'ScrollViewer',
            PasswordBox: 'PasswordBox',
            RichTextBox: 'RichTextBox',
            DatePicker: 'DatePicker',
            Calendar: 'Calendar',
            Grid: 'Grid',
            StackPanel: 'StackPanel',
            WrapPanel: 'WrapPanel',
            DockPanel: 'DockPanel',
            Canvas: 'Canvas',
            Border: 'Border',
        }
    except ImportError:
        # Fallback for environments where not all types are available
        from System.Windows.Controls import (
            Button, TextBox, ComboBox, CheckBox,
            ListView, ListBox, Label, ProgressBar
        )

        type_map = {
            Button: 'Button',
            TextBox: 'TextBox',
            ComboBox: 'ComboBox',
            CheckBox: 'CheckBox',
            ListView: 'ListView',
            ListBox: 'ListBox',
            Label: 'Label',
            ProgressBar: 'ProgressBar',
        }

    # Initialize groups dictionary
    groups = {name: [] for name in type_map.values()}

    # Find all named elements and group by type
    for attr_name in dir(window):
        if attr_name.startswith('_'):
            continue

        try:
            element = getattr(window, attr_name)
            for wpf_type, group_name in type_map.items():
                if isinstance(element, wpf_type):
                    groups[group_name].append(attr_name)
                    break
        except (AttributeError, TypeError):
            # Skip attributes that can't be accessed
            pass

    # Create group accessors for non-empty groups
    for group_name, element_names in groups.items():
        if element_names:
            group = ElementGroup(window, element_names)
            setattr(window, group_name, group)


def get_elements_by_type(window, wpf_type):
    """
    Get all elements of a specific WPF type from a window.

    Args:
        window: A WPFWindow instance
        wpf_type: The WPF type to filter by (e.g., ComboBox)

    Returns:
        List of (name, element) tuples for all matching elements
    """
    elements = []

    for attr_name in dir(window):
        if attr_name.startswith('_'):
            continue

        try:
            element = getattr(window, attr_name)
            if isinstance(element, wpf_type):
                elements.append((attr_name, element))
        except (AttributeError, TypeError):
            pass

    return elements
`;
}

async function generateAllStubsOnStartup(): Promise<void> {
  const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
  if (!config.get<boolean>('autoGenerate', true)) {
    return;
  }

  // Ensure stubs folder and settings are configured
  await ensureStubsFolderConfigured();

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

    // Get stubs folder path
    const stubsFolder = getStubsFolderPath();
    if (!stubsFolder) {
      outputChannel.appendLine('No workspace folder found - cannot generate stubs');
      return result;
    }

    // Generate the XAML-named stub file
    const stubClassName = baseName
      .split(/[-_\s]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Elements';

    const stubContent = generateStub(stubClassName, elements);
    // Generate .py file (not .pyi) for better Pylance compatibility
    const stubFileName = `${prefix}${baseName}${suffix}.py`;
    const stubPath = path.join(stubsFolder, stubFileName);

    fs.writeFileSync(stubPath, stubContent, 'utf-8');
    outputChannel.appendLine(`Generated stub: typings/${stubFileName} (${elements.length} elements)`);
    result.stubs++;

    // Find Python files that use this XAML and inject type annotations
    if (autoInject) {
      const pyFiles = findPythonFilesUsingXaml(xamlPath);

      for (const { pyPath, className } of pyFiles) {
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
    const baseName = path.basename(xamlUri.fsPath, '.xaml');

    const config = vscode.workspace.getConfiguration('xamlPythonIntellisense');
    const prefix = config.get<string>('stubFilePrefix', '_');
    const suffix = config.get<string>('stubFileSuffix', '_xaml');

    const stubsFolder = getStubsFolderPath();
    if (!stubsFolder) {
      return;
    }

    // Delete both .py and .pyi files (for backwards compatibility)
    const stubFileNamePy = `${prefix}${baseName}${suffix}.py`;
    const stubFileNamePyi = `${prefix}${baseName}${suffix}.pyi`;
    const stubPathPy = path.join(stubsFolder, stubFileNamePy);
    const stubPathPyi = path.join(stubsFolder, stubFileNamePyi);

    if (fs.existsSync(stubPathPy)) {
      fs.unlinkSync(stubPathPy);
      outputChannel.appendLine(`Deleted stub: ${stubFileNamePy}`);
    }
    if (fs.existsSync(stubPathPyi)) {
      fs.unlinkSync(stubPathPyi);
      outputChannel.appendLine(`Deleted stub: ${stubFileNamePyi}`);
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
