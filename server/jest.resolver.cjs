module.exports = (request, options) => {
  const defaultResolver = options.defaultResolver;
  const isNodeModule = options.basedir && options.basedir.includes('node_modules');

  if (!isNodeModule && request.endsWith('.js')) {
    try {
      return defaultResolver(request.replace(/\.js$/, '.ts'), options);
    } catch (error) {
      // fall through to default resolution below
    }
  }

  return defaultResolver(request, options);
};
