const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");
// const report = require("report");

const isNonEmptyArray = obj => obj && Array.isArray(obj);

Array.prototype.drop = function(start, end = this.length - start) { 
  this.splice(start, end);
  return this; 
}

const buildActivityReport = (install, update, uninstall) => {
  
  const setInstalledItem = item => {
    if (item.failed) {
      return `- ![failed] \`${item.package}\`\n  > ${item.stderr.split("\n")[0]}\n  > ${item.shortMessage}`;
    } else {
      return item.stdout.split("\n")
        .filter(value => value !== "")
        .drop(2,2)
        .map(value => value.startsWith("+ ") ? value.replace(/(\+ )(\S+)/, `- ![success] \`$2\``) : `  > ${value}`)
        .join("\n");
    }
  }
  
  const setUpdatedItem = item => {};
  
  const setUninstalledItem = item => {
//     if (item.failed) {
//       return `- ![failed] \`\`\n  >
//     } else {
//     }
    return item;
    return item.failed
      ? item
      : `- ![${success}] \`${item.package}\`\n${
        item.stdout.split("\n")
          .filter(value => value !== "")
          .splice(1,2)
          .map(value => `  > ${value}`)
          .join("\n")
      }`;
  };
  
  const buildList = title => items => {
    if (items.length < 1) return "";
    const list = items.reduce((list, item) => {
      let listItem;
      switch (title) {
        case "Installed":
          listItem = setInstalledItem(item);
          break;
        case "Updated":
          listItem = setUpdatedItem(item);
          break;
        case "Uninstalled":
          listItem = setUninstalledItem(item);
          break;
      }
      return list += `${listItem}\n`;
    }, `### ${title}\n`) + `\n`;
    return list;
  };
  
  const buildDescription = () => {
    const numberOfPackages = items => {
      const number = items.length;
      return `${number} package${number === 1 ? "" : "s"}`;
    }
    const tag = title => items => items.length > 0 ? `_${title}_ ${numberOfPackages(items)}` : "";
    
    const installed = tag("install")(install);
    const updated = tag("update")(update);
    const uninstalled = tag("uninstall")(uninstall);
    const opperations = ([installed, updated, uninstalled]
                         .filter(item => item !== "")
                         .map((item, index, array) => array.length > 1 && index === array.length - 1 ? `and ${item}` : item)
                        ).join(", ");
    
    return `An update to your configuration file requested [NPM Worker][marketplace] ${opperations}.\n`;
  }
  
  const marketplace = "[marketplace]: https://github.com/marketplace/activity/npm-worker";
  const icon = "[icon]: https://github.com/mudlabs/npm-worker/raw/master/npm_worker_icon.png";
  const success = "[success]: https://via.placeholder.com/15/15f06e/000000?text=+";
  const failed = "[failed]: https://via.placeholder.com/15/f03c15/000000?text=+";
  const sender = github.context.payload.sender;
  const requester = `Requested by [\`@${sender.login}\`](https://github.com/${sender.login})`;
  const commit = `Triggered by commit ${github.context.sha}`;
  const description = buildDescription();
  const installed = buildList("Installed")(install)
  const updated = buildList("Updated")(update)
  const uninstalled = buildList("Uninstalled")(uninstall);
  const header = `> [![icon]][marketplace]\n> ${requester}\n> ${commit}\n`;
  const footer = `${marketplace}\n${icon}\n${success}\n${failed}`;
      
  const report = `${header}\n${description}\n${installed}\n${updated}\n${uninstalled}\n\n${footer}`;
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

const shell = command => packages => async path => {
  if (!(packages instanceof Array)) return [];
  const activity = await Promise.all(packages.map(async package => {
      let output;
      try {
        output = await execa.command(`npm ${command} --prefix ${path} ${package}`);
      } catch (error) {
        output = error;
      } finally {
        output["package"] = package
        return output;
      }
  }));
  return activity;
};

const getWorkerConfigPath = workflow => {
  const config_name = "npmworker.config.yaml"
  const input_config = core.getInput("config");
  const workflow_dir_path = workflow.path.substring(0, workflow.path.lastIndexOf("/"));
  const workflow_config = `${workflow_dir_path}/${config_name}`;
  const github_config = `.github/${config_name}`;
  const root_config = `./${config_name}`;
  
  const path = input_config && fs.existsSync(input_config)
    ? input_config : fs.existsSync(workflow_config) 
    ? workflow_config : fs.existsSync(github_config)
    ? github_config : fs.existsSync(root_config)
    ? root_config : false;
  
  return path;
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
    if (!worker_config_path) return core.setFailed("Could not locate the 'npmworker.config.yaml' file.");
    
    const file = await fs.promises.readFile(worker_config_path, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
        
    // Should be relative to current_path
    const node_modules_path = data.path || "./";
    const valid_node_modules_path = fs.existsSync(node_modules_path);
    const has_package_json = fs.existsSync(`${node_modules_path}/package.json`);

    if (!valid_node_modules_path) return core.setFailed(`The path for node_modules does not exist.`);
    if (!has_package_json) await initJSON(node_modules_path);  
    
    // run the requested shell commands
    const installed = await shell("install")(data.install)(node_modules_path);
    const updated = await shell("update")(data.update)(node_modules_path);
    const uninstalled = await shell("uninstall")(data.uninstall)(node_modules_path);
    const activity_to_report = installed.concat(updated, uninstalled).length > 0;
    
    console.log("REPORT", activity_to_report);
    
    if (activity_to_report) {
      const activity = buildActivityReport(installed, updated, uninstalled);
      console.log(activity)
      core.setOutput(activity);
      if (data.issue) {
//         const response = await octokit.issues.createComment({
//           owner: github.context.payload.repository.owner.login,
//           repo: github.context.payload.repository.name,
//           issue_number: data.issue,
//           body: activity
//         });
      }
    }
    
  } catch (error) {
    core.setFailed(error);
  }
})();
