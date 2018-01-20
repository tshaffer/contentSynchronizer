import { isNil } from 'lodash';

import * as React from 'react';

import * as fs from 'fs-extra';

import * as semver from 'semver';

import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import MenuItem from 'material-ui/MenuItem';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {RadioButton, RadioButtonGroup} from 'material-ui/RadioButton';
import RaisedButton from 'material-ui/RaisedButton';
import SelectField from 'material-ui/SelectField';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import TextField from 'material-ui/TextField';

import * as shell from 'shelljs';

import {
  addPackage,
  setPackageVersionSelector,
  setSelectedBranchName,
  setSelectedTagIndex,
  setSpecifiedCommitHash,
} from '../store/packages';

import {
  BsPackage,
  BsTag,
  PackageVersionSelectorType,
  RecentCommitData,
  SpecifiedBsPackage,
  // SpecifiedBsPackageMap,
} from '../interfaces';

class App extends React.Component<any, object> {

  packageBaseDir: string = '/Users/tedshaffer/Documents/Projects/bacon-comp/';
  packageNames: string[] = [];

  constructor(props: any){
    super(props);

    this.handleBeginTransfer = this.handleBeginTransfer.bind(this);
    // specify packages
    this.packageNames.push('ba-schedule');
    this.packageNames.push('ba-uw-dm');
    this.packageNames.push('ba-uw-manager');
    this.packageNames.push('bacon-theme');
    this.packageNames.push('baconcore');
    this.packageNames.push('bpfimporter');
    this.packageNames.push('bs-content-manager');
    this.packageNames.push('bs-device-artifacts');
    this.packageNames.push('bs-playlist-dm');
    this.packageNames.push('bs-widgets');
    this.packageNames.push('bscore');
    this.packageNames.push('bsdatamodel');
    this.packageNames.push('bsdevicesetup');
    // this.packageNames.push('bsn-ui-v2-ns');
    this.packageNames.push('bsnconnector');
    this.packageNames.push('bspublisher');
    this.packageNames.push('fsconnector');
    this.packageNames.push('fsmetadata');

    this.setPackageVersionSelector = this.setPackageVersionSelector.bind(this);
    this.selectTag = this.selectTag.bind(this);
    this.setBranchName = this.setBranchName.bind(this);
    this.setCommitHash = this.setCommitHash.bind(this);
    this.configureButtonClicked = this.configureButtonClicked.bind(this);
  }

  handleBeginTransfer() {
    console.log('handleBeginTranfer invoked');
  }

  // return the current version of the current package - either the tag name or the commit hash
  getPackageCurrentVersion(bsTags: BsTag[]): string {
    let currentVersion: string = '';
    const commitMessage = shell.exec('git log -1').stdout;
    const commitHash = this.getCommitHashFromCommitMessage(commitMessage);
    bsTags.forEach( (tag, index) => {
      if (tag.commitHash === commitHash) {
        currentVersion = tag.name;
      }
    });
    if (currentVersion === '') {
      currentVersion = commitHash;
    }

    return currentVersion;
  }

  // return a structure mapping a package name to an object that contains
  //    packageName
  //    the version (semver format) specified in package.json
  parseBaconPackageDotJson(): any {
    const packageDotJsonVersionsMap: any = {};
    const baconPackageJsonPath = this.packageBaseDir.concat('bacon/package.json');
    const baconPackageJson = fs.readJsonSync(baconPackageJsonPath);

    for (const dependencyName in baconPackageJson.dependencies) {
      if (baconPackageJson.dependencies.hasOwnProperty(dependencyName)) {
        if (dependencyName.startsWith('@brightsign/')) {

          const bsPackageName: string = dependencyName.substr(12);
          const bsPackageVersionSpec: string = baconPackageJson.dependencies[dependencyName];

          const specifiedBsPackage: SpecifiedBsPackage = {
            name: bsPackageName,
            version: bsPackageVersionSpec
          };
          packageDotJsonVersionsMap[bsPackageName] = specifiedBsPackage;
        }
      }
    }

    return packageDotJsonVersionsMap;
  }

  getCommitHashFromCommitMessage(commitMessage: string) : string {
    return commitMessage.substr(7, 40);
  }

  // get all tags for the active branch
  //    tag name
  //    commitMessage

  getTags() {

    const rawTags: any = shell.exec('git tag');

    const splitTags: string[] = rawTags.split('\n');

    const tags: string[] = [];
    splitTags.forEach((tag) => {
      if (tag !== '') {
        tags.push(tag);
      }
    });

    const bsTags: BsTag[] = [];

    tags.forEach((tag) => {

      // get the commitMessage information for the tag
      // commitLine=$(git show $tag | grep commitMessage)
      const gitShowCmd: string = 'git show ' + tag + ' | grep commit'
      const commitLine: string = shell.exec(gitShowCmd).stdout;
      let commitHash: string = commitLine.split(' ')[1];
      if (commitHash.endsWith('\n')) {
        commitHash = commitHash.trim();
      }

      // commitInfo=$(git log -1 $commitHash)
      const gitLogCmd: string = 'git log -1 ' + commitHash;
      const commitInfo: string = shell.exec(gitLogCmd).stdout;

      bsTags.push( {
        name: tag,
        commitMessage: commitInfo,
        commitHash
      });
    });

    return bsTags;
  }

