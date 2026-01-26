import { XamlElement } from './xamlParser';

/**
 * Full WPF type definitions with properties and methods
 */
const TYPE_DEFINITIONS: Record<string, string[]> = {
  'ComboBox': [
    'ItemsSource: Any',
    'SelectedItem: Any',
    'SelectedIndex: int',
    'SelectedValue: Any',
    'Items: ItemCollection',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'DisplayMemberPath: str',
    'SelectedValuePath: str',
    'IsDropDownOpen: bool',
    'IsEditable: bool',
    'Text: str',
    'IsReadOnly: bool',
    'MaxDropDownHeight: float',
    'def SelectAll(self) -> None: ...',
  ],
  'Button': [
    'Content: Any',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'Command: ICommand',
    'CommandParameter: Any',
    'IsPressed: bool',
    'IsDefault: bool',
    'IsCancel: bool',
    'ClickMode: ClickMode',
    'Background: Brush',
    'Foreground: Brush',
    'FontSize: float',
    'FontWeight: FontWeight',
    'Width: float',
    'Height: float',
    'Margin: Thickness',
    'Padding: Thickness',
    'HorizontalAlignment: HorizontalAlignment',
    'VerticalAlignment: VerticalAlignment',
    'ToolTip: Any',
  ],
  'TextBox': [
    'Text: str',
    'IsReadOnly: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'MaxLength: int',
    'SelectedText: str',
    'SelectionStart: int',
    'SelectionLength: int',
    'CaretIndex: int',
    'AcceptsReturn: bool',
    'AcceptsTab: bool',
    'TextWrapping: TextWrapping',
    'HorizontalScrollBarVisibility: ScrollBarVisibility',
    'VerticalScrollBarVisibility: ScrollBarVisibility',
    'Background: Brush',
    'Foreground: Brush',
    'FontSize: float',
    'FontFamily: FontFamily',
    'def Clear(self) -> None: ...',
    'def SelectAll(self) -> None: ...',
    'def Select(self, start: int, length: int) -> None: ...',
    'def AppendText(self, text: str) -> None: ...',
    'def Copy(self) -> None: ...',
    'def Cut(self) -> None: ...',
    'def Paste(self) -> None: ...',
  ],
  'CheckBox': [
    'IsChecked: Optional[bool]',
    'Content: Any',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'IsThreeState: bool',
    'Background: Brush',
    'Foreground: Brush',
    'FontSize: float',
  ],
  'RadioButton': [
    'IsChecked: Optional[bool]',
    'Content: Any',
    'GroupName: str',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'Background: Brush',
    'Foreground: Brush',
  ],
  'ListView': [
    'ItemsSource: Any',
    'SelectedItem: Any',
    'SelectedItems: IList',
    'SelectedIndex: int',
    'Items: ItemCollection',
    'View: ViewBase',
    'SelectionMode: SelectionMode',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'def ScrollIntoView(self, item: Any) -> None: ...',
  ],
  'ListBox': [
    'ItemsSource: Any',
    'SelectedItem: Any',
    'SelectedItems: IList',
    'SelectedIndex: int',
    'Items: ItemCollection',
    'SelectionMode: SelectionMode',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'DisplayMemberPath: str',
    'def ScrollIntoView(self, item: Any) -> None: ...',
  ],
  'DataGrid': [
    'ItemsSource: Any',
    'SelectedItem: Any',
    'SelectedItems: IList',
    'SelectedIndex: int',
    'SelectedCells: IList[DataGridCellInfo]',
    'Columns: ObservableCollection[DataGridColumn]',
    'CanUserAddRows: bool',
    'CanUserDeleteRows: bool',
    'CanUserSortColumns: bool',
    'CanUserReorderColumns: bool',
    'CanUserResizeColumns: bool',
    'CanUserResizeRows: bool',
    'AutoGenerateColumns: bool',
    'IsReadOnly: bool',
    'SelectionMode: DataGridSelectionMode',
    'SelectionUnit: DataGridSelectionUnit',
    'GridLinesVisibility: DataGridGridLinesVisibility',
    'HeadersVisibility: DataGridHeadersVisibility',
    'def ScrollIntoView(self, item: Any) -> None: ...',
    'def BeginEdit(self) -> bool: ...',
    'def CancelEdit(self) -> bool: ...',
    'def CommitEdit(self) -> bool: ...',
  ],
  'TextBlock': [
    'Text: str',
    'Visibility: Visibility',
    'FontSize: float',
    'FontWeight: FontWeight',
    'FontFamily: FontFamily',
    'FontStyle: FontStyle',
    'Foreground: Brush',
    'Background: Brush',
    'TextWrapping: TextWrapping',
    'TextTrimming: TextTrimming',
    'TextAlignment: TextAlignment',
    'LineHeight: float',
    'Padding: Thickness',
  ],
  'Label': [
    'Content: Any',
    'Visibility: Visibility',
    'IsEnabled: bool',
    'Background: Brush',
    'Foreground: Brush',
    'FontSize: float',
    'FontWeight: FontWeight',
    'Padding: Thickness',
    'Target: UIElement',
  ],
  'ProgressBar': [
    'Value: float',
    'Minimum: float',
    'Maximum: float',
    'IsIndeterminate: bool',
    'Orientation: Orientation',
    'Visibility: Visibility',
    'IsEnabled: bool',
    'Width: float',
    'Height: float',
  ],
  'Image': [
    'Source: ImageSource',
    'Stretch: Stretch',
    'StretchDirection: StretchDirection',
    'Width: float',
    'Height: float',
    'Visibility: Visibility',
    'Opacity: float',
  ],
  'TabControl': [
    'SelectedItem: Any',
    'SelectedIndex: int',
    'SelectedContent: Any',
    'Items: ItemCollection',
    'ItemsSource: Any',
    'TabStripPlacement: Dock',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'TabItem': [
    'Header: Any',
    'Content: Any',
    'IsSelected: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'Slider': [
    'Value: float',
    'Minimum: float',
    'Maximum: float',
    'SmallChange: float',
    'LargeChange: float',
    'TickFrequency: float',
    'TickPlacement: TickPlacement',
    'IsSnapToTickEnabled: bool',
    'Orientation: Orientation',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'ScrollViewer': [
    'Content: Any',
    'HorizontalScrollBarVisibility: ScrollBarVisibility',
    'VerticalScrollBarVisibility: ScrollBarVisibility',
    'HorizontalOffset: float',
    'VerticalOffset: float',
    'ScrollableHeight: float',
    'ScrollableWidth: float',
    'ViewportHeight: float',
    'ViewportWidth: float',
    'def ScrollToTop(self) -> None: ...',
    'def ScrollToBottom(self) -> None: ...',
    'def ScrollToHome(self) -> None: ...',
    'def ScrollToEnd(self) -> None: ...',
    'def ScrollToHorizontalOffset(self, offset: float) -> None: ...',
    'def ScrollToVerticalOffset(self, offset: float) -> None: ...',
  ],
  'Expander': [
    'Header: Any',
    'Content: Any',
    'IsExpanded: bool',
    'ExpandDirection: ExpandDirection',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'GroupBox': [
    'Header: Any',
    'Content: Any',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'Border': [
    'Child: UIElement',
    'Background: Brush',
    'BorderBrush: Brush',
    'BorderThickness: Thickness',
    'CornerRadius: CornerRadius',
    'Padding: Thickness',
    'Visibility: Visibility',
  ],
  'Grid': [
    'Children: UIElementCollection',
    'RowDefinitions: RowDefinitionCollection',
    'ColumnDefinitions: ColumnDefinitionCollection',
    'Background: Brush',
    'Visibility: Visibility',
    'ShowGridLines: bool',
  ],
  'StackPanel': [
    'Children: UIElementCollection',
    'Orientation: Orientation',
    'Background: Brush',
    'Visibility: Visibility',
  ],
  'WrapPanel': [
    'Children: UIElementCollection',
    'Orientation: Orientation',
    'ItemWidth: float',
    'ItemHeight: float',
    'Background: Brush',
    'Visibility: Visibility',
  ],
  'DockPanel': [
    'Children: UIElementCollection',
    'LastChildFill: bool',
    'Background: Brush',
    'Visibility: Visibility',
  ],
  'Canvas': [
    'Children: UIElementCollection',
    'Background: Brush',
    'Visibility: Visibility',
  ],
  'TreeView': [
    'Items: ItemCollection',
    'ItemsSource: Any',
    'SelectedItem: Any',
    'SelectedValue: Any',
    'SelectedValuePath: str',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'TreeViewItem': [
    'Header: Any',
    'Items: ItemCollection',
    'ItemsSource: Any',
    'IsExpanded: bool',
    'IsSelected: bool',
    'IsEnabled: bool',
  ],
  'Menu': [
    'Items: ItemCollection',
    'ItemsSource: Any',
    'IsMainMenu: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'MenuItem': [
    'Header: Any',
    'Items: ItemCollection',
    'Command: ICommand',
    'CommandParameter: Any',
    'InputGestureText: str',
    'Icon: Any',
    'IsCheckable: bool',
    'IsChecked: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
  'ContextMenu': [
    'Items: ItemCollection',
    'ItemsSource: Any',
    'IsOpen: bool',
    'Placement: PlacementMode',
    'PlacementTarget: UIElement',
  ],
  'ToolBar': [
    'Items: ItemCollection',
    'ItemsSource: Any',
    'Band: int',
    'BandIndex: int',
    'IsOverflowOpen: bool',
    'Orientation: Orientation',
  ],
  'StatusBar': [
    'Items: ItemCollection',
    'ItemsSource: Any',
    'Visibility: Visibility',
  ],
  'PasswordBox': [
    'Password: str',
    'MaxLength: int',
    'PasswordChar: str',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'def SelectAll(self) -> None: ...',
    'def Clear(self) -> None: ...',
  ],
  'RichTextBox': [
    'Document: FlowDocument',
    'IsReadOnly: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'AcceptsReturn: bool',
    'AcceptsTab: bool',
    'def SelectAll(self) -> None: ...',
    'def Copy(self) -> None: ...',
    'def Cut(self) -> None: ...',
    'def Paste(self) -> None: ...',
  ],
  'DatePicker': [
    'SelectedDate: Optional[DateTime]',
    'DisplayDate: DateTime',
    'DisplayDateStart: Optional[DateTime]',
    'DisplayDateEnd: Optional[DateTime]',
    'FirstDayOfWeek: DayOfWeek',
    'IsTodayHighlighted: bool',
    'IsDropDownOpen: bool',
    'IsEnabled: bool',
    'Visibility: Visibility',
    'Text: str',
  ],
  'Calendar': [
    'SelectedDate: Optional[DateTime]',
    'SelectedDates: SelectedDatesCollection',
    'DisplayDate: DateTime',
    'DisplayDateStart: Optional[DateTime]',
    'DisplayDateEnd: Optional[DateTime]',
    'FirstDayOfWeek: DayOfWeek',
    'IsTodayHighlighted: bool',
    'SelectionMode: CalendarSelectionMode',
    'DisplayMode: CalendarMode',
    'IsEnabled: bool',
    'Visibility: Visibility',
  ],
};

interface GroupedElements {
  [typeName: string]: XamlElement[];
}

/**
 * Generate Python stub content for XAML elements
 */
export function generateStub(
  className: string,
  elements: XamlElement[]
): string {
  const lines: string[] = [
    '# Auto-generated stub file for XAML bindings',
    '# Do not edit manually - regenerated on XAML changes',
    '#',
    '# Usage:',
    '#   self.element_name          - Direct access by x:Name',
    '#   self.ComboBox.element_name - Access via type grouping',
    '',
    'from typing import Any, Optional, List, Union',
    '',
    '# Type aliases for WPF types',
    'Visibility = Any  # System.Windows.Visibility',
    'Brush = Any  # System.Windows.Media.Brush',
    'FontWeight = Any  # System.Windows.FontWeight',
    'FontFamily = Any  # System.Windows.Media.FontFamily',
    'FontStyle = Any  # System.Windows.FontStyle',
    'Thickness = Any  # System.Windows.Thickness',
    'CornerRadius = Any  # System.Windows.CornerRadius',
    'ICommand = Any  # System.Windows.Input.ICommand',
    'ItemCollection = Any  # System.Windows.Controls.ItemCollection',
    'IList = Any  # System.Collections.IList',
    'UIElement = Any  # System.Windows.UIElement',
    'UIElementCollection = Any  # System.Windows.Controls.UIElementCollection',
    'ImageSource = Any  # System.Windows.Media.ImageSource',
    'ViewBase = Any  # System.Windows.Controls.ViewBase',
    'SelectionMode = Any  # System.Windows.Controls.SelectionMode',
    'ScrollBarVisibility = Any  # System.Windows.Controls.ScrollBarVisibility',
    'TextWrapping = Any  # System.Windows.TextWrapping',
    'TextTrimming = Any  # System.Windows.TextTrimming',
    'TextAlignment = Any  # System.Windows.TextAlignment',
    'HorizontalAlignment = Any  # System.Windows.HorizontalAlignment',
    'VerticalAlignment = Any  # System.Windows.VerticalAlignment',
    'Orientation = Any  # System.Windows.Controls.Orientation',
    'Stretch = Any  # System.Windows.Media.Stretch',
    'StretchDirection = Any  # System.Windows.Controls.StretchDirection',
    'Dock = Any  # System.Windows.Controls.Dock',
    'ClickMode = Any  # System.Windows.Controls.ClickMode',
    'TickPlacement = Any  # System.Windows.Controls.Primitives.TickPlacement',
    'ExpandDirection = Any  # System.Windows.Controls.ExpandDirection',
    'PlacementMode = Any  # System.Windows.Controls.Primitives.PlacementMode',
    'FlowDocument = Any  # System.Windows.Documents.FlowDocument',
    'DateTime = Any  # System.DateTime',
    'DayOfWeek = Any  # System.DayOfWeek',
    'DataGridSelectionMode = Any  # System.Windows.Controls.DataGridSelectionMode',
    'DataGridSelectionUnit = Any  # System.Windows.Controls.DataGridSelectionUnit',
    'DataGridGridLinesVisibility = Any  # System.Windows.Controls.DataGridGridLinesVisibility',
    'DataGridHeadersVisibility = Any  # System.Windows.Controls.DataGridHeadersVisibility',
    'DataGridCellInfo = Any  # System.Windows.Controls.DataGridCellInfo',
    'DataGridColumn = Any  # System.Windows.Controls.DataGridColumn',
    'ObservableCollection = Any  # System.Collections.ObjectModel.ObservableCollection',
    'RowDefinitionCollection = Any  # System.Windows.Controls.RowDefinitionCollection',
    'ColumnDefinitionCollection = Any  # System.Windows.Controls.ColumnDefinitionCollection',
    'SelectedDatesCollection = Any  # System.Windows.Controls.SelectedDatesCollection',
    'CalendarSelectionMode = Any  # System.Windows.Controls.CalendarSelectionMode',
    'CalendarMode = Any  # System.Windows.Controls.CalendarMode',
    '',
  ];

  // Group elements by type
  const grouped: GroupedElements = {};
  for (const el of elements) {
    if (!grouped[el.type]) {
      grouped[el.type] = [];
    }
    grouped[el.type].push(el);
  }

  // Generate individual element type classes with full definitions
  for (const typeName of Object.keys(grouped)) {
    const props = TYPE_DEFINITIONS[typeName] || [];

    lines.push(`class _${typeName}Type:`);
    lines.push(`    """WPF ${typeName} control type"""`);
    if (props.length > 0) {
      for (const prop of props) {
        lines.push(`    ${prop}`);
      }
    } else {
      // Unknown type - provide basic properties
      lines.push('    IsEnabled: bool');
      lines.push('    Visibility: Visibility');
      lines.push('    Width: float');
      lines.push('    Height: float');
    }
    lines.push('');
  }

  // Generate group accessor classes (self.ComboBox.*, self.Button.*, etc.)
  for (const [typeName, typeElements] of Object.entries(grouped)) {
    lines.push(`class _${typeName}Group:`);
    lines.push(`    """Access all ${typeName} elements by x:Name"""`);
    for (const el of typeElements) {
      lines.push(`    ${el.name}: _${typeName}Type`);
    }
    lines.push('');
  }

  // Generate the main window class
  lines.push(`class ${className}:`);
  lines.push('    """');
  lines.push('    Auto-generated type hints for XAML elements.');
  lines.push('    ');
  lines.push('    Access elements directly:');
  const sampleDirect = elements.slice(0, 3);
  for (const el of sampleDirect) {
    lines.push(`        self.${el.name}`);
  }
  if (elements.length > 3) {
    lines.push('        ...');
  }
  lines.push('    ');
  lines.push('    Or access by type group:');
  const sampleTypes = Object.keys(grouped).slice(0, 3);
  for (const typeName of sampleTypes) {
    lines.push(`        self.${typeName}.<element_name>`);
  }
  lines.push('    """');
  lines.push('');

  // Add type group accessors (self.ComboBox, self.Button, etc.)
  if (Object.keys(grouped).length > 0) {
    lines.push('    # Type group accessors');
    for (const typeName of Object.keys(grouped)) {
      lines.push(`    ${typeName}: _${typeName}Group`);
    }
    lines.push('');
  }

  // Add direct element accessors (self.project_combobox, etc.)
  if (elements.length > 0) {
    lines.push('    # Direct element access by x:Name');
    for (const el of elements) {
      lines.push(`    ${el.name}: _${el.type}Type`);
    }
  }

  return lines.join('\n');
}

/**
 * Get the list of supported WPF types
 */
export function getSupportedTypes(): string[] {
  return Object.keys(TYPE_DEFINITIONS);
}
