declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

declare module "node:child_process" {
  export function execSync(
    command: string,
    options?: {
      encoding?: string;
      stdio?: ["ignore" | "pipe" | "inherit", "ignore" | "pipe" | "inherit", "ignore" | "pipe" | "inherit"];
    }
  ): string;
}

declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: string): string;
}
