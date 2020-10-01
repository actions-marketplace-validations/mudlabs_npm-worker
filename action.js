const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
                                              
const worker_path = "./.github/npmworker.yaml";
const current_path = "";// the checked out directory path the action is called from;

const marketplace = "https://github.com/marketplace/activity/npm-worker";
let activity = `[NPM Worker](${marketplace}) {{description}}\n\n{{install}}\n\n{{update}}\n\n{{uninstall}}\n`;

const isNonEmptyArray = obj => obj && Array.isArray(obj);
const no_worker = () => core.setFailed("Could not locate the 'npmworker.yaml' configuration file.");

(async function(){
  try {
    if (!fs.existsSync(worker_parth)) return no_worker();
    const file = await fs.promises.readFile(worker_parth, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    // Should be relative to current_path
    const node_modules_path = data.path || "./";
    
    // cd into the node_modules_path
    await execa("cd", node_modules_path);
        
    if (isNonEmptyArray(data.install)) {
      data.install.forEach(async package => await execa("npm install", package));
    }
    
    if (isNonEmptyArray(data.update)) {
      data.update.forEach(async package => await execa("npm update", package));
    }
    
    if (isNonEmptyArray(data.uninstall)) {
      data.uninstall.forEach(async package => await execa("npm uninstall", package));
    }
    
    core.setOutput(activity);
    return;
  } catch (error) {
    core.setFailed(error);
  }
})();
