# Contributing to `sauce-runner-utils`

**Thank you for your interest in `sauce-runner-utils`. Your contributions are highly welcome.**

There are multiple ways of getting involved:

- [Report a bug](#report-a-bug)
- [Suggest a feature](#suggest-a-feature)
- [Contribute code](#contribute-code)

Below are a few guidelines we would like you to follow.
If you need help, please reach out to us by opening an issue.

## Report a bug
Reporting bugs is one of the best ways to contribute. Before creating a bug report, please check that an [issue](/issues) reporting the same problem does not already exist. If there is such an issue, you may add your information as a comment.

To report a new bug you should open an issue that summarizes the bug and set the label to "bug".

If you want to provide a fix along with your bug report: That is great! In this case please send us a pull request as described in section [Contribute Code](#contribute-code).

## Suggest a feature
To request a new feature you should open an [issue](../../issues/new) and summarize the desired functionality and its use case. Set the issue label to "feature".

## Contribute code
This is an outline of what the workflow for code contributions looks like

- Check the list of open [issues](../../issues). Either assign an existing issue to yourself, or
create a new one that you would like work on and discuss your ideas and use cases.

It is always best to discuss your plans beforehand, to ensure that your contribution is in line with our goals.

- Fork the repository on GitHub
- Create a topic branch from where you want to base your work. This is usually `main`.
- Open a new pull request, label it `work in progress` and outline what you will be contributing
- Make commits of logical units.
- Make sure you sign-off on your commits `git commit -s -m "adding X to change Y"`
- Write good commit messages (see below).
- Push your changes to a topic branch in your fork of the repository.
- As you push your changes, update the pull request with new infomation and tasks as you complete them
- Project maintainers might comment on your work as you progress
- When you are done, remove the `work in progess` label and ping the maintainers for a review
- Your pull request must receive a :thumbsup: from two [maintainers](MAINTAINERS)

### Prerequisites

To build and work on this project you need to install:

- [Node.js](https://nodejs.org/en/) (LTS)

### Check out code

To get the code base, have [git](https://git-scm.com/downloads) installed and run:

```sh
$ git clone git@github.com:saucelabs/sauce-runner-utils.git
```

then ensure to install all project dependencies:

```sh
$ cd sauce-runner-utils
$ npm install
```

### Test Project

To test the project, run:

```sh
$ npm test
```

## Release Project

Contributor with push access to this repo can at any time make a release. To do so, just trigger the [GitHub Action](https://github.com/saucelabs/sauce-runner-utils/actions/workflows/release.yml) that releases the package. Ensure you pick the correct release type by following the [semantic versioning](https://semver.org/) principle.

---

**Have fun, and happy hacking!**

Thanks for your contributions!