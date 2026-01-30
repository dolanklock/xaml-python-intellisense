import * as fs from 'fs';
import * as path from 'path';
import { XamlElement } from './xamlParser';

/**
 * Generate the stub class name from the XAML base name
 */
function getStubClassName(baseName: string): string {
  return baseName
    .split(/[-_\s]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') + 'Elements';
}

/**
 * Check if a parent class already uses _XAMLBase in its inheritance.
 * This prevents adding _XAMLBase to classes that inherit from a base class
 * which already has _XAMLBase (like AutoSyncBase).
 */
function parentClassHasXAMLBase(
  pyPath: string,
  parentClassName: string
): boolean {
  // Skip checking for known WPF base classes
  if (parentClassName === 'forms.WPFWindow' || parentClassName === 'WPFWindow') {
    return false;
  }

  const content = fs.readFileSync(pyPath, 'utf-8');
  const dir = path.dirname(pyPath);

  // Find imports to locate parent class file
  const importMatch = content.match(
    new RegExp(`from\\s+([\\w.]+)\\s+import\\s+[^\\n]*\\b${parentClassName}\\b`)
  );

  if (!importMatch) {
    // Parent class might be in same file - check for class definition
    const classDefInSameFile = content.match(
      new RegExp(`class\\s+${parentClassName}\\s*\\([^)]*_XAMLBase[^)]*\\)`)
    );
    return !!classDefInSameFile;
  }

  // Resolve import path to actual file
  const modulePath = importMatch[1];

  // Try common locations: same dir, lib folder, parent dirs
  const possiblePaths = [
    path.join(dir, `${modulePath}.py`),
    path.join(dir, '..', 'lib', `${modulePath}.py`),
    path.join(dir, '..', '..', 'lib', `${modulePath}.py`),
    path.join(dir, '..', '..', '..', 'lib', `${modulePath}.py`),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      const parentContent = fs.readFileSync(possiblePath, 'utf-8');
      // Check if parent class inherits from _XAMLBase
      const hasXAMLBase = parentContent.match(
        new RegExp(`class\\s+${parentClassName}\\s*\\([^)]*_XAMLBase[^)]*\\)`)
      );
      return !!hasXAMLBase;
    }
  }

  return false;
}

/**
 * Inject TYPE_CHECKING imports and modify class inheritance for XAML type hints
 * Uses a clean inheritance-based approach instead of verbose individual annotations
 */
export function injectTypeAnnotations(
  pyPath: string,
  className: string,
  elements: XamlElement[],
  stubFileName: string
): boolean {
  let content = fs.readFileSync(pyPath, 'utf-8');
  let modified = false;

  // Get stub module name and class name
  const stubModuleName = stubFileName.replace(/\.pyi?$/, '');
  const stubClassName = getStubClassName(stubModuleName.replace(/^_/, '').replace(/_xaml$/, ''));

  // Check if our XAML base import already exists
  const hasXamlBaseImport = content.includes('_XAMLBase') || content.includes(stubClassName);

  // Check if TYPE_CHECKING import exists (either direct import or try/except pattern)
  const hasTypeChecking = content.includes('TYPE_CHECKING') || content.includes('TYPE_CHECKING = False');

  if (hasXamlBaseImport) {
    // Already set up, nothing to do
    return false;
  }

  // Find the class definition
  const classPattern = new RegExp(`^(class\\s+${className}\\s*\\()([^)]*)(\\):)`, 'm');
  const classMatch = content.match(classPattern);

  if (!classMatch) {
    return false;
  }

  // Get the existing inheritance from the class definition
  const existingInheritance = classMatch[2].trim();
  const firstParentClass = existingInheritance.split(',')[0].trim() || 'object';

  // Check if parent class already has _XAMLBase (like AutoSyncBase)
  // If so, skip this file entirely - the parent handles TYPE_CHECKING
  if (parentClassHasXAMLBase(pyPath, firstParentClass)) {
    return false;
  }

  // Determine if we're replacing WPFWindow or adding to existing inheritance
  const isWPFWindow = firstParentClass === 'forms.WPFWindow' || firstParentClass === 'WPFWindow';

  // Add TYPE_CHECKING import if needed (IronPython compatible)
  if (!hasTypeChecking) {
    // Find the imports section
    const lastImportMatch = content.match(/^(import .+|from .+ import .+)$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      // Use try/except for IronPython compatibility
      const typeCheckingImport = `

# IronPython doesn't have typing module, so we handle it gracefully
try:
  from typing import TYPE_CHECKING
except ImportError:
  TYPE_CHECKING = False`;
      content = content.slice(0, insertPos) + typeCheckingImport + content.slice(insertPos);
      modified = true;
    }
  }

  // Determine what _XAMLBase should equal at runtime
  // - If replacing WPFWindow: _XAMLBase = forms.WPFWindow (they're equivalent)
  // - If adding to other inheritance: _XAMLBase = object (safe base for multiple inheritance)
  const runtimeBaseClass = isWPFWindow ? firstParentClass : 'object';

  // Add the XAML base class import block before the class definition
  const xamlImportBlock = `
if TYPE_CHECKING:
  from ${stubModuleName} import ${stubClassName} as _XAMLBase
else:
  _XAMLBase = ${runtimeBaseClass}

`;

  // Find position to insert (before the class definition)
  const classIndex = content.search(new RegExp(`^class\\s+${className}\\s*\\(`, 'm'));
  if (classIndex !== -1) {
    // Check if import block already exists nearby
    const beforeClass = content.slice(Math.max(0, classIndex - 200), classIndex);
    if (!beforeClass.includes('_XAMLBase')) {
      content = content.slice(0, classIndex) + xamlImportBlock + content.slice(classIndex);
      modified = true;
    }
  }

  // Update the class definition based on the inheritance type
  // Need to re-match after potential content changes
  const updatedClassMatch = content.match(classPattern);
  if (updatedClassMatch) {
    const fullMatch = updatedClassMatch[0];
    const beforeParens = updatedClassMatch[1];
    const inheritance = updatedClassMatch[2].trim();
    const afterParens = updatedClassMatch[3];

    // Skip if already using _XAMLBase
    if (!inheritance.includes('_XAMLBase')) {
      let newClassDef: string;

      if (isWPFWindow) {
        // Replace WPFWindow with _XAMLBase (they're equivalent at runtime)
        newClassDef = `${beforeParens}_XAMLBase${afterParens}`;
      } else {
        // Add _XAMLBase to the beginning of existing inheritance
        newClassDef = `${beforeParens}_XAMLBase, ${inheritance}${afterParens}`;
      }

      content = content.replace(fullMatch, newClassDef);
      modified = true;
    }
  }

  // Add wpf_helpers import and setup_element_groups call for type group support
  const hasWpfHelpersImport = content.includes('from wpf_helpers import') || content.includes('import wpf_helpers');
  const hasSetupElementGroups = content.includes('setup_element_groups');

  if (!hasWpfHelpersImport) {
    // Find the imports section and add wpf_helpers import
    const lastImportMatch = content.match(/^(import .+|from .+ import .+)$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      const wpfHelpersImport = `\nfrom wpf_helpers import setup_element_groups`;
      content = content.slice(0, insertPos) + wpfHelpersImport + content.slice(insertPos);
      modified = true;
    }
  }

  // Add setup_element_groups(self) call in __init__ after XAML is loaded
  if (!hasSetupElementGroups) {
    // Look for common patterns where XAML is loaded:
    // - self.load_xaml(...)
    // - forms.WPFWindow.__init__(self, ...)
    // - WPFWindow.__init__(self, ...)
    const xamlLoadPatterns = [
      /^(\s*)(self\.load_xaml\([^)]+\))$/gm,
      /^(\s*)(forms\.WPFWindow\.__init__\(self[^)]*\))$/gm,
      /^(\s*)(WPFWindow\.__init__\(self[^)]*\))$/gm,
    ];

    for (const pattern of xamlLoadPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const fullMatch = match[0];
        const indent = match[1];
        const statement = match[2];
        // Insert setup_element_groups(self) on the next line with same indentation
        const replacement = `${indent}${statement}\n${indent}setup_element_groups(self)`;
        content = content.replace(fullMatch, replacement);
        modified = true;
        break;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(pyPath, content, 'utf-8');
  }

  return modified;
}

