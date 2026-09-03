import { Kernel } from "@tnf/kernel";

let kernel: Kernel | null = null;
let initialization: Promise<Kernel> | null = null;

export async function getKernel(): Promise<Kernel> {
  if (kernel?.isInitialized()) {
    return kernel;
  }

  if (initialization) {
    return initialization;
  }

  const instance = kernel ?? new Kernel();
  kernel = instance;

  initialization = instance
    .initialize()
    .then(() => instance)
    .catch((error) => {
      kernel = null;
      throw error;
    })
    .finally(() => {
      initialization = null;
    });

  return initialization;
}

export async function shutdownKernel(): Promise<void> {
  if (!kernel) {
    return;
  }

  await kernel.shutdown();
  kernel = null;
}
