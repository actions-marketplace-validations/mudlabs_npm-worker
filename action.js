const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");
const report = require("./report");


const getConfigHtmlUrl = octokit => async (path) => {
  const _path = path.replace(/^(?:\.\/|\/)/, "");
  const owner = github.context.payload.repository.owner.login;
  const repo = github.context.payload.repository.name;
  const file = await octokit.request(`GET /repos/${owner}/${repo}/contents/${_path}`);
  console.log("html_url", file);
}

const logActivityToIssue = activity => number => async octokit => {
  try {
    const log = await octokit.issues.createComment({
      owner: github.context.payload.repository.owner.login,
      repo: github.context.payload.repository.name,
      issue_number: number,
      body: activity
    });
  } catch (error) {
    console.warn("Log Activity:", error);
  }
}

const cleanConfigurationFile = path => async data => {
  try {
    for (const prop in data) data[prop] instanceof Array ? data[prop].length = 0 : null;
    const file = await fs.promises.writeFile(path, yaml.safeDump(data));
  } catch (error) {
    throw error;
  }
};

const hasPackageInstalled = async (path, package) => {
  try {
    await execa.command(`npm ls --prefix ${path} ${package}`)
    return true;
  } catch (error) {
    return false;
  }
}

const shell = command => packages => async path => {
  if (!(packages instanceof Array)) return [];
  const activity = await Promise.all(packages.map(async package => {
      let output;
      package = package.split("&&")[0].trim();
      try {
        const has_package = await hasPackageInstalled(path, package);
        if (command !== "update") { 
          output = await execa.command(`npm ${command} --prefix ${path} ${package}`);
        } else {
          output = await execa.command(`npm ${!has_package ? "install" : "update"} --prefix ${path} ${package}`);
          if (output.stdout === "" && has_package) output = await execa.command(`npm install --prefix ${path} ${package}`);
        }
      } catch (error) {
        error["failed"] = true;
        output = error;
      } finally {
        output["package"] = package
        return output;
      }
  }));
  return activity;
};

const getWorkerConfigPath = workflow => {
  let found_config_path = false;
  const input_config_path = core.getInput("config");
  const config_pattern = new RegExp(/(?:^|\/)npm\.?worker\.config\.ya?ml$/);
  const workflow_dir_path = workflow.path.substring(0, workflow.path.lastIndexOf("/"));
  const directories = [workflow_dir_path, ".github", "./"];
  
  if (fs.existsSync(input_config_path)) {
    if (config_pattern.test(input_config_path)) return input_config_path;
    if (fs.lstatSync(input_config_path).isDirectory()) directories.unshift(input_config_path);
  }
  
  directories.some(dir_path => {
    const mark = dir_path.endsWith("/") ? "" : "/";
    const files = fs.readdirSync(dir_path);
    const file = files.find(file => config_pattern.test(file));
    if (!file) return false;
    found_config_path = `${dir_path}${mark}${file}`;
    return true;
  });
  
  return found_config_path;
};

const initJSON = async path => {
  try {
    const file_path = `${path}/package.json`;
    const {stdout} = await execa.command('npm init -y');
    const json = stdout.substring(stdout.indexOf("{"));
    await fs.promises.writeFile(file_path, json);
    return;
  } catch (error) {
    throw error;
  }
};

(async function(){
  try {
    const token = core.getInput("token");
    const octokit = github.getOctokit(token);
    
    const workflows = await octokit.request(
      'GET /repos/:owner/:repo/actions/workflows', 
      { owner: github.context.payload.sender.login, repo: github.context.payload.repository.name }
    );
    const workflow = workflows.data.workflows.filter(workflow => workflow.name === github.context.workflow)[0];
    const worker_config_path = getWorkerConfigPath(workflow);
    if (!worker_config_path) return core.setFailed("Could not locate the configuration file.");
    
    const file = await fs.promises.readFile(worker_config_path, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    const node_modules_path = data.path || "./";
    const valid_node_modules_path = fs.existsSync(node_modules_path);
    const has_package_json = fs.existsSync(`${node_modules_path}/package.json`);

    if (!valid_node_modules_path) return core.setFailed(`The path for node_modules does not exist.`);
    if (!has_package_json) await initJSON(node_modules_path);  
    
    const installed = await shell("install")(data.install)(node_modules_path);
    const updated = await shell("update")(data.update)(node_modules_path);
    const uninstalled = await shell("uninstall")(data.uninstall)(node_modules_path);
    const activity_to_report = installed.concat(updated, uninstalled).length > 0;
        
    if (activity_to_report) {
      const config_txt_link = await getConfigHtmlUrl(octokit)(worker_config_path);
      return core.setFailed("Don't commit");
      const activity = report.buildActivityReport(installed, updated, uninstalled)(config_txt_link);
      core.setOutput(activity);
      if (data.issue) await logActivityToIssue(activity)(data.issue)(octokit);
      if (data.clean) await cleanConfigurationFile(worker_config_path)(data);
    }
    
  } catch (error) {
    core.setFailed(error);
  }
})();
