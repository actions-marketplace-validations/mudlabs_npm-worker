# NPM Worker
An action to init and manage node packages on your Github Actions repository via a configuration file.

## Usage
To use this action you must include an `npmworker.yaml` file in your repositories `.github` directory. 


**First implement a workflow for your action**
  - It's a good idea to ensure the action only runs when a change to `npmworker.yaml` is made.
  - _Note: the repo is checked out before we call the NPM Worker step._
    ```yaml
    # ./.github/workflows/workflow.yaml
    
    name: My Action Workflow
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
            id: worker
            uses: mudlabs/npm-worker-github-action@1.0.0
            with:
              # This is the path in your repository you want the node_modules
              # directory to be added to, or its existing location.
              # It defaults to your repositories root directory.
              path: ./
              # You can optionally provide an issue number. 
              # If provided the action will report changes to your project 
              # packages as comments on this issue
              issue: 34
    ```


**Now add the configuration file**
  - If you want to remove a package it's not enough to remove it from the `install` array, you need to add it to the `uninstall` array.    
    ```yaml 
    # ./.github/npmworker.yaml
    
    install:
      - "@actions/core"
      - "@actions/github"
      - "unirest"
    update:
      - "cardinal-direction"
    remove:
      - "node-fetch"
    ```
