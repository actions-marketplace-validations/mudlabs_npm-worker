const fs = require("fs");
const execa = require("execa");
const yaml = require("js-yaml");
const github = require("@actions/github");

const worker_path = "./.github/npmworker.yaml";
const no_worker = () => console.log("Could not locate an 'npmworker.yaml' file");
const isNonEmptyArray = obj => obj && Array.isArray(obj);

(async function(){
  try {
    if (!fs.exists(worker_parth)) return no_worker();
    const file = async fs.promises.readFile(worker_parth, { encoding: "utf-8" });
    const data = yaml.safeLoad(file);
    
    const modules_deplayment_path = data.path || "./";
    
    // cd into the modules_deplayment_path
        
    if (isNonEmptyArray(data.install)) data.install.forEach(async package => await execa("npm install", package));
    
    if (isNonEmptyArray(data.update)) data.update.forEach(async package => await execa("npm update", package));
    
    if (isNonEmptyArray(data.uninstall)) data.uninstall.forEach(async package => await execa("npm uninstall", package));
    
  } catch (error) {
    console.log(error);
  }
})();
