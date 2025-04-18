import {
  dag,
  Container,
  Directory,
  object,
  func,
  CacheVolume,
} from "@dagger.io/dagger"

import { Commands } from "./commands"

@object()
export class Node {
  @func()
  version = "22.11.0-alpine@sha256:b64ced2e7cd0a4816699fe308ce6e8a08ccba463c757c00c14cd372e3d2c763e"

  @func()
  container: Container

  constructor(version?: string, ctr?: Container) {
    this.version = version ?? this.version
    this.container = ctr ?? dag.container().from(`node:${this.version}`)
  }

  /**
   * Add source to the module container.
   *
   * @param source The source directory to mount in the container.
   * @param cache The cache to use for the node_modules cache (default to "node-modules").
   */
  @func()
  withSource(source: Directory, cache?: CacheVolume): Node {
    const workdir = "/src"

    this.container = this.container
      .withWorkdir(workdir)
      .withDirectory(workdir, source)
      .withMountedCache(
        `${workdir}/node_modules`,
        cache ?? dag.cacheVolume("node-modules"),
      )

    return this
  }

  /**
   * Add yarn as package manager in the container.
   *
   * This also update the container entrypoint to "yarn".
   * @param cache The cache to use for the downloaded packages (default to "node-module-yarn").
   */
  @func()
  withYarn(cache?: CacheVolume): Node {
    this.container = this.container
      .withEntrypoint(["yarn"])
      .withMountedCache(
        "/usr/local/share/.cache/yarn",
        cache ?? dag.cacheVolume(`node-module-yarn`),
      )

    return this
  }

  /**
   * Add npm as package manager in the container.
   *
   * This also update the container entrypoint to "npm".
   * @param cache The cache to use for the downloaded packages (default to "node-module-npm").
   */
  @func()
  withNpm(cache?: CacheVolume): Node {
    this.container = this.container
      .withEntrypoint(["npm"])
      .withMountedCache(
        "/root/.npm",
        cache ?? dag.cacheVolume(`node-module-npm`),
      )

    return this
  }

  /**
   * Add pnpm as package manager in the container.
   *
   * This also update the container entrypoint to "pnpm".
   * @param cache The cache to use for the downloaded packages (default to "node-module-pnpm").
   */
  @func()
  withPnpm(cache?: CacheVolume): Node {
    this.container = this.container
      .withExec(["npm", "install", "-g", "pnpm"])
      .withEntrypoint(["pnpm"])
      .withMountedCache(
        "/pnpm/store",
        cache ?? dag.cacheVolume(`node-module-pnpm`),
      )

    return this
  }

  /**
   * Downloads dependencies in the container.
   *
   * @param pkgs Additional packages to install in the container.
   */
  @func()
  install(pkgs: string[] = []): Node {
    this.container = this.container.withExec(["install", ...pkgs], { useEntrypoint: true })

    return this
  }

  /**
   * Execute commands in the container.
   */
  @func()
  commands(): Commands {
    return new Commands(this.container)
  }
}
