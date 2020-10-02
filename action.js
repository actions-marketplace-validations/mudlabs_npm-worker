const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");

const token = core.getInput("token");
const octokit = github.getOctokit(token);
                                              
const worker_path = "./.github/npmworker.yaml";
const current_path = "";// the checked out directory path the action is called from;

const branding = "[NPM Worker](https://github.com/marketplace/activity/npm-worker)";
let description = install = update = uninstall = "";

const isNonEmptyArray = obj => obj && Array.isArray(obj);
const no_worker = () => core.setFailed("Could not locate the 'npmworker.yaml' configuration file.");

const activityToReport = () => "".concat(description, install, update, uninstall) !== "";
const buildActivityReport = () => branding.concat(" ", description, install, update, uninstall);

async function mutateConfig(config) {
  // cleans the config file so it doesn't still request we install packages that have been installed etc...
  await fs.promises.writeFile(worker_path, yaml.safeDump(config))
}

const shell = command => packages => {
  let output;
  packages.forEach(async package => {
      try {
        output = await execa(`npm ${command}`, [package]);
      } catch (error) {
        
      } finally {
        
      }
  });
};

(async function(){
  try {
    if (!fs.existsSync(worker_path)) return no_worker();
    const file = await fs.promises.readFile(worker_path, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    // Should be relative to current_path
    const node_modules_path = data.path || "./";
    
    // cd into the node_modules_path
    await execa("cd", node_modules_path);
    
    // 1) is there a node_modules directory at path
    // 2) is there a package.json file at path
    // If node_modules and package already exist replace {{description}} in activity with ""
    // else replace with description.
    
    const installed = shell("install")(data.install);
    const updated = shell("update")(data.update);
    const uninstalled = shell("uninstall")(data.uninstall);
        
    
    if (activityToReport()) {
      const activity = buildActivityReport();
      core.setOutput(activity);
      if (data.issue) {
        await octokit.issues.createComment({
          owner: github.context.payload.repository.owner.login,
          repo: github.context.payload.repository.name,
          issue_number: data.issue,
          body: activity
        });
      }
    }
    
    return;
  } catch (error) {
    core.setFailed(error.message);
  }
})();
