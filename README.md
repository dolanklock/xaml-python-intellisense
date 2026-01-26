# XAML Python IntelliSense

A VS Code extension that provides IntelliSense/autocomplete for WPF XAML elements in Python code. Designed for pyRevit and IronPython development.

## Features

- **Automatic stub generation**: When you save a XAML file, the extension automatically generates a `.pyi` stub file with type hints
- **Direct element access**: Get autocomplete for `self.element_name` based on `x:Name` attributes in your XAML
- **Type group access**: Access elements grouped by type with `self.ComboBox.element_name`, `self.Button.element_name`, etc.
- **Full WPF type support**: Includes properties and methods for 30+ WPF controls

## Installation

### From Source

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 in VS Code to launch the extension in debug mode

### Package as VSIX

```bash
npm run package
```

Then install the generated `.vsix` file in VS Code.

## Usage

### Automatic Mode (Default)

1. Create or edit a XAML file with named elements:

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <StackPanel>
        <ComboBox x:Name="project_combobox"/>
        <ComboBox x:Name="category_combobox"/>
        <Button x:Name="ok_button" Content="OK"/>
        <Button x:Name="cancel_button" Content="Cancel"/>
        <TextBox x:Name="search_textbox"/>
    </StackPanel>
</Window>
```

2. Save the file - a stub file (`_YourFile_xaml.pyi`) is automatically generated

3. In your Python code, you now get autocomplete:

```python
from pyrevit import forms

class MyWindow(forms.WPFWindow):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'MainWindow.xaml')

    def setup_ui(self):
        # Direct access - autocomplete shows all ComboBox properties
        self.project_combobox.SelectedIndex = 0
        self.project_combobox.ItemsSource = ['Project A', 'Project B']

        # Type group access - see all ComboBoxes at once
        self.ComboBox.project_combobox.IsEnabled = True
        self.ComboBox.category_combobox.IsEnabled = False

        # Same for buttons
        self.Button.ok_button.Content = "Submit"
        self.Button.cancel_button.IsEnabled = True
```

### Manual Commands

- **XAML: Generate Python Stubs** - Generate stubs for all XAML files in the workspace
- **XAML: Generate Stub for Current File** - Generate stub for the currently open XAML file

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `xamlPythonIntellisense.autoGenerate` | `true` | Automatically generate stubs when XAML files change |
| `xamlPythonIntellisense.stubFilePrefix` | `_` | Prefix for generated stub files |
| `xamlPythonIntellisense.stubFileSuffix` | `_xaml` | Suffix for generated stub files (before .pyi) |

## Supported WPF Controls

The extension includes full type definitions for:

- **Input Controls**: Button, TextBox, ComboBox, CheckBox, RadioButton, Slider, PasswordBox, RichTextBox, DatePicker, Calendar
- **List Controls**: ListView, ListBox, DataGrid, TreeView
- **Layout Controls**: Grid, StackPanel, WrapPanel, DockPanel, Canvas, Border, ScrollViewer, Expander, GroupBox
- **Navigation**: TabControl, TabItem, Menu, MenuItem, ContextMenu, ToolBar, StatusBar
- **Display**: TextBlock, Label, Image, ProgressBar

## Runtime Support for Type Groups

The stub files provide IDE autocomplete, but to make `self.ComboBox.element_name` work at runtime, add this helper to your project:

```python
# lib/wpf_helpers.py

class ElementGroup:
    """Runtime accessor for grouped XAML elements"""
    def __init__(self, window, element_names):
        self._window = window
        self._names = element_names

    def __getattr__(self, name):
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        return getattr(self._window, name)


def setup_element_groups(window):
    """
    Set up type group accessors on a WPFWindow instance.
    Call this after loading the XAML.
    """
    from System.Windows.Controls import (
        Button, TextBox, ComboBox, CheckBox, RadioButton,
        ListView, ListBox, DataGrid, TextBlock, Label,
        ProgressBar, Slider, TabControl, Image
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
        Image: 'Image',
    }

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
        except:
            pass

    # Create group accessors
    for group_name, element_names in groups.items():
        if element_names:
            group = ElementGroup(window, element_names)
            setattr(window, group_name, group)
```

Usage:

```python
from pyrevit import forms
from wpf_helpers import setup_element_groups

class MyWindow(forms.WPFWindow):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'MainWindow.xaml')
        setup_element_groups(self)  # Enable self.ComboBox.*, self.Button.*, etc.
```

## How It Works

1. The extension watches for XAML file changes
2. When a XAML file is saved, it parses the XML to find all elements with `x:Name` attributes
3. It generates a `.pyi` stub file with:
   - Type classes for each WPF control with all properties/methods
   - Group accessor classes for accessing elements by type
   - A main class with all direct element references
4. Pylance/Pyright picks up the stub file and provides autocomplete

## License

MIT
