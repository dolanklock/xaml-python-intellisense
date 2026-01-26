import * as fs from 'fs';
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

  // Get the existing base class from the class definition to use at runtime
  // This avoids MRO conflicts by not having both object and WPFWindow in the inheritance chain
  const existingBaseClass = classMatch[2].trim().split(',')[0].trim() || 'object';

  // Add the XAML base class import block before the class definition
  // At runtime, _XAMLBase becomes the actual base class (e.g., forms.WPFWindow)
  // This avoids the MRO error that occurs with (_XAMLBase, forms.WPFWindow) when _XAMLBase = object
  const xamlImportBlock = `
if TYPE_CHECKING:
  from ${stubModuleName} import ${stubClassName} as _XAMLBase
else:
  _XAMLBase = ${existingBaseClass}

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

  // Update the class definition to inherit only from _XAMLBase
  // Since _XAMLBase becomes the actual base class at runtime, we don't need multiple inheritance
  // Need to re-match after potential content changes
  const updatedClassMatch = content.match(classPattern);
  if (updatedClassMatch) {
    const fullMatch = updatedClassMatch[0];
    const beforeParens = updatedClassMatch[1];
    const inheritance = updatedClassMatch[2];
    const afterParens = updatedClassMatch[3];

    // Only modify if not already using _XAMLBase
    if (!inheritance.includes('_XAMLBase')) {
      // Replace inheritance with just _XAMLBase to avoid MRO conflicts
      const newClassDef = `${beforeParens}_XAMLBase${afterParens}`;
      content = content.replace(fullMatch, newClassDef);
      modified = true;
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

  if (modified) {
    fs.writeFileSync(pyPath, content, 'utf-8');
  }

  return modified;
}
