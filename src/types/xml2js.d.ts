declare module 'xml2js' {
  export interface ParserOptions {
    attrkey?: string;
    charkey?: string;
    explicitArray?: boolean;
    explicitRoot?: boolean;
    explicitChildren?: boolean;
    preserveChildrenOrder?: boolean;
    childkey?: string;
    charsAsChildren?: boolean;
    includeWhiteChars?: boolean;
    async?: boolean;
    strict?: boolean;
    attrNameProcessors?: Array<(name: string) => string>;
    attrValueProcessors?: Array<(value: string, name: string) => string>;
    tagNameProcessors?: Array<(name: string) => string>;
    valueProcessors?: Array<(value: string, name: string) => string>;
    emptyTag?: any;
    normalize?: boolean;
    normalizeTags?: boolean;
    trim?: boolean;
    rootName?: string;
  }

  export class Parser {
    constructor(options?: ParserOptions);
    parseString(str: string, callback: (err: Error | null, result: any) => void): void;
    parseStringPromise(str: string): Promise<any>;
  }
}
