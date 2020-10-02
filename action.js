const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");

const token = core.getInput("token");
const octokit = github.getOctokit(token);
                                              
const worker_path = "./.github/npmworker.yaml";
const current_path = "";// the checked out directory path the action is called from;

const marketplace = "https://github.com/marketplace/activity/npm-worker";
let activity = `[NPM Worker](${marketplace}) {{description}}\n\n{{install}}\n{{update}}\n{{uninstall}}\n`;

const isNonEmptyArray = obj => obj && Array.isArray(obj);
const no_worker = () => core.setFailed("Could not locate the 'npmworker.yaml' configuration file.");

(async function(){
  try {
    if (!fs.existsSync(worker_path)) return no_worker();
    const file = await fs.promises.readFile(worker_parth, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    // Should be relative to current_path
    const node_modules_path = data.path || "./";
    
    // cd into the node_modules_path
    await execa("cd", node_modules_path);
    
    // 1) is there a node_modules directory at path
    // 2) is there a package.json file at path
    // If node_modules and package already exist replace {{description}} in activity with ""
    // else replace with description.
        
    if (isNonEmptyArray(data.install)) {
      let install = `Installed\n`;
      let didInstall = false;
      data.install.forEach(async package => {
        const installed = await execa("npm install", package);
        if (installed) {
          didInstall = true;
          install += `- ${package}\n`
        }
        return;
      });
    }
    
    if (isNonEmptyArray(data.update)) {
      let update = `Updated\n`;
      let didUpdate = false;
      data.update.forEach(async package => {
        const updated = await execa("npm update", package)
        if (updated) {
          didUpdate = true;
          update += `- ${package}\n`
        }
        return;
      });
    }
    
    if (isNonEmptyArray(data.uninstall)) {
      let uninstall = `Uninstall\n`;
      let didUninstall = false;
      data.uninstall.forEach(async package => {
        const uninstalled = await execa("npm uninstall", package);
        if (uninstalled) {
          didUninstall = true;
          uninstall += `- ${package}\n`;
        }
        return;
      });
    }
    
    core.setOutput(activity);
    if (data.issue && activityToReport) {
      await octokit.issues.createComment({
        owner: github.context.payload.repository.owner.login,
        repo: github.context.payload.repository.name,
        issue_number: data.issue,
        body: activity
      });
    }
    return;
  } catch (error) {
    core.setFailed(error);
  }
})();
