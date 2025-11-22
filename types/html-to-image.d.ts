declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: { cacheBust?: boolean; backgroundColor?: string }): Promise<string>;
}
