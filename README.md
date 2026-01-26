# XAML Python IntelliSense

A VS Code extension that provides IntelliSense/autocomplete for WPF XAML elements in Python code. Designed for pyRevit and IronPython development.

## Features

- **Automatic stub generation**: Generates `.pyi` stub files with full type definitions for all XAML elements
- **Centralized stubs folder**: All stub files are placed in a single `typings/` folder (configurable)
- **Auto-injection of type hints**: Automatically adds `TYPE_CHECKING` imports and class annotations to your Python files
- **Auto-configuration**: Automatically configures VS Code Python settings for stub path
- **Direct element access**: Get autocomplete for `self.element_name` based on `x:Name` attributes
- **Type group access**: Access elements grouped by type with `self.ComboBox.element_name`, `self.Button.element_name`, etc.
- **Full WPF type support**: Includes properties and methods for 30+ WPF controls
- **Zero manual setup**: Just save your XAML file and autocomplete works automatically

## Requirements

Before using this extension, ensure you have:

1. **VS Code** version 1.74.0 or higher
2. **Pylance extension** installed (required for Python type checking)
   - Install from VS Code Extensions: Search for "Pylance" by Microsoft
3. **Python extension** installed
   - Install from VS Code Extensions: Search for "Python" by Microsoft

## Installation

### From VSIX (Local Install)

