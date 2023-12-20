import { Scope } from '../interfaces';
import { dependencies, devDependencies } from './dependencies';
import engines from './engines';

type OptsScope = Pick<Scope, 'uuid'>;

interface Opts extends OptsScope {
  packageName: string;
}

export const packageJSON = (opts: Opts) => {
  const { packageName, uuid } = opts;

  // Finally, return the JSON.
  return {
    name: packageName,
    private: true,
    version: '1.0.0',
    description: 'EasyLayer start app',
    scripts: {
      'start:dev': 'ts-node src/main.ts',
      build: 'tsc -p ./tsconfig.build.json',
      start: 'node src/main.ts',
      clear: 'yarn clear cache && rimraf dist && rimraf node_module',
      lint: 'eslint -c .eslintrc.js "{src,apps,libs,test}/**/*.ts"',
      'lint:fix': 'eslint -c .eslintrc.js "{src,apps,libs,test}/**/*.ts" --fix',
      format: 'prettier --write "src/**/*.ts"',
    },
    devDependencies,
    dependencies,
    author: {
      name: 'developer',
    },
    easylayer: {
      uuid,
    },
    engines,
    license: '',
  };
};
