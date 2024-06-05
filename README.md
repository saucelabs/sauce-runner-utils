# Sauce Runner Utils

A utilities library that is shared among Sauce Runners (e.g., https://github.com/saucelabs/sauce-cypress-runner/) to provide commonly used code across different runner implementations.

## Usage

```javascript
const sauceRunnerUtils = require('sauce-testrunner-utils');

sauceRunnerUtils.prepareNpmEnv();
```

## Publishing

This package is published through a GitHub workflow. To trigger a new release, follow these steps:

1. Open the [workflow page](https://github.com/saucelabs/sauce-runner-utils/actions/workflows/release.yml).
2. Click on the `Run workflow` drop-down menu.
3. Enter a release type (`patch`, `minor`, or `major`) - please follow [semver](https://semver.org/) semantics.
