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

  // Add the XAML base class import block before the class definition
  const xamlImportBlock = `
if TYPE_CHECKING:
  from ${stubModuleName} import ${stubClassName} as _XAMLBase
else:
  _XAMLBase = object

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

  // Update the class definition to inherit from _XAMLBase
  // Need to re-match after potential content changes
  const updatedClassMatch = content.match(classPattern);
  if (updatedClassMatch) {
    const fullMatch = updatedClassMatch[0];
    const beforeParens = updatedClassMatch[1];
    const inheritance = updatedClassMatch[2];
    const afterParens = updatedClassMatch[3];

    // Only add _XAMLBase if not already present
    if (!inheritance.includes('_XAMLBase')) {
      // Add _XAMLBase as first parent for proper type hints
      const newInheritance = `_XAMLBase, ${inheritance}`;
      const newClassDef = `${beforeParens}${newInheritance}${afterParens}`;
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

  // Remove the XAML base import block
  const xamlBasePattern = /\nif TYPE_CHECKING:\n\s*from _\w+_xaml import \w+ as _XAMLBase\nelse:\n\s*_XAMLBase = object\n\n?/g;
  const finalContent = content.replace(xamlBasePattern, '\n');

  if (finalContent !== content) {
    content = finalContent;
    modified = true;
  }

  // Remove _XAMLBase from class inheritance
  const classPattern = /^(class\s+\w+\s*\()_XAMLBase,\s*/gm;
  const cleanedContent = content.replace(classPattern, '$1');

  if (cleanedContent !== content) {
    content = cleanedContent;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(pyPath, content, 'utf-8');
  }

  return modified;
}