  getBranches() {

    // Future implementation

    // local or remote?
    const rawBranches: any = shell.exec('git branch -a');
    console.log(rawBranches.stdout);

  }

  setPackageVersionSelector(event: any, value: any) {
    const params: string[] = value.split(':');
    this.props.setPackageVersionSelector(params[0], params[1]);
  }

  selectTag(event: any, key: number, payload: any) {
    const params: string[] = payload.split(':');
    this.props.setSelectedTagIndex(params[0], Number(params[1]));
  }

  setBranchName(event: any, newValue: string) {
    const params: string[] = event.target.id.split(':');
    const packageName: string = params[0];
    const branchName: string = newValue;
    this.props.setSelectedBranchName(packageName, branchName);
  }

  setCommitHash(event: any, newValue: string) {
    const params: string[] = event.target.id.split(':');
    const packageName: string = params[0];
    const commitHash: string = newValue;
    this.props.setSpecifiedCommitHash(packageName, commitHash);
  }

  configureButtonClicked() {

    const bsPackagesByPackageName: any = this.props.bsPackages.bsPackagesByPackageName;
    for (const packageName in bsPackagesByPackageName) {
      if (bsPackagesByPackageName.hasOwnProperty(packageName)) {
        const bsPackage: BsPackage = bsPackagesByPackageName[packageName];
        console.log(bsPackage);

        const packagePath = this.packageBaseDir.concat(bsPackage.name);

        let checkoutSpecifier: string = '';

        shell.cd(packagePath);
        shell.pwd();

        // TODO - it may be necessary to perform 'git fetch' for each branch to get the latest info (tags at least)
        // TODO - if that is done, then this 'git fetch' can be eliminated
        let gitFetchOutput: string = '';
        if (bsPackage.packageVersionSelector !== PackageVersionSelectorType.Current) {
          gitFetchOutput = shell.exec('git fetch').stdout;
        }
        console.log('gitFetchOutput: ', gitFetchOutput);

        switch (bsPackage.packageVersionSelector) {
          case PackageVersionSelectorType.Tag: {
            const bsTag: BsTag = bsPackage.tags[bsPackage.selectedTagIndex];
            checkoutSpecifier = this.getCommitHashFromCommitMessage(bsTag.commitMessage);
            console.log('commitMessage: ', checkoutSpecifier);
            break;
          }
          case PackageVersionSelectorType.Branch: {
            checkoutSpecifier = bsPackage.selectedBranchName;
            console.log('branchName: ', checkoutSpecifier);
            break;
          }
          case PackageVersionSelectorType.Commit: {
            checkoutSpecifier = bsPackage.specifiedCommitHash;
            console.log('commitMessage: ', checkoutSpecifier);
            break;
          }
          case PackageVersionSelectorType.PackageDotJsonVersion: {
            const packageVersion = bsPackage.packageDotJsonSpecifiedPackage.version;
            // find the tag, and therefore the commitMessage that corresponds to this version
            // fix me up
            bsPackage.tags.forEach( (bsTag) => {
              if (bsTag.name.substr(1) === packageVersion) {
                checkoutSpecifier = this.getCommitHashFromCommitMessage(bsTag.commitMessage);
                console.log('packageVersionSelector: ', checkoutSpecifier);
              }
            });
            break;
          }
          case PackageVersionSelectorType.Current: {
            // no change
            break;
          }
          default: {
            debugger;
          }
        }

        if (checkoutSpecifier !== '') {
          const gitCheckoutOutput: shell.ExecOutputReturnValue = shell.exec('git checkout ' + checkoutSpecifier);
          if (gitCheckoutOutput.stderr !== '') {
            alert(gitCheckoutOutput.stderr);
          }
          else {
            console.log('gitCheckoutOutput: ', gitCheckoutOutput.stdout);
          }
        }
      }
    }
  }

  buildTagOption(tag: BsTag, bsPackageName: string, tagIndex: number) {

    return (
      <MenuItem key={tag.name} value={bsPackageName + ':' + tagIndex.toString()} primaryText={tag.name}/>
    );
  }

  buildTagOptions(bsPackage: BsPackage) {

    const tagOptions: any[] = [];

    bsPackage.tags.forEach((tag, index) => {
      const tagOption: any = this.buildTagOption(tag, bsPackage.name, index);
      tagOptions.push(tagOption);
    });

    return tagOptions;
  }

  getCompatiblePackageDotJsonVersion(bsPackage: BsPackage): string {

    if (!isNil(bsPackage.tagIndexForPackageDotJsonPackageVersion)) {
      const bsTag = bsPackage.tags[bsPackage.tagIndexForPackageDotJsonPackageVersion];
      return bsTag.name;
    }
    return '';
  }

