"use strict";

class PluginExampleModule {
    static register() {
        console.log('PluginExampleModule init');
        return { 
            module: PluginExampleModule
        };
    }
}

module.exports = PluginExampleModule;
