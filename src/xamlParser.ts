import * as xml2js from 'xml2js';
import * as fs from 'fs';

export interface XamlElement {
  name: string;      // x:Name value
  type: string;      // ComboBox, Button, etc.
}

/**
 * Parse a XAML file and extract all elements with x:Name attributes
 */
export async function parseXaml(xamlPath: string): Promise<XamlElement[]> {
  const content = fs.readFileSync(xamlPath, 'utf-8');
  const parser = new xml2js.Parser({
    attrkey: '$',
    charkey: '_',
    explicitArray: true,
  });

  const result = await parser.parseStringPromise(content);
  const elements: XamlElement[] = [];

  function traverse(obj: any, nodeName?: string): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    // Check for x:Name attribute
    if (obj.$ && (obj.$['x:Name'] || obj.$['Name'])) {
      const name = obj.$['x:Name'] || obj.$['Name'];
      if (nodeName && !nodeName.includes(':')) {
        elements.push({
          name: name,
          type: nodeName
        });
      }
    }

    // Recurse into child elements
    for (const key of Object.keys(obj)) {
      if (key === '$' || key === '_') {
        continue;
      }

      const children = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
      for (const child of children) {
        traverse(child, key);
      }
    }
  }

  traverse(result);
  return elements;
}

/**
 * Check if a file is a XAML file
 */
export function isXamlFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.xaml');
}
