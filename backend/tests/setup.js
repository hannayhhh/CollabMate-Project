// Globally turn off unnecessary logs to avoid interfering with output
const consoleWarn = console.warn;
console.warn = (...args) => {
  if (/deprecated|ExperimentalWarning/i.test(args.join(' '))) return;
  consoleWarn(...args);
};
