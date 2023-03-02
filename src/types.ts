

export type Suite = {
  name: string;
  env?: { [key: string]: string };
  config?: {
    env?: { [key: string]: string };
  }
}

export type NpmConfig = {
  registry?: string;
  strictSSL?: boolean | string | null;
  packageLock?: boolean | string | null;
  packages?: { [key: string]: string | number };
}

export interface PathContainer {
  path: string;
}

export interface NpmConfigContainer {
  npm?: NpmConfig;
}

export interface SuitesContainer {
  suites: Suite[];
}

export interface NodePath {
  nodePath: string;
  npmPath: string;
}