# XAML Python IntelliSense

A VS Code extension that provides IntelliSense/autocomplete for WPF XAML elements in Python code. Designed for pyRevit and IronPython development.

## Features

- **Automatic stub generation**: Generates `.pyi` stub files with full type definitions for all XAML elements
- **Auto-injection of type hints**: Automatically adds `TYPE_CHECKING` imports and class annotations to your Python files
- **Direct element access**: Get autocomplete for `self.element_name` based on `x:Name` attributes
- **Type group access**: Access elements grouped by type with `self.ComboBox.element_name`, `self.Button.element_name`, etc.
- **Full WPF type support**: Includes properties and methods for 30+ WPF controls
- **Zero manual setup**: Just save your XAML file and autocomplete works automatically

## How It Works

When you save a XAML file, the extension:

1. **Parses the XAML** to find all elements with `x:Name` attributes
2. **Generates a `.pyi` stub file** with type definitions for all controls
3. **Finds Python files** that reference the XAML (classes inheriting from `WPFWindow`)
4. **Injects type annotations** into your Python class automatically

### Before (no autocomplete)
```python
class MyDialog(forms.WPFWindow):
    def setup(self):
        self.my_combobox  # No autocomplete - Pylance doesn't know the type
```

### After (full autocomplete)
```python
class MyDialog(forms.WPFWindow):
    # XAML Element Type Hints (auto-generated, do not edit)
    if TYPE_CHECKING:
        ComboBox: _ComboBoxGroup
        my_combobox: _ComboBoxType

    def setup(self):
        self.my_combobox.  # Full autocomplete! SelectedItem, ItemsSource, etc.
        self.ComboBox.my_combobox.  # Also works via type groups
```

## Installation

### From VSIX (Local Install)

1. Download the `.vsix` file from releases
2. In VS Code: Extensions → `...` → Install from VSIX
3. Select the downloaded file

### From Source

```bash
git clone https://github.com/dolanklock/xaml-python-intellisense
cd xaml-python-intellisense
npm install
npm run package
# Install the generated .vsix file
```

## Usage

### Automatic Mode (Default)

1. Create or edit a XAML file with named elements:

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

2. **Save the file** - the extension automatically:
   - Generates `_YourFile_xaml.pyi` stub file
   - Injects type annotations into Python files using this XAML

3. In your Python code, you get full autocomplete:

```python
class MyWindow(forms.WPFWindow):
    def setup_ui(self):
        # Direct access
        self.project_combobox.SelectedIndex = 0
        self.project_combobox.ItemsSource = ['A', 'B', 'C']

        # Type group access - see all ComboBoxes at once
        self.ComboBox.project_combobox.IsEnabled = True
```

### Manual Commands

- **Cmd/Ctrl+Shift+P** → `XAML: Generate Python Stubs` - Process all XAML files in workspace
- **Cmd/Ctrl+Shift+P** → `XAML: Generate Stub for Current File` - Process current XAML file

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `xamlPythonIntellisense.autoGenerate` | `true` | Automatically generate stubs when XAML files change |
| `xamlPythonIntellisense.autoInjectAnnotations` | `true` | Automatically inject type hints into Python files |
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

## Project Structure

```
your-project/
├── UI/
│   ├── MainWindow.xaml          # Your XAML file
│   └── _MainWindow_xaml.pyi     # Auto-generated stub
├── main_dialog.py               # Your Python file
└── _MainWindow_xaml.pyi         # Stub copied here for imports
```

## Generated Code

The extension adds a block like this to your Python class:

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
- Only runs during type checking (not at runtime)
- Doesn't affect your program's behavior
- Enables full IntelliSense in VS Code

## Requirements

- VS Code 1.74.0 or higher
- Pylance extension (for Python type checking)

## Troubleshooting

### Autocomplete not working?

1. **Reload VS Code**: Cmd/Ctrl+Shift+P → "Reload Window"
2. **Restart Pylance**: Cmd/Ctrl+Shift+P → "Python: Restart Language Server"
3. **Check Output**: View → Output → Select "XAML Python IntelliSense"

### Types not updating after XAML change?

1. Make sure you **saved** the XAML file
2. Run `XAML: Generate Python Stubs` manually
3. Check the Output panel for errors

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/dolanklock/xaml-python-intellisense).
