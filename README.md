[action-badge]: https://img.shields.io/badge/-Action-24292e?logo=github&style=for-the-badge
[paypal-badge]: https://img.shields.io/badge/-Support-f3f4f6?logo=paypal&style=for-the-badge
[brave-badge]: https://img.shields.io/badge/-Tip-f3f4f6?logo=brave&style=for-the-badge

[![Github Action][action-badge]](https://github.com/marketplace/action/npm-worker)
&nbsp;
[![Support Mudlabs][paypal-badge]](https://paypal.com/paypalme/mudlabs/5usd)

# NPM Worker
Manage node packages on your Github Actions' repository via a configuration file.

## Table of Contents
- [Requirements](#requirements)
- [Usage](#usage)
- [Notes](#notes)

## Requirements
- You must include an `npmworker.yaml` configuration file in your repositories `.github` directory.

## Usage

#### 1. Implement a Workflow for your action
- It's a good idea to ensure the action only runs when a change to `npmworker.yaml` is made.
```yaml
# ./.github/workflows/workflow.yaml

name: NPM Workflow
on:
  push:
    branches:
      - master:
    paths:
      - .github/npmworker.yaml
jobs:
  prep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: NPM Worker
        uses: mudlabs/npm-worker@1.0.0
        id: npm_worker
      - name: Log
        if: success()
        uses: peter-evans/create-or-update-comment@v1
        with:
          issue: ${{ steps.worker.outputs.issue }}
          body: ${{ steps.worker.outputs.activity }}
        
```
    

#### 2. Now add the configuration file
- If you want to remove a package it's not enough to remove it from the `install` array, you need to add it to the `uninstall` array.    
```yaml 
# ./.github/npmworker.yaml

# You may provide an issue number to track activity. If set this 
# action will post comments to the issue detailing what has 
# changed, whenever it runs.
issue: 1
# Specifies where in your repository you would like the node_modules
# directory to be located. It defaults to root.
path: ./
# An array of npm packages you want installed.
# Note the "quotes". In YAML some characters, like @ can not start
# a value, and others must be escaped. This resolves the conflict.
install:
  - "@actions/core"
  - "@actions/github"
  - "unirest"
# An array of npm packages to update, or install if they are not
# yet installed.
update:
  - "cardinal-direction"
# An array of npm packages to uninstall. If the package is not
# installed the action just continues; no error is thrown.
uninstall:
  - "node-fetch"
```


#### Output
- `activity`: A markdown flavourd description of the activity performed by the action
  - If `issue` is set in `npmworker.yaml`, this is the comment sent to that issue.

    
## Notes
- If no `package.json` file is located at `path`, the action will create one using `npm init -y`.
- If you want the `node_modules` and `packages` to persist on your repository you will need to commit the changes. I recommend using the [Add and Commit](https://github.com/marketplace/actions/add-commit) action for this.
- You can not chain executions. Each array item is checked for, and broken at any instance of `&&`.
- Each array item is executed as `npm x item` _(i.e. npm install unirest)_.
