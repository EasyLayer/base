import { getAllPluginsChoices } from './plugins';
import { CommandOptions, Answers } from '../interfaces';

const promptUser = async (appName: string, options: CommandOptions, hasPlugins: boolean): Promise<Answers> => {
  const inquirer = await import('inquirer');
  // Access prompt via default
  const { prompt, Separator } = inquirer.default;

  const pluginsChoices = await getAllPluginsChoices();

  return prompt([
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
        // Add a separator
        new Separator(),
        {
          name: 'No plugins (install without any plugins)',
          value: 'no-plugins',
        },
        // Dynamic choices from pluginsChoices
        ...pluginsChoices.map((plugin) => ({
          // Display name
          name: `${plugin.name} (${plugin.version})`,
          // Value returned when selected
          value: plugin.name,
        })),
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

export { promptUser };
