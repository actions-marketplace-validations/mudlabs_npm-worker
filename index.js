const fs = require("fs");
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
    
    const modules_path = data.path || "./";
    
    if (isNonEmptyArray(data.install)) {}
    
    if (isNonEmptyArray(data.update)) {}
    
    if (isNonEmptyArray(data.uninstall)) {}
    
  } catch (error) {
  }
})();
