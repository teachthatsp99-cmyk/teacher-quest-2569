const {defineConfig} = require('@playwright/test');
const chromiumExecutable = process.env.CHROMIUM_EXECUTABLE_PATH;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: chromiumExecutable ? {executablePath:chromiumExecutable,args:['--no-sandbox']} : undefined
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15_000
  }
});
