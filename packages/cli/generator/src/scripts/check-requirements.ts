// import execa from 'execa';
import chalk from 'chalk';
import semver from 'semver';
import engines from '../utils/engines';

export const checkRequirements = () => {
  const currentNodeVersion = process.versions.node;

  // error if the node version isn't supported
  if (!semver.satisfies(currentNodeVersion, engines.node)) {
    console.error(chalk.red(`You are running ${chalk.bold(`Node.js ${currentNodeVersion}`)}`));
    console.error(`App requires ${chalk.bold(chalk.green(`Node.js ${engines.node}`))}`);
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  } else if (semver.major(currentNodeVersion) % 2 !== 0) {
    console.warn(chalk.yellow(`You are running ${chalk.bold(`Node.js ${currentNodeVersion}`)}`));
    console.warn(
      `App only supports ${chalk.bold(chalk.green('LTS versions of Node.js'))}, other versions may not be compatible.`
    );
  }

  // // error if the yarn isn't supported
  // // TODO:
  // try {
  //   const { exitCode } = execa.commandSync('yarn --version', { shell: true });
  //   if (exitCode !== 0) {
  //     throw new Error('Yarn is not installed');
  //   }
  // } catch (err) {
  //   console.error(chalk.red('Yarn is required, but it\'s not installed.'));
  //   process.exit(1);
  // }
};
