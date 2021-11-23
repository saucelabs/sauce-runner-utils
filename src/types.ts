

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

export interface INpmConfig {
  registry?: string;
  strictSSL?: boolean | string | null;
  packageLock?: boolean | string | null;
  packages?: { [key: string]: string | number };
}

export interface IHasNpmConfig {
  npm?: INpmConfig;
}

export interface IHasSuites {
  suites: Suite[];
}
