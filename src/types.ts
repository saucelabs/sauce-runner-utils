

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

export interface HasPath {
  path: string;
}

export interface HasNpmConfig {
  npm?: NpmConfig;
}

export interface HasSuites {
  suites: Suite[];
}

export interface NodePath {
  nodePath: string;
  npmPath: string;
}