[action-badge]: https://img.shields.io/badge/-Action-24292e?logo=github&style=for-the-badge
[paypal-badge]: https://img.shields.io/badge/-Support-f3f4f6?logo=paypal&style=for-the-badge
[brave-badge]: https://img.shields.io/badge/-Tip-f3f4f6?logo=brave&style=for-the-badge

[![Github Action][action-badge]](https://github.com/marketplace/action/npm-worker)
&nbsp;
[![Support Mudlabs][paypal-badge]](https://paypal.com/paypalme/mudlabs/5usd)

# NPM Worker
Manage node packages on your Github action repository.

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
# ./.github/workflows/npm.yaml

name: NPM Workflow
on:
  push:
    branches:
      - master:
    paths:
      - .github/npmworker.yaml
jobs:
  npm:
    runs-on: ubuntu-latest
    name: NPM Worker
    steps:
      - uses: actions/checkout@v2
      - name: Worker
        uses: mudlabs/npm-worker@1.0.0    
```
    

#### 2. Now add the configuration file
- If you want to remove a package it's not enough to remove it from the `install` array, you need to add it to the `uninstall` array.   

| Prop | Description | Default |
| :--- | :--- | :--- |
| `mutate` | Specifies the action should edit the configuration file apon execution. This way every time you update the file it's a clean list of commands. | `false` |
| `issue` | You may provide an issue number to track activity. If set this action will post comments to the issue detailing what has changed, whenever it runs. | |
| `path` | Specifies a path from your repository _root_, where you would like _node_modules_ located. | `./` |
| `install` | An array of npm packages you want installed. | |
| `update` | An array of packages to update, or install if they are not installed. | |
| `uninstall` | An array of packages to uninstall. | |

```yaml 
# Example Configuration.
# ./.github/npmworker.yaml

mutate: true
issue: 1
path: ./dis
install:
  - "@actions/github"
  - "unirest --save"
  - "gulp --saveDev"
update:
  - "cardinal-direction"
uninstall:
  - "node-fetch"
```


#### Output

| Prop | Description |
| :--- | :--- |
| `activity` | A markdown flavourd description of the activity performed by the action. If `issue` is set in the configuration file, this is the comment sent to that issue. |

    
## Notes
- If no `package.json` file is located at `path`, the action will create one using `npm init -y`.
- If you want the `node_modules` and `packages` to persist on your repository you will need to commit the changes. I recommend using the [Add and Commit](https://github.com/marketplace/actions/add-commit) action for this.
- You can not chain executions. Each array item is checked for, and broken at any instance of `&&`.
- Each array item is executed as `npm x item` _(i.e. npm install unirest)_.