/**
 * Remove auto-generated type annotations from a Python file
 */
export function removeTypeAnnotations(pyPath: string): boolean {
  let content = fs.readFileSync(pyPath, 'utf-8');
  let modified = false;

  // Remove the old verbose XAML Element Type Hints block
  const oldAnnotationPattern = /\n\s*# XAML Element Type Hints \(auto-generated, do not edit\)\n\s*if TYPE_CHECKING:[\s\S]*?(?=\n\s*\n\s*[a-zA-Z_]|\n\s*def |\n\s*class |\Z)/g;
  const newContent = content.replace(oldAnnotationPattern, '');

  if (newContent !== content) {
    content = newContent;
    modified = true;
  }

  // Remove the XAML base import block (handles both object and actual base class patterns)
  const xamlBasePattern = /\nif TYPE_CHECKING:\n\s*from _\w+_xaml import \w+ as _XAMLBase\nelse:\n\s*_XAMLBase = [\w.]+\n\n?/g;
  const finalContent = content.replace(xamlBasePattern, '\n');

  if (finalContent !== content) {
    content = finalContent;
    modified = true;
  }

  // Remove _XAMLBase from class inheritance (handles both old pattern with comma and new pattern without)
  // Old pattern: class MyDialog(_XAMLBase, forms.WPFWindow):
  // New pattern: class MyDialog(_XAMLBase):
  const classPatternWithComma = /^(class\s+\w+\s*\()_XAMLBase,\s*/gm;
  let cleanedContent = content.replace(classPatternWithComma, '$1');

  // Also handle the new pattern where _XAMLBase is the only base class
  // We need to restore the original base class - but since we don't know it, just remove _XAMLBase
  // Users may need to manually add back their base class if they remove annotations
  const classPatternSingle = /^(class\s+\w+\s*\()_XAMLBase(\):)/gm;
  cleanedContent = cleanedContent.replace(classPatternSingle, '$1object$2');

  if (cleanedContent !== content) {
    content = cleanedContent;
    modified = true;
  }

  // Remove wpf_helpers import
  const wpfHelpersImportPattern = /\nfrom wpf_helpers import setup_element_groups/g;
  const noWpfImport = content.replace(wpfHelpersImportPattern, '');
  if (noWpfImport !== content) {
    content = noWpfImport;
    modified = true;
  }

  // Remove setup_element_groups(self) call
  const setupElementGroupsPattern = /\n\s*setup_element_groups\(self\)/g;
  const noSetupCall = content.replace(setupElementGroupsPattern, '');
  if (noSetupCall !== content) {
    content = noSetupCall;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(pyPath, content, 'utf-8');
  }

  return modified;
}
