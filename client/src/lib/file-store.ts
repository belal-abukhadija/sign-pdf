let storedFile: File | null = null;
let storedFileName: string = "";

export function storeFile(file: File): void {
  storedFile = file;
  storedFileName = file.name;
}

export function getStoredFile(): File | null {
  return storedFile;
}

export function getStoredFileName(): string {
  return storedFileName;
}

export function clearStoredFile(): void {
  storedFile = null;
  storedFileName = "";
}
