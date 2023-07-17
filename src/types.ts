export type Suite = {
  name: string;
  env?: { [key: string]: string };
  config?: {
    env?: { [key: string]: string };
  }
}

export type ScoredRegistry = {
  scope: string;
  url: string;
  authToken?: string;
};

export type NpmConfig = {
  registry?: string;
  scopedRegistries?: ScoredRegistry[];
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

export interface NodeContext {
  nodePath: string;
  npmPath: string;
}