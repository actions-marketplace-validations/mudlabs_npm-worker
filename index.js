const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const core = require("@actions/core");
const github = require("@actions/github");

const octokit = github.getOctokit(process.env.github);

octokit.issues.createComment({
  owner: "samdonald",
  repo: "test-remote-comments",
  issue_number: 1,
  body: `### Installed\r\n-unirest\r\n@actions/core`
}).then(res => console.log("good", res)).catch(err => console.log("err", err));
                                              
// const worker_path = "./.github/npmworker.yaml";
// const isNonEmptyArray = obj => obj && Array.isArray(obj);
// const no_worker = () => core.setFailed("Could not locate the 'npmworker.yaml' configuration file.");
// const current_path = "";// the checked out directory path the action is called from;

// (async function(){
//   try {
//     if (!fs.exists(worker_parth)) return no_worker();
//     const file = async fs.promises.readFile(worker_parth, { encoding: "utf-8" });
//     const data = yaml.safeLoad(file);
    
//     // Should be relative to current_path
//     const node_modules_path = data.path || "./";
    
//     // cd into the node_modules_path
//     await execa("cd", node_modules_path);
        
//     if (isNonEmptyArray(data.install)) data.install.forEach(async package => await execa("npm install", package));
    
//     if (isNonEmptyArray(data.update)) data.update.forEach(async package => await execa("npm update", package));
    
//     if (isNonEmptyArray(data.uninstall)) data.uninstall.forEach(async package => await execa("npm uninstall", package));
    
//   } catch (error) {
//     core.setFailed(error);
//   }
// })();