  buildPackageRow(bsPackage: BsPackage) {

    const tagOptions: any = this.buildTagOptions(bsPackage);

    const self: any = this;

    const tagValue = bsPackage.name + ':' + bsPackage.selectedTagIndex.toString();

    let compatiblePackageDotJsonVersion: string = this.getCompatiblePackageDotJsonVersion(bsPackage);
    const disabled: boolean = compatiblePackageDotJsonVersion === '';
    if (disabled) {
      compatiblePackageDotJsonVersion = 'n/a';
    }

    return (
      <TableRow key={bsPackage.name}>
        <TableRowColumn>
          {bsPackage.name}
        </TableRowColumn>
        <TableRowColumn>
          {bsPackage.currentVersion}
        </TableRowColumn>
        <TableRowColumn>
          {bsPackage.packageDotJsonSpecifiedPackage.version}
        </TableRowColumn>
        <TableRowColumn>
          <RadioButtonGroup
            name='packageIdType'
            defaultSelected={bsPackage.name + ':' + PackageVersionSelectorType.Current}
            onChange={self.setPackageVersionSelector}
          >
            <RadioButton
              value={bsPackage.name + ':' + PackageVersionSelectorType.Current}
              label='Current'
            />
            <RadioButton
              value={bsPackage.name + ':' + PackageVersionSelectorType.PackageDotJsonVersion}
              label='Compatible'
              disabled={disabled}
            />
            <RadioButton
              value={bsPackage.name + ':' + PackageVersionSelectorType.Tag}
              label='Tag'
            />
            <RadioButton
              value={bsPackage.name + ':' + PackageVersionSelectorType.Commit}
              label='Commit'
            />
            <RadioButton
              value={bsPackage.name + ':' + PackageVersionSelectorType.Branch}
              label='Branch'
            />
          </RadioButtonGroup>
        </TableRowColumn>
        <TableRowColumn>
          {compatiblePackageDotJsonVersion}
        </TableRowColumn>
        <TableRowColumn>
          <SelectField
            floatingLabelText='Tag'
            value={tagValue}
            onChange={self.selectTag}
          >
            {tagOptions}
          </SelectField>
        </TableRowColumn>
        <TableRowColumn>
          <TextField
            id={bsPackage.name + ':commitHash'}
            defaultValue=''
            onChange={self.setCommitHash}
          />
        </TableRowColumn>
        <TableRowColumn>
          <TextField
            id={bsPackage.name + ':branchName'}
            defaultValue='master'
            onChange={self.setBranchName}
          />
        </TableRowColumn>
      </TableRow>
    );
  }

  buildPackageRows() {

    const bsPackageRows: any = [];

    const bsPackagesByPackageName: any = this.props.bsPackages.bsPackagesByPackageName;
    for (const packageName in bsPackagesByPackageName) {
      if (bsPackagesByPackageName.hasOwnProperty(packageName)) {
        const bsPackage: BsPackage = bsPackagesByPackageName[packageName];
        bsPackageRows.push(this.buildPackageRow(bsPackage));
      }
    }

    return bsPackageRows;
  }

// <TableHeaderColumn>Tag Commit</TableHeaderColumn>
//   render() {
//
//     const bsPackageRows: any[] = this.buildPackageRows();
//
//     return (
//       <MuiThemeProvider>
//         <div>
//
//           <Table>
//             <TableHeader
//               displaySelectAll={false}
//               adjustForCheckbox={false}
//               enableSelectAll={false}
//             >
//               <TableRow>
//                 <TableHeaderColumn>Package name</TableHeaderColumn>
//                 <TableHeaderColumn>Current version</TableHeaderColumn>
//                 <TableHeaderColumn>Package.json version</TableHeaderColumn>
//                 <TableHeaderColumn>Package Version Selector</TableHeaderColumn>
//                 <TableHeaderColumn>Compatible Version</TableHeaderColumn>
//                 <TableHeaderColumn>Tags</TableHeaderColumn>
//                 <TableHeaderColumn>Commit Hash</TableHeaderColumn>
//                 <TableHeaderColumn>Branch</TableHeaderColumn>
//               </TableRow>
//             </TableHeader>
//             <TableBody
//               displayRowCheckbox={false}
//             >
//               {bsPackageRows}
//             </TableBody>
//           </Table>
//
//           <RaisedButton label='Configure' onClick={this.configureButtonClicked}/>
//         </div>
//       </MuiThemeProvider>
//     );
//   }

  render() {
    return (
      <MuiThemeProvider>
        <div>
          <div>
            Content folder:
            <TextField
              id={'contentFolder'}
              defaultValue=''
            />
          </div>
          <div>
            BrightSign IP Address:
            <TextField
              id={'brightSignIPAddress'}
              defaultValue=''
            />
          </div>
          <div>
            <RaisedButton label='Begin Transfer' onClick={this.handleBeginTransfer}/>
          </div>
        </div>
      </MuiThemeProvider>
    );
  }
}

function mapStateToProps(state : any) {
  return {
    bsPackages: state.bsPackages,
  };
}

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
  return bindActionCreators({
    addPackage,
    setPackageVersionSelector,
    setSelectedBranchName,
    setSelectedTagIndex,
    setSpecifiedCommitHash,
  }, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
