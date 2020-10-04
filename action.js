const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");


const current_path = "";// the checked out directory path the action is called from;

const branding = "[NPM Worker](https://github.com/marketplace/activity/npm-worker)";

const isNonEmptyArray = obj => obj && Array.isArray(obj);

const buildActivityReport = () => branding.concat(" ", description, install, update, uninstall);


const cleanConfigurationFile = path => async data => {
  try {
    for (const prop in data) data[prop] instanceof Array ? data[prop].length = 0 : null;
    const file = await fs.promises.writeFile(path, data);
  } catch (error) {
    console.log(error);
  }
};

const shell = command => async packages => {
  const activity = await Promise.all(packages.map(async package => {
      try {
        const output = await execa(`npm ${command}`, [package]);
        return output;
      } catch (error) {
        return error;
      } 
  }));
  return activity;
};

const getWorkerConfigPath = workflow => {
  const config_name = "npmworker.config.yaml"
  const workflow_dir_path = workflow.path.substring(0, workflow.lastIndexOf("/"));
  const workflow_config = `${workflow_dir_path}/${config_name}`;
  const github_config = `.github/${config_name}`;
  const root_config = `./${config_name}`;
  
  const path = fs.existsSync(workflow_config) 
    ? workflow_config : fs.existsSync(github_config)
    ? github_config : fs.existsSync(root_config)
    ? root_config : false;
  
  return path;
};

(async function(){
  try {
    const token = core.getInput("token");
    const octokit = github.getOctokit(token);
    
    const workflows = await octokit.request(
      'GET /repos/:owner/:repo/actions/workflows', 
      { owner, repo }
    );
    const workflow = workflows.data.workflows.filter(workflow => workflow.name === github.context.workflow);
    const worker_config_path = getWorkerConfigPath(workflow);
    
    if (!worker_config_path) return core.setFailed("Could not locate the 'npmworker.config.yaml' file.");
    
    const file = await fs.promises.readFile(worker_config_path, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    // Should be relative to current_path
    const node_modules_path = data.path || "./";
    
    // cd into the node_modules_path
    await execa("cd", node_modules_path);
    
    // 1) is there a node_modules directory at path
    // 2) is there a package.json file at path
    // If node_modules and package already exist replace {{description}} in activity with ""
    // else replace with description.
    
    const installed = await shell("install")(data.install);
    const updated = await shell("update")(data.update);
    const uninstalled = await shell("uninstall")(data.uninstall);
    const activityToReport = installed.concat(updated, uninstalled).length > 0;
        
    if (activityToReport) {
      const activity = buildActivityReport(installed, updated, uninstalled);
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
    
  } catch (error) {
    core.setFailed(error.message);
  }
})();
