

export type Suite = {
  name: string;
  env: Map<string, string>;
  config: {
    env: Map<string, string>;
  }
}

export interface IHasPath {
  path: string;
}

export interface INpmConfig {
  registry?: string;
  strictSSL?: boolean;
  packageLock?: boolean;
  packages?: string[];
}

export interface IHasNpmConfig {
  npm: INpmConfig;
}

export interface IHasSuites {
  suites: Suite[];
}
