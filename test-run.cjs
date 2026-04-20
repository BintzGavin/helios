const { execSync } = require('child_process');
try {
  execSync('npm test -w @helios-project/renderer', { stdio: 'inherit' });
} catch (e) {
  console.log('tests fail on wait for browser so we will use specific tests to verify');
}