1. Download the `.vsix` file from [releases](https://github.com/dolanklock/xaml-python-intellisense/releases)
2. In VS Code: Extensions → `...` menu → **Install from VSIX**
3. Select the downloaded file
4. Reload VS Code

### From Source

```bash
git clone https://github.com/dolanklock/xaml-python-intellisense
cd xaml-python-intellisense
npm install
npm run package
# Install the generated .vsix file in VS Code
```

## How It Works

When you save a XAML file, the extension automatically:

1. **Parses the XAML** to find all elements with `x:Name` attributes
2. **Creates a `typings/` folder** at your workspace root (if it doesn't exist)
3. **Generates a `.pyi` stub file** in the typings folder with type definitions
4. **Configures VS Code settings** to recognize the stubs folder
5. **Finds Python files** that reference the XAML (classes inheriting from `WPFWindow`)
6. **Injects type annotations** into your Python class automatically

### Project Structure After Setup

```
your-project/
├── typings/                        # Auto-created stubs folder
│   ├── .gitignore                  # Ignores *.pyi files
│   ├── _MainWindow_xaml.pyi        # Generated stub
│   └── _EditDialog_xaml.pyi        # Generated stub
├── .vscode/
│   └── settings.json               # Auto-configured with stubPath
├── UI/
│   ├── MainWindow.xaml
│   └── EditDialog.xaml
└── my_dialog.py                    # Auto-injected with type hints
```

### Auto-Generated VS Code Settings

The extension automatically adds these settings to your workspace:

```json
{
  "python.analysis.stubPath": "./typings",
  "python.analysis.extraPaths": [
    "${workspaceFolder}/typings"
  ]
}
```

## Usage

### Automatic Mode (Default)

1. **Open a workspace** containing XAML files in VS Code
2. The extension activates and creates the `typings/` folder
3. Create or edit a XAML file with named elements:

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <StackPanel>
        <ComboBox x:Name="project_combobox"/>
        <Button x:Name="ok_button" Content="OK"/>
        <TextBox x:Name="search_textbox"/>
    </StackPanel>
</Window>
```

4. **Save the file** - the extension automatically:
   - Generates `typings/_YourFile_xaml.pyi`
   - Injects type annotations into Python files using this XAML

5. In your Python code, you get full autocomplete:

```python
class MyWindow(forms.WPFWindow):
    # XAML Element Type Hints (auto-generated, do not edit)
    if TYPE_CHECKING:
        ComboBox: _ComboBoxGroup
        project_combobox: _ComboBoxType

    def setup_ui(self):
        # Direct access - full autocomplete!
        self.project_combobox.SelectedIndex = 0
        self.project_combobox.ItemsSource = ['A', 'B', 'C']

        # Type group access - see all ComboBoxes
        self.ComboBox.project_combobox.IsEnabled = True
```

### Manual Commands

Open Command Palette (**Cmd/Ctrl+Shift+P**):

| Command | Description |
|---------|-------------|
| `XAML: Generate Python Stubs` | Process all XAML files in workspace |
| `XAML: Generate Stub for Current File` | Process current XAML file |
| `XAML: Configure VS Code Settings` | Manually configure Python stub path settings |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `xamlPythonIntellisense.autoGenerate` | `true` | Automatically generate stubs when XAML files change |
| `xamlPythonIntellisense.autoInjectAnnotations` | `true` | Automatically inject type hints into Python files |
| `xamlPythonIntellisense.autoConfigureSettings` | `true` | Automatically configure VS Code Python settings |
| `xamlPythonIntellisense.stubsFolder` | `typings` | Folder name for stub files (relative to workspace root) |
| `xamlPythonIntellisense.stubFilePrefix` | `_` | Prefix for generated stub files |
| `xamlPythonIntellisense.stubFileSuffix` | `_xaml` | Suffix for generated stub files |

## Supported WPF Controls

The extension includes full type definitions for:

**Input Controls**
- Button, TextBox, ComboBox, CheckBox, RadioButton
- Slider, PasswordBox, RichTextBox, DatePicker, Calendar

**List Controls**
- ListView, ListBox, DataGrid, TreeView

**Layout Controls**
- Grid, StackPanel, WrapPanel, DockPanel, Canvas
- Border, ScrollViewer, Expander, GroupBox

**Navigation**
- TabControl, TabItem, Menu, MenuItem
- ContextMenu, ToolBar, StatusBar

**Display**
- TextBlock, Label, Image, ProgressBar

## Generated Code

The extension adds this block to your Python class (inside `TYPE_CHECKING` so it doesn't run at runtime):

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from _MainWindow_xaml import (
        _ComboBoxGroup, _ComboBoxType,
        _ButtonGroup, _ButtonType,
        # ... more types
    )

class MyDialog(forms.WPFWindow):
    # XAML Element Type Hints (auto-generated, do not edit)
    if TYPE_CHECKING:
        # Type group accessors: self.ComboBox.element_name
        ComboBox: _ComboBoxGroup
        Button: _ButtonGroup
        # Direct element access: self.element_name
        project_combobox: _ComboBoxType
        ok_button: _ButtonType
```

This code:
- ✅ Only runs during type checking (not at runtime)
- ✅ Doesn't affect your program's behavior
- ✅ Enables full IntelliSense in VS Code
- ✅ Works with pyRevit and IronPython

## Troubleshooting

### Autocomplete not working?

1. **Check Pylance is installed**: Extensions → Search "Pylance" → Should show "Installed"
2. **Reload VS Code**: Cmd/Ctrl+Shift+P → "Reload Window"
3. **Restart Pylance**: Cmd/Ctrl+Shift+P → "Python: Restart Language Server"
4. **Check Output panel**: View → Output → Select "XAML Python IntelliSense"
5. **Verify settings**: Check `.vscode/settings.json` has `python.analysis.stubPath`

### Stubs not generating?

1. Make sure you **saved** the XAML file
2. Check the XAML has elements with `x:Name` attributes
3. Run `XAML: Generate Python Stubs` manually
4. Check the Output panel for errors

### Type hints not injected into Python file?

1. Ensure your Python class **inherits from `WPFWindow`** or `forms.WPFWindow`
2. Ensure your Python file **references the XAML file** (contains the XAML filename)
3. The extension checks the same directory and parent directory for Python files

### Settings not auto-configured?

1. Run `XAML: Configure VS Code Settings` manually
2. Or manually add to `.vscode/settings.json`:
```json
{
  "python.analysis.stubPath": "./typings",
  "python.analysis.extraPaths": ["${workspaceFolder}/typings"]
}
```

## Excluding Stubs from Git

The extension creates a `.gitignore` file in the typings folder. If you want to exclude the entire folder, add to your project's `.gitignore`:

```
typings/
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/dolanklock/xaml-python-intellisense).

## Changelog

### v0.4.0
- Generate `.py` files instead of `.pyi` for better Pylance compatibility
- Auto-configure `python.autoComplete.extraPaths` in addition to `python.analysis.extraPaths`
- Create `__init__.py` in typings folder to make it a proper Python package
- Zero configuration required - everything works automatically

### v0.3.0
- Centralized stubs folder (`typings/` by default)
- Auto-configure VS Code Python settings
- Add `.gitignore` to stubs folder
- New command: `XAML: Configure VS Code Settings`
- New settings: `stubsFolder`, `autoConfigureSettings`

### v0.2.0
- Auto-inject TYPE_CHECKING imports and class annotations
- Find and update Python files automatically

### v0.1.0
- Initial release
- XAML parsing and stub generation
- Support for 30+ WPF controls
