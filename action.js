const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");


const current_path = "";// the checked out directory path the action is called from;


const isNonEmptyArray = obj => obj && Array.isArray(obj);

const buildActivityReport = did_initiat => (install, update, uninstall) => {
  
  const buildList = title => items => items.length > 0
    ? items.reduce((list, item) => list += `- ${item}\n`, `**${title}**\n`)
    : "";
  
  const buildDescription = () => {
    const numberOfPackages = items => {
      const number = items.length;
      return `${number} package${number === 1} ? "" : "s"`;
    }
    const tag = title => items => items.length > 0 ? `_${title}_ ${numberOfPackages(items)}` : "";
    const pre = did_initiat ? `Initiated \`node_modules\` on this repo.` : "";
    
    const installed = tag("install")(install);
    const updated = tag("update")(update);
    const uninstalled = tag("uninstall")(uninstall);
    const opperations = ([installed, updated, uninstalled]
                         .filter(item => item !== "")
                         .map((item, index, array) => array.length > 1 && index === array.length - 1 ? `and ${item}` : item)
                        ).join(", ");
    
    return `${pre} Your configuration requested this action ${opperations}.\n\n`;
  }
  
  // <a href="https://github.com/marketplace/activity/npm-worker"><img src="" width="21"/> NPM Worker</a>
  const branding = "[NPM Worker](https://github.com/marketplace/activity/npm-worker)";
  const description = buildDescription();
  const installed = buildList("Installed")(install)
  const updated = buildList("Updated")(update)
  const uninstalled = buildList("Uninstalled")(uninstall);
  
  const report = `${branding} ${description}\n\n${installed}\n${updated}\n${uninstalled}`;
  return report;
}

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
        // instead of changing the directory path to node_modules and package befor running the worker command,
        // can we pass this into the one execa call?
        const output = await execa(`npm ${command} --prefix ${node_modules_path} ${package_json_path}`, [package]);
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
    const valid_node_modules_path = await fs.exists(node_modules_path);
    const has_package_json = await fs.exists(`${node_modules_path}/package.json`);
    if (!valid_node_modules_path) return core.setFailed(`The path for node_modules does not exist.`);
    if (!has_package_json) await execa.command(`cd ${node_modules_path} && npm init -y`);
    
    // run the requested shell commands
    const installed = await shell("install")(data.install);
    const updated = await shell("update")(data.update);
    const uninstalled = await shell("uninstall")(data.uninstall);
    const activityToReport = installed.concat(updated, uninstalled).length > 0;
        
    if (activityToReport) {
      const activity = buildActivityReport(!has_package_json)(installed, updated, uninstalled);
      core.setOutput(activity);
      if (data.issue) {
        const response = await octokit.issues.createComment({
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
