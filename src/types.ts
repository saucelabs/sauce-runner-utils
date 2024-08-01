export type Suite = {
  name: string;
  env?: { [key: string]: string };
  config?: {
    env?: { [key: string]: string };
  };
};

export type Registry = {
  scope?: string;
  url: string;
  authToken?: string;
  auth?: string;
  username?: string;
  password?: string;
  email?: string;
};

export type NpmConfig = {
  /**
   * @deprecated: registry should be avoided in favor of a "registries" entry.
   */
  registry?: string;
  registries?: Registry[];
  strictSSL?: boolean | string | null;
  packageLock?: boolean | string | null;
  packages?: { [key: string]: string | number };
  legacyPeerDeps?: boolean | string | null;
};

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

  // Ignore the specific binary paths provided and rely on the binaries
  // from PATH.
  useGlobals?: boolean;
}
