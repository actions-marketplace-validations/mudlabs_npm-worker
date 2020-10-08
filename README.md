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

---

## Requirements

| Requirement | Description |
| :--- | :--- |
| `npmworker.config.yaml` | You must include the YAML configuration file in your repository. If you do not pass its path to the `config` key in your workflow, the action will look for it in the directory of the `workflow` that triggered the action, then in `.github`, and finally in root _(`./`)_. |

---

## Usage

#### 1. Implement a Workflow for your action
- It's a good idea to ensure the action only runs when a change to `npmworker.config.yaml` is made.
```yaml
# ./.github/workflows/npmworker.yaml

name: NPM Worker
on:
  push:
    branches:
      - master:
    paths:
      - .github/workflows/npmworker.config.yaml
jobs:
  npm:
    runs-on: ubuntu-latest
    name: NPM Worker
    steps:
      - uses: actions/checkout@v2
      - name: Worker
        uses: mudlabs/npm-worker@1.0.0
        with:
          # OPTIONAL: Provide a PAT for the repository, so the
          # action can log activity to an issue.
          # Default: github.token
          toke: ${{ secrets.GITHUB_TOKEN }}
          # OPTIONAL: Provide a path within your repository to
          # the YAML configuration file.
          # If not provided the action will attempt to find it
          # before failing.
          config: ./path/to/npmworker.config.yaml
```
    

#### 2. Now add the configuration file
- If you want to remove a package it's not enough to remove it from the `install` array, you need to add it to the `uninstall` array.   

| Prop | Description | Default |
| :--- | :--- | :--- |
| `clean` | Specifies the action should edit the configuration file apon execution. This way every time you update the file it's a clean list of commands. Only the `install`, `update`, and `uninstall` arrays will be emptied, and they will be regardless of the package execution outcome. | `false` |
| `issue` | You may provide an issue number to track activity. If set this action will post comments to the issue detailing what has changed, whenever it runs. | |
| `path` | Specifies a path from your repository _root_, where you would like _node_modules_ located. | `./` |
| `install` | An array of npm packages you want installed. | |
| `update` | An array of packages to update, or install if they are not installed. | |
| `uninstall` | An array of packages to uninstall. | |

```yaml 
# Example Configuration.
# ./.github/workflows/npmworker.config.yaml

clean: true
issue: 1
path: ./dis
install:
  - "@actions/github"
  - unirest
update:
  - cardinal-direction
uninstall:
  - node-fetch
```


#### Output

| Prop | Description |
| :--- | :--- |
| `activity` | A markdown flavourd description of the activity performed by the action. If an issue number is specified within the configuration file, this is the comment sent to that issue. |

---
    
## Notes
- If no `package.json` file is located at `path`, the action will create one using `npm init -y`.
- If you want the `node_modules` and `packages` to persist on your repository you will need to commit the changes. I recommend using the [Add and Commit](https://github.com/marketplace/actions/add-commit) action for this.
- You can not chain executions. Each array item is checked for, and broken at any instance of `&&`.
- Each array item is executed as `npm x item` _(i.e. npm install unirest)_.
