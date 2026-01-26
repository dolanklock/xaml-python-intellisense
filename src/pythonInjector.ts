import * as fs from 'fs';
import { XamlElement } from './xamlParser';

interface GroupedElements {
  [typeName: string]: XamlElement[];
}

/**
 * Inject TYPE_CHECKING imports and class annotations into a Python file
 */
export function injectTypeAnnotations(
  pyPath: string,
  className: string,
  elements: XamlElement[],
  stubFileName: string
): boolean {
  let content = fs.readFileSync(pyPath, 'utf-8');
  let modified = false;

  // Group elements by type
  const grouped: GroupedElements = {};
  for (const el of elements) {
    if (!grouped[el.type]) {
      grouped[el.type] = [];
    }
    grouped[el.type].push(el);
  }

  // Filter to only user-relevant elements (exclude template parts like PART_*, border, etc.)
  const relevantElements = elements.filter(el =>
    !el.name.startsWith('PART_') &&
    el.name !== 'border'
  );

  const relevantGrouped: GroupedElements = {};
  for (const el of relevantElements) {
    if (!relevantGrouped[el.type]) {
      relevantGrouped[el.type] = [];
    }
    relevantGrouped[el.type].push(el);
  }

  // Build the type imports list
  const typeImports: string[] = [];
  for (const typeName of Object.keys(relevantGrouped)) {
    typeImports.push(`_${typeName}Group`);
    typeImports.push(`_${typeName}Type`);
  }

  // Check if TYPE_CHECKING import already exists
  const hasTypeChecking = content.includes('from typing import TYPE_CHECKING') ||
                          content.includes('from typing import') && content.includes('TYPE_CHECKING');

  // Check if our stub import already exists (handle both .py and .pyi extensions)
  const stubModuleName = stubFileName.replace(/\.pyi?$/, '');
  const stubImportPattern = new RegExp(`from ${stubModuleName} import`);
  const hasStubImport = stubImportPattern.test(content);

  // Detect indentation (2 or 4 spaces)
  const indentMatch = content.match(/^( +)def /m);
  const indent = indentMatch ? indentMatch[1] : '  ';

  // Add TYPE_CHECKING import if needed
  if (!hasTypeChecking) {
    // Find the imports section and add TYPE_CHECKING
    const importMatch = content.match(/^(from typing import [^\n]+)/m);
    if (importMatch) {
      // Add TYPE_CHECKING to existing typing import
      const oldImport = importMatch[1];
      if (!oldImport.includes('TYPE_CHECKING')) {
        const newImport = oldImport.replace('from typing import ', 'from typing import TYPE_CHECKING, ');
        content = content.replace(oldImport, newImport);
        modified = true;
      }
    } else {
      // Add new typing import after other imports
      const lastImportMatch = content.match(/^(import .+|from .+ import .+)$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const insertPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPos) + '\nfrom typing import TYPE_CHECKING' + content.slice(insertPos);
        modified = true;
      }
    }
  }

  // Add stub import in TYPE_CHECKING block if needed
  if (!hasStubImport && typeImports.length > 0) {
    const importStatement = `\nif TYPE_CHECKING:\n${indent}from ${stubModuleName} import (\n${indent}${indent}${typeImports.join(`, `)}\n${indent})\n`;

    // Find position after all imports (before first class or function)
    const classMatch = content.match(/^class /m);
    if (classMatch && classMatch.index !== undefined) {
      // Find the blank line before the class
      const beforeClass = content.slice(0, classMatch.index);
      const lastNewlines = beforeClass.match(/\n+$/);
      const insertPos = classMatch.index - (lastNewlines ? lastNewlines[0].length : 0);

      // Check if TYPE_CHECKING block already exists
      if (!content.includes('if TYPE_CHECKING:')) {
        content = content.slice(0, insertPos) + importStatement + '\n' + content.slice(insertPos);
        modified = true;
      }
    }
  }

  // Add class annotations if needed
  const classPattern = new RegExp(`^(class ${className}\\([^)]*\\):)\\s*\\n(\\s*"""[\\s\\S]*?""")?`, 'm');
  const classMatch = content.match(classPattern);

  if (classMatch) {
    // Check if annotations already exist
    const annotationMarker = '# XAML Element Type Hints';
    if (!content.includes(annotationMarker)) {
      // Build annotations block
      const annotations: string[] = [];
      annotations.push(`${indent}# XAML Element Type Hints (auto-generated, do not edit)`);
      annotations.push(`${indent}if TYPE_CHECKING:`);

      // Add type group accessors
      annotations.push(`${indent}${indent}# Type group accessors: self.ComboBox.element_name`);
      for (const typeName of Object.keys(relevantGrouped)) {
        annotations.push(`${indent}${indent}${typeName}: _${typeName}Group`);
      }

      annotations.push(`${indent}${indent}# Direct element access: self.element_name`);
      for (const el of relevantElements) {
        annotations.push(`${indent}${indent}${el.name}: _${el.type}Type`);
      }

      // Find where to insert (after docstring if present, or after class definition)
      const fullMatch = classMatch[0];
      const docstring = classMatch[2] || '';
      const insertAfter = classMatch[1] + '\n' + docstring;

      const insertPos = content.indexOf(fullMatch) + insertAfter.length;
      const annotationBlock = '\n' + annotations.join('\n') + '\n';

      content = content.slice(0, insertPos) + annotationBlock + content.slice(insertPos);
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

  // Remove the XAML Element Type Hints block
  const annotationPattern = /\n\s*# XAML Element Type Hints \(auto-generated, do not edit\)\n\s*if TYPE_CHECKING:[\s\S]*?(?=\n\s*\n\s*[a-zA-Z_]|\n\s*def |\n\s*class |\Z)/g;
  const newContent = content.replace(annotationPattern, '');

  if (newContent !== content) {
    fs.writeFileSync(pyPath, newContent, 'utf-8');
    return true;
  }

  return false;
}
