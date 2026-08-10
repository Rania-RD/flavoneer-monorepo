/// <reference types="vite/client" />

import type { FormulationLabEnvSource } from "@flavoneer/config/env/formulation-lab";

declare global {
  interface ImportMetaEnv extends Readonly<FormulationLabEnvSource> {}

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
