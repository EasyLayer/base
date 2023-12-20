export const stopProcess = (message?: string): never => {
  if (message) {
    console.error(message);
  }

  process.exit(1);
};
