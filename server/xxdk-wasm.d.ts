declare module 'xxdk-wasm' {
  export function InitXXDK(): Promise<any>
  export function setXXDKBasePath(path: string): void
  export function dmIndexedDbWorkerPath(): Promise<string>
  // Add other exports as needed
}

