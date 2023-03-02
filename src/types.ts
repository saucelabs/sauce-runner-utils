

export type Suite = {
  name: string;
  env?: { [key: string]: string };
  config?: {
    env?: { [key: string]: string };
  }
}

export interface IHasPath {
  path: string;
}

export type NpmConfig = {
  registry?: string;
  strictSSL?: boolean | string | null;
  packageLock?: boolean | string | null;
  packages?: { [key: string]: string | number };
}

export interface IHasNpmConfig {
  npm?: NpmConfig;
}

export interface IHasSuites {
  suites: Suite[];
}

export interface IHasNodePath {
  nodePath: string;
  npmPath: string;
}