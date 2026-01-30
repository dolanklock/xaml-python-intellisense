# XAML Python IntelliSense

A VS Code extension that provides IntelliSense/autocomplete for WPF XAML elements in Python code. Designed for pyRevit and IronPython development.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
  - [New pyRevit Project](#new-pyrevit-project-step-by-step)
  - [Existing Project](#existing-project-step-by-step)
  - [Using a Shared Base Class](#using-a-shared-base-class)
- [Usage](#usage)
- [Configuration](#configuration)
- [Supported WPF Controls](#supported-wpf-controls)
- [Understanding TYPE_CHECKING and Static Analysis](#understanding-type_checking-and-static-analysis)
- [How the Two Systems Work Together](#how-the-two-systems-work-together)
- [Smart Inheritance Detection](#smart-inheritance-detection)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

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

### From Source

1. Clone and build the extension:
   ```bash
   git clone https://github.com/dolanklock/xaml-python-intellisense
   cd xaml-python-intellisense
   npm install
   npm run package
   ```

2. Install the generated `.vsix` file in VS Code:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Click the `...` menu (top-right of Extensions panel)
   - Select **Install from VSIX...**
   - Navigate to the cloned folder and select the generated `.vsix` file
   - Click **Install**
   - Reload VS Code when prompted

## How It Works

When you save a XAML file, the extension automatically:

1. **Parses the XAML** to find all elements with `x:Name` attributes
2. **Creates a `typings/` folder** at your workspace root (if it doesn't exist)
3. **Generates a `.py` stub file** in the typings folder with type definitions
4. **Configures VS Code settings** to recognize the stubs folder
5. **Finds Python files** that reference the XAML (classes inheriting from `WPFWindow`)
6. **Injects type annotations** into your Python class automatically
7. **For pyRevit**: Auto-detects `.extension` folders and copies `wpf_helpers.py` to the `lib/` folder for runtime support

### Auto-Injection Behavior

The extension checks whether your Python file already has the TYPE_CHECKING boilerplate before injecting. Here's how it decides:

| Scenario | What happens on XAML save |
|----------|---------------------------|
| File has `_XAMLBase` anywhere in it | **Skipped** - assumes already set up |
| File has no `_XAMLBase` but class inherits from `forms.WPFWindow` | **Injects** - adds full boilerplate |
| Parent class already has `_XAMLBase` (e.g., shared base class) | **Skipped** - parent handles it |

**What this means:**
- If you manually remove just the `try/except TYPE_CHECKING` block but keep `_XAMLBase` in your class definition, the extension will **not** re-add it
- If you remove **everything** (revert to `class MyDialog(forms.WPFWindow):` with no `_XAMLBase`), the extension **will** re-inject on the next XAML save
- To permanently prevent auto-injection for a file, either keep `_XAMLBase` in the file or set `xamlPythonIntellisense.autoInjectAnnotations` to `false` in settings

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

## Getting Started

### New pyRevit Project (Step-by-Step)

Follow these steps to set up IntelliSense in a new pyRevit project:

#### Step 1: Install the Extension

Follow the [Installation](#installation) instructions above to build and install the extension.

#### Step 2: Create Your Project Structure

```
my-tools.extension/
├── MyTools.tab/
│   └── MyPanel.panel/
│       └── MyButton.pushbutton/
│           ├── script.py
│           └── UI/
│               └── MainWindow.xaml
└── lib/
```

#### Step 3: Create Your XAML File

Create `UI/MainWindow.xaml` with named elements using `x:Name`:

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="My Dialog" Height="300" Width="400">
    <StackPanel Margin="10">
        <TextBlock Text="Select a project:" Margin="0,0,0,5"/>
        <ComboBox x:Name="project_combobox" Margin="0,0,0,10"/>

        <TextBlock Text="Enter name:" Margin="0,0,0,5"/>
        <TextBox x:Name="name_textbox" Margin="0,0,0,10"/>

        <CheckBox x:Name="include_checkbox" Content="Include details" Margin="0,0,0,10"/>

        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
            <Button x:Name="ok_button" Content="OK" Width="75" Margin="0,0,10,0"/>
            <Button x:Name="cancel_button" Content="Cancel" Width="75"/>
        </StackPanel>
    </StackPanel>
</Window>
```

#### Step 4: Create Your Python File

Create `script.py` with a basic WPFWindow class:

```python
from pyrevit import forms

class MyDialog(forms.WPFWindow):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'UI/MainWindow.xaml')

    def ok_button_click(self, sender, args):
        self.Close()

# Show the dialog
dialog = MyDialog()
dialog.ShowDialog()
```

#### Step 5: Save the XAML File

**Save `MainWindow.xaml`** and the extension will automatically:

1. ✅ Create `typings/` folder at your workspace root
2. ✅ Generate `typings/_MainWindow_xaml.py` stub file
3. ✅ Copy `wpf_helpers.py` to your `lib/` folder
4. ✅ Inject TYPE_CHECKING boilerplate into `script.py`
5. ✅ Configure VS Code settings

Your `script.py` is now transformed to:

```python
from pyrevit import forms
from wpf_helpers import setup_element_groups

# IronPython doesn't have typing module, so we handle it gracefully
try:
  from typing import TYPE_CHECKING
except ImportError:
  TYPE_CHECKING = False

if TYPE_CHECKING:
  from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
  _XAMLBase = forms.WPFWindow

class MyDialog(_XAMLBase):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'UI/MainWindow.xaml')
        setup_element_groups(self)

    def ok_button_click(self, sender, args):
        self.Close()
```

#### Step 6: Enjoy IntelliSense!

Now when you type `self.` you'll see all your XAML elements with full autocomplete:

```python
def setup_ui(self):
    # Direct element access
    self.project_combobox.ItemsSource = ['Project A', 'Project B']
    self.name_textbox.Text = "Default"
    self.include_checkbox.IsChecked = True

    # Type group access
    self.ComboBox.project_combobox.SelectedIndex = 0
    self.Button.ok_button.IsEnabled = False
```

---

### Existing Project (Step-by-Step)

Already have a pyRevit project with XAML files? Here's how to add IntelliSense:

#### Step 1: Install the Extension

Follow the [Installation](#installation) instructions above to build and install the extension.

#### Step 2: Open Your Project

Open your pyRevit extension folder in VS Code (the folder containing `.extension`).

#### Step 3: Generate Stubs

Run the command: **Cmd/Ctrl+Shift+P** → `XAML: Generate Python Stubs`

This will:
- Scan all `.xaml` files in your workspace
- Generate stub files in `typings/`
- Inject TYPE_CHECKING into Python files that use XAML

#### Step 4: Check Your Python Files

The extension automatically handles different inheritance patterns:

**If your class inherits from `forms.WPFWindow`:**
```python
# BEFORE
class MyDialog(forms.WPFWindow):
    ...

# AFTER (auto-transformed)
class MyDialog(_XAMLBase):  # _XAMLBase = forms.WPFWindow at runtime
    ...
```

**If you use a base class that already has `_XAMLBase` (like AutoSyncBase):**
```python
# The extension detects this and skips the file!
# No changes are made - the parent class handles TYPE_CHECKING
class EditDialog(AutoSyncBase):
    ...
```

#### Step 5: Verify IntelliSense

Open a Python file that uses XAML, type `self.` and you should see your XAML elements in the autocomplete list.

**Not working?** Check the [Troubleshooting](#troubleshooting) section.

---

### Using a Shared Base Class

> **Recommended Pattern:** This is the recommended approach for projects with multiple dialogs. It keeps your code DRY and makes child dialogs clean and simple.

For larger projects, create a shared base class that all dialogs inherit from. This avoids repeating the TYPE_CHECKING boilerplate in every file.

#### Step 1: Create Your Base Class

Create `lib/MyBaseDialog.py`:

```python
import os
from pyrevit import forms
from wpf_helpers import setup_element_groups

# IronPython doesn't have typing module, so we handle it gracefully
try:
  from typing import TYPE_CHECKING
except ImportError:
  TYPE_CHECKING = False

if TYPE_CHECKING:
  from _BaseDialog_xaml import BaseDialogElements as _XAMLBase
else:
  _XAMLBase = forms.WPFWindow

class MyBaseDialog(_XAMLBase):
    """Base class for all dialogs in this extension."""

    def __init__(self, xaml_file):
        # Get the directory of the calling script
        script_dir = os.path.dirname(__file__)
        xaml_path = os.path.join(script_dir, xaml_file)
        forms.WPFWindow.__init__(self, xaml_path)
        setup_element_groups(self)

    def show(self):
        """Show the dialog and return the result."""
        return self.ShowDialog()
```

#### Step 2: Create Child Dialogs

Your child dialogs are now simple - no TYPE_CHECKING needed:

```python
# edit_dialog.py
from MyBaseDialog import MyBaseDialog

class EditDialog(MyBaseDialog):
    def __init__(self):
        MyBaseDialog.__init__(self, 'UI/EditDialog.xaml')
        self.setup_ui()

    def setup_ui(self):
        # IntelliSense works! (inherited from base class)
        self.name_textbox.Text = "Edit me"
        self.save_button.Click += self.on_save
```

The extension **automatically detects** that `EditDialog` inherits from `MyBaseDialog` which already has `_XAMLBase`, and **skips injecting** the TYPE_CHECKING boilerplate.

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

## Understanding TYPE_CHECKING and Static Analysis

### How Does IntelliSense Work Without Running Code?

When you're coding, **nothing actually runs**. Your IDE (VS Code with Pylance) uses **static analysis** - it reads and analyzes your Python files as text without executing them.

### The TYPE_CHECKING Constant

`TYPE_CHECKING` is a special constant from Python's `typing` module:
- **Type checkers/IDEs** treat it as `True` during analysis
- **At runtime** it's always `False`

This lets you write imports that only exist for the IDE, not for your actual program.

### Why the try/except Pattern?

**IronPython** (what pyRevit runs on inside Revit) doesn't have the `typing` module at all:

| Environment | What Happens |
|-------------|--------------|
| **VS Code (Pylance/CPython)** | `from typing import TYPE_CHECKING` succeeds, treated as `True` |
| **Revit (IronPython)** | Import fails, we set `TYPE_CHECKING = False` as fallback |

```python
# Works in CPython (VS Code), fails gracefully in IronPython (Revit)
try:
    from typing import TYPE_CHECKING
except ImportError:
    TYPE_CHECKING = False
```

### The Complete Flow

Here's what happens when you type `self.my_button.` in VS Code:

```
You type: self.my_button.
              ↓
IDE's static analyzer reads your file (no execution)
              ↓
Sees TYPE_CHECKING block, treats it as True
              ↓
Follows the import: from _MainWindow_xaml import MainWindowElements
              ↓
Reads typings/_MainWindow_xaml.py stub file
              ↓
Finds my_button is a Button with .Content, .IsEnabled, .Click, etc.
              ↓
Shows you intellisense suggestions
```

### Runtime vs Analysis

```python
if TYPE_CHECKING:
    # IDE follows this path (TYPE_CHECKING = True during analysis)
    from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
    # Revit follows this path (TYPE_CHECKING = False at runtime)
    _XAMLBase = forms.WPFWindow
```

**Key insight**: The stub files in `typings/` are never imported at runtime. They're just documentation that tells the IDE what properties and methods your XAML elements have.

Think of stub files like a dictionary the IDE consults - it reads them to know "this dialog has a button called `my_button` with these properties" without ever running any code.

## How the Two Systems Work Together

This extension uses **two parallel systems** that mirror each other - one for the IDE, one for runtime:

| System | When it runs | What it provides |
|--------|--------------|------------------|
| **Stub files** (`typings/`) | IDE analysis time | Tells Pylance what elements exist and their types |
| **wpf_helpers.py** | Runtime in Revit | Actually creates the element accessors on your window |

### Why Two Systems?

The stub files are **never imported at runtime** - they only exist for the IDE. So we need something to make `self.Button.my_button` actually work when Revit runs your code.

That's what `setup_element_groups(self)` does.

### The Runtime Flow

```python
class MyDialog(_XAMLBase):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'UI/MainWindow.xaml')
        setup_element_groups(self)  # ← This creates self.Button, self.ComboBox, etc.

        # Now this works:
        self.Button.my_button.Content = "Click me"
```

When `setup_element_groups(self)` runs, it:

1. **Introspects** the WPF window to find all named XAML elements
2. **Groups them by type** (all Buttons together, all ComboBoxes together, etc.)
3. **Creates `ElementGroup` objects** and attaches them to `self`

After this call:
- `self.Button` exists (contains all Button elements)
- `self.Button.my_button` returns the actual WPF Button
- `self.ComboBox.project_combo` returns the actual WPF ComboBox

### Side-by-Side Comparison

**What the stub file says (for IDE):**
```python
# typings/_MainWindow_xaml.py (auto-generated)
class _ButtonGroup:
    my_button: _ButtonType
    ok_button: _ButtonType

class MainWindowElements:
    Button: _ButtonGroup
```

**What wpf_helpers creates (at runtime):**
```python
# After setup_element_groups(self) runs:
self.Button = ElementGroup(...)  # Contains my_button, ok_button
self.Button.my_button  # Returns actual WPF Button from the window
```

The stub describes the **shape** of the data. The wpf_helpers **creates** that shape at runtime.

### The Complete Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR CODE                                │
│  class MyDialog(_XAMLBase):                                      │
│      def __init__(self):                                         │
│          forms.WPFWindow.__init__(self, 'MainWindow.xaml')       │
│          setup_element_groups(self)                              │
│          self.Button.my_button.Content = "Hello"                 │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│   IDE ANALYSIS TIME     │         │   RUNTIME (REVIT)       │
├─────────────────────────┤         ├─────────────────────────┤
│ TYPE_CHECKING = True    │         │ TYPE_CHECKING = False   │
│                         │         │                         │
│ _XAMLBase = stub class  │         │ _XAMLBase = WPFWindow   │
│ (MainWindowElements)    │         │                         │
│                         │         │ setup_element_groups()  │
│ Stub file tells IDE:    │         │ creates self.Button,    │
│ "self.Button.my_button  │         │ self.ComboBox, etc.     │
│  is a Button with       │         │ from actual XAML        │
│  .Content, .Click..."   │         │ elements                │
│                         │         │                         │
│ ➜ IntelliSense works!   │         │ ➜ Code runs correctly!  │
└─────────────────────────┘         └─────────────────────────┘
```

### Key Insight

The stub files and wpf_helpers are **mirrors** of each other:
- **Stubs** = documentation for the IDE (static, generated from XAML)
- **wpf_helpers** = runtime implementation (dynamic, reads from live WPF window)

They must stay in sync - which is why the extension generates both from the same XAML file.

## Smart Inheritance Detection

The extension intelligently handles different class inheritance patterns. It automatically detects what your class inherits from and takes the appropriate action.

### How It Works

When the extension finds a Python file that uses XAML, it checks the class inheritance:

| Your Class Inherits From | What Extension Does |
|--------------------------|---------------------|
| `forms.WPFWindow` or `WPFWindow` | **Replaces** with `_XAMLBase` |
| A class that already has `_XAMLBase` | **Skips** the file entirely |
| Something else | **Adds** `_XAMLBase` to inheritance |

### Pattern 1: Direct WPFWindow (Most Common)

This is the typical case for simple dialogs:

```python
# BEFORE (what you write)
class MyDialog(forms.WPFWindow):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'UI/MainWindow.xaml')
```

```python
# AFTER (auto-transformed by extension)
if TYPE_CHECKING:
  from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
  _XAMLBase = forms.WPFWindow  # Same as before at runtime!

class MyDialog(_XAMLBase):
    def __init__(self):
        forms.WPFWindow.__init__(self, 'UI/MainWindow.xaml')
        setup_element_groups(self)
```

**At runtime:** `_XAMLBase = forms.WPFWindow`, so your class still inherits from `forms.WPFWindow` - no behavior change!

### Pattern 2: Base Class Already Has _XAMLBase

If you have a shared base class (like `AutoSyncBase`) that already uses `_XAMLBase`, the extension **detects this and skips the child file entirely**:

```python
# lib/AutoSyncBase.py - Base class with _XAMLBase
if TYPE_CHECKING:
  from _AutoSync_xaml import AutoSyncElements as _XAMLBase
else:
  _XAMLBase = forms.WPFWindow

class AutoSyncBase(_XAMLBase):
    """Shared base class for all AutoSync dialogs."""
    ...
```

```python
# edit_dialog.py - Child class
from AutoSyncBase import AutoSyncBase

# Extension sees AutoSyncBase already has _XAMLBase
# NO CHANGES MADE - this file is skipped!
class EditDialog(AutoSyncBase):
    def __init__(self):
        AutoSyncBase.__init__(self, 'UI/EditDialog.xaml')
        # IntelliSense still works through inheritance!
        self.save_button.Click += self.on_save
```

**Why this works:** The IDE follows the inheritance chain. `EditDialog` → `AutoSyncBase` → `_XAMLBase` → stub class. IntelliSense flows down through the chain.

### Pattern 3: Custom Inheritance

If your class inherits from something other than WPFWindow (and that class doesn't have `_XAMLBase`), the extension adds `_XAMLBase` to the inheritance:

```python
# BEFORE
class MyDialog(SomeOtherMixin):
    ...
```

```python
# AFTER (auto-transformed)
if TYPE_CHECKING:
  from _MainWindow_xaml import MainWindowElements as _XAMLBase
else:
  _XAMLBase = object  # Safe base for multiple inheritance

class MyDialog(_XAMLBase, SomeOtherMixin):
    ...
```

**At runtime:** `_XAMLBase = object`, so the effective inheritance is just `SomeOtherMixin` (since `object` is already at the base of everything).

### Detection Logic

The extension checks if a parent class has `_XAMLBase` by:

1. **Same file:** Checks if the parent class is defined in the same file with `_XAMLBase` in its inheritance
2. **Imported class:** Finds the import statement, locates the source file (checking `lib/` folders), and scans for `_XAMLBase`

```
my-tools.extension/
├── lib/
│   └── AutoSyncBase.py    ← Extension checks here for _XAMLBase
└── MyTool.tab/
    └── MyPanel.panel/
        └── MyButton.pushbutton/
            └── edit_dialog.py  ← Inherits from AutoSyncBase
```

## Best Practices

### 1. Use a Shared Base Class (Recommended)

For projects with more than 2-3 dialogs, create a shared base class that handles:
- TYPE_CHECKING boilerplate
- XAML loading
- `setup_element_groups()` call

**Benefits:**
- Child dialogs have zero boilerplate
- Single place to update if patterns change
- Extension auto-detects and skips child files

See [Using a Shared Base Class](#using-a-shared-base-class) for setup instructions.

### 2. Keep XAML Files Near Python Files

Recommended structure:
```
MyButton.pushbutton/
├── script.py
├── my_dialog.py
└── UI/
    └── MainWindow.xaml
```

The extension searches the XAML file's directory and parent directory for Python files. Keeping them close together ensures reliable auto-detection.

### 3. Use Descriptive x:Name Attributes

**Good naming:**
```xml
<ComboBox x:Name="project_combobox"/>
<Button x:Name="save_button"/>
<TextBox x:Name="search_textbox"/>
```

**Avoid:**
```xml
<ComboBox x:Name="cb1"/>
<Button x:Name="btn"/>
<TextBox x:Name="txt"/>
```

Clear, descriptive names make IntelliSense suggestions more useful and your code more readable.

### 4. Don't Commit the typings/ Folder

The `typings/` folder contains auto-generated stub files. Add it to `.gitignore`:

```
typings/
```

The extension will regenerate stubs when teammates open the project.

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

### v0.7.0
- **Smart inheritance detection** - Extension now intelligently handles different inheritance patterns
- Automatically detects if parent class already has `_XAMLBase` and skips injection
- Supports shared base class patterns (like AutoSyncBase) - child classes need no boilerplate
- For `forms.WPFWindow`: replaces with `_XAMLBase` (equivalent at runtime)
- For custom classes: adds `_XAMLBase` to inheritance list
- Added comprehensive "Getting Started" guides for new and existing projects
- Added "Smart Inheritance Detection" documentation with examples

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
