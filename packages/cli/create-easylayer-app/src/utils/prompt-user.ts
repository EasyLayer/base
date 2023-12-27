import inquirer from 'inquirer';
import { getAllPluginsChoices } from './plugins';
import { CommandOptions, Answers } from '../interfaces';

export const promptUser = async (appName: string, options: CommandOptions, hasPlugins: boolean) => {
  return inquirer.prompt<Answers>([
    {
      type: 'input',
      default: 'my-easylayer-app',
      name: 'directory',
      message: 'What would you like to name your crypto app?',
      when: !appName,
    },
    {
      type: 'list',
      name: 'launch',
      message: 'Choose your installation type',
      when: !options.quickstart,
      choices: [
        {
          name: 'Quickstart (with sqlite db)',
          value: true,
        },
        {
          name: 'Custom (manual db settings)',
          value: false,
        },
      ],
    },
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Select the plugins you want to install',
      when: !hasPlugins,
      choices: [
        ...getAllPluginsChoices(),
        // Add a separator
        new inquirer.Separator(),
        {
          name: 'No plugins (install without any plugins)',
          value: 'no-plugins',
        },
      ],
      filter: (answers) => {
        // If 'no-plugins' is selected, return an empty array
        if (answers.includes('no-plugins')) {
          return [];
        }
        return answers;
      },
    },
  ]);
};
