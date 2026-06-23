export const localBackendBaseURL = '/';

export const devServerProxy = {
  '/api': {
    target: 'http://localhost:9999',
    changeOrigin: true,
  },
};
