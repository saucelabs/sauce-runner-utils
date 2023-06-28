# Sauce Runner Utils

A utilities library is shared among Sauce Runners (e.g., https://github.com/saucelabs/sauce-cypress-runner/) to provide commonly used code across different runner implementations.

## Usage

```javascript
const sauceRunnerUtils = require('sauce-testrunner-utils');

sauceRunnerUtils.prepareNpmEnv();
```

## Publishing

This package is published through a GitHub workflow. In order to trigger a new release, do the following steps:

* Open the [workflow page](https://github.com/saucelabs/sauce-runner-utils/actions/workflows/release.yml)
* Click on the `Run workflow` drop down menu
* Enter a release type (`patch`, `minor` or `major`) - please follow [semver](https://semver.org/) semantics