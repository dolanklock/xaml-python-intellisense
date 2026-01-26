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
3. **Generates a `.py` stub file** in the typings folder with type definitions
4. **Configures VS Code settings** to recognize the stubs folder
5. **Finds Python files** that reference the XAML (classes inheriting from `WPFWindow`)
6. **Injects type annotations** into your Python class automatically
7. **For pyRevit**: Auto-detects `.extension` folders and copies `wpf_helpers.py` to the `lib/` folder for runtime support

### Project Structure After Setup

**Standard Python project:**
```
your-project/
├── typings/                        # Auto-created stubs folder
│   ├── .gitignore                  # Ignores *.pyi files
│   ├── wpf_helpers.py              # Runtime helper for type groups
│   ├── _MainWindow_xaml.py         # Generated stub
│   └── _EditDialog_xaml.py         # Generated stub
├── .vscode/
│   └── settings.json               # Auto-configured with stubPath
├── UI/
│   ├── MainWindow.xaml
│   └── EditDialog.xaml
└── my_dialog.py                    # Auto-injected with type hints
```

**pyRevit extension:**
```
your-project/
├── typings/                        # Stubs for IDE support
│   └── ...
├── tools.extension/                # pyRevit extension folder
│   ├── lib/
│   │   └── wpf_helpers.py          # Auto-copied here for runtime
│   └── MyTool.tab/
│       └── MyPanel.panel/
│           └── MyButton.pushbutton/
│               ├── script.py
│               ├── my_dialog.py    # Auto-injected with type hints
│               └── UI/
│                   └── MainWindow.xaml
└── .vscode/
    └── settings.json
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
   - Generates `typings/_YourFile_xaml.py` with type definitions
   - Configures VS Code Python settings

5. In your Python code, add a simple inheritance pattern for full autocomplete:

```python
from pyrevit import forms
from wpf_helpers import setup_element_groups

# IronPython compatibility - typing module doesn't exist in IronPython
try:
    from typing import TYPE_CHECKING
except ImportError:
    TYPE_CHECKING = False

if TYPE_CHECKING:
    from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
    _XAMLBase = forms.WPFWindow  # Use actual base class at runtime

class MyWindow(_XAMLBase):  # Only inherit from _XAMLBase
    def __init__(self):
        self.load_xaml('MainWindow.xaml')
        setup_element_groups(self)  # Required for type group access

    def setup_ui(self):
        # Full autocomplete on all XAML elements!
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

## How It Works

The extension uses a clean inheritance-based approach. Add this pattern to your Python file:

```python
from pyrevit import forms
from wpf_helpers import setup_element_groups

# IronPython compatibility - typing module doesn't exist in IronPython
try:
    from typing import TYPE_CHECKING
except ImportError:
    TYPE_CHECKING = False

if TYPE_CHECKING:
    from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
    _XAMLBase = forms.WPFWindow  # Use actual base class at runtime

class MyDialog(_XAMLBase):  # Only inherit from _XAMLBase
    def __init__(self):
        self.load_xaml('MainWindow.xaml')
        setup_element_groups(self)  # Required for type group access (self.ComboBox.name)
```

This approach:
- ✅ Only runs during type checking (not at runtime)
- ✅ Doesn't affect your program's behavior
- ✅ Enables full IntelliSense in VS Code
- ✅ **IronPython compatible** - gracefully handles missing `typing` module
- ✅ **MRO compatible** - avoids inheritance conflicts with WPFWindow
- ✅ **Type group access** - use `self.ComboBox.element_name` patterns

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

### IronPython "No module named typing" error?

IronPython (used by pyRevit) doesn't have the `typing` module. Use the try/except pattern:

```python
# Add this at the top of your file
try:
    from typing import TYPE_CHECKING
except ImportError:
    TYPE_CHECKING = False
```

This ensures the code works in both:
- **IronPython/pyRevit**: `TYPE_CHECKING = False`, type hints skipped at runtime
- **VS Code/Pylance**: Full autocomplete support

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

### v0.6.0
- **Automatic type group support** - `self.ComboBox.element_name`, `self.Button.element_name` patterns now work automatically
- Auto-copies `wpf_helpers.py` to your typings folder (for IDE support)
- **pyRevit integration** - Auto-detects `.extension` folders and copies `wpf_helpers.py` to `lib/` folder for runtime support
- Auto-injects `setup_element_groups(self)` call after XAML is loaded in `__init__`
- Iterate over all elements of a type: `for combo in self.ComboBox: ...`

### v0.5.2
- **Fix MRO (Method Resolution Order) error** - fixes "Cannot create a consistent method resolution order" error in IronPython
- Changed inheritance pattern: `_XAMLBase = forms.WPFWindow` instead of `_XAMLBase = object`
- Class now inherits only from `_XAMLBase` instead of `(_XAMLBase, forms.WPFWindow)`
- This avoids inheritance conflicts when WPFWindow already inherits from object

### v0.5.1
- **IronPython compatibility** - gracefully handle missing `typing` module
- Use try/except pattern for `TYPE_CHECKING` import
- Works in both IronPython (pyRevit) and CPython (VS Code)

### v0.5.0
- **Clean inheritance-based approach** - no more verbose individual type hints
- Just 4 lines of code instead of 50+ for full autocomplete support
- Uses class inheritance pattern: `class MyDialog(_XAMLBase, forms.WPFWindow)`

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
