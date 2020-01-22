import {expect} from '../../../../util/reconfiguredChai';
import annotationList from '@cdo/apps/acemode/annotationList';
import sinon from 'sinon';
import libraryParser from '@cdo/apps/code-studio/components/libraries/libraryParser';
import loadLibrary from '@cdo/apps/code-studio/components/libraries/libraryLoader';
import LibraryClientApi from '@cdo/apps/code-studio/components/libraries/LibraryClientApi';
import {replaceOnWindow, restoreOnWindow} from '../../../../util/testUtils';

describe('libraryLoader.load', () => {
  let libraryClientApi, fetchStub, getJSLintAnnotationsStub, sourceStub;
  let onCodeErrorStub, onMissingFunctionsStub, onSuccessStub, functionStub;
  let libraryName = 'Name';
  let source = 'function foo() {}';
  before(() => {
    replaceOnWindow('dashboard', {
      project: {
        getUpdatedSourceAndHtml_: () => {},
        getLevelName: () => {}
      }
    });
    libraryClientApi = new LibraryClientApi('123');
  });

  after(() => {
    restoreOnWindow('dashboard');
  });

  beforeEach(() => {
    getJSLintAnnotationsStub = sinon.stub(
      annotationList,
      'getJSLintAnnotations'
    );
    sourceStub = sinon.stub(
      window.dashboard.project,
      'getUpdatedSourceAndHtml_'
    );
    functionStub = sinon.stub(libraryParser, 'getFunctions');
    sinon.stub(window.dashboard.project, 'getLevelName').returns(libraryName);
    fetchStub = sinon.stub(libraryClientApi, 'fetchLatest');
    onCodeErrorStub = sinon.stub();
    onMissingFunctionsStub = sinon.stub();
    onSuccessStub = sinon.stub();
  });

  afterEach(() => {
    annotationList.getJSLintAnnotations.restore();
    window.dashboard.project.getUpdatedSourceAndHtml_.restore();
    libraryParser.getFunctions.restore();
    window.dashboard.project.getLevelName.restore();
    libraryClientApi.fetchLatest.restore();
    onCodeErrorStub.resetHistory();
    onMissingFunctionsStub.resetHistory();
    onSuccessStub.resetHistory();
  });

  it('calls onCodeError when an error exists in the code', async () => {
    getJSLintAnnotationsStub.returns([{type: 'error'}]);

    await loadLibrary(
      libraryClientApi,
      onCodeErrorStub,
      onMissingFunctionsStub,
      onSuccessStub
    );

    expect(onCodeErrorStub.called).to.be.true;
    expect(onMissingFunctionsStub.called).to.be.false;
    expect(onSuccessStub.called).to.be.false;
  });

  it('calls onMissingFunctions when there are no functions', async () => {
    getJSLintAnnotationsStub.returns([]);
    sourceStub.yields({source: ''});
    fetchStub.callsArg(1);
    functionStub.returns([]);

    await loadLibrary(
      libraryClientApi,
      onCodeErrorStub,
      onMissingFunctionsStub,
      onSuccessStub
    );

    expect(onCodeErrorStub.called).to.be.false;
    expect(onMissingFunctionsStub.called).to.be.true;
    expect(onSuccessStub.called).to.be.false;
  });

  it('prepends imported libraries to the exported source', async () => {
    let library = 'function bar() {}';
    let sourceFunctionList = [{functionName: 'foo', comment: ''}];
    getJSLintAnnotationsStub.returns([]);
    functionStub.returns(sourceFunctionList);
    sourceStub.yields({source: source, libraries: [library]});
    fetchStub.callsArg(1);
    sinon.stub(libraryParser, 'createLibraryClosure').returns(library);

    await loadLibrary(
      libraryClientApi,
      onCodeErrorStub,
      onMissingFunctionsStub,
      onSuccessStub
    );

    expect(onCodeErrorStub.called).to.be.false;
    expect(onMissingFunctionsStub.called).to.be.false;
    expect(onSuccessStub).to.have.been.calledWith({
      alreadyPublished: false,
      libraryDescription: '',
      libraryName: libraryName,
      librarySource: library + source,
      selectedFunctions: {},
      sourceFunctionList: sourceFunctionList
    });

    libraryParser.createLibraryClosure.restore();
  });

  it('pre-sets library values to the values of the already-published library', async () => {
    let sourceFunctionList = [
      {functionName: 'foo', comment: ''},
      {functionName: 'bar', comment: ''}
    ];
    let existingLibrary = {
      description: 'description',
      name: 'existingLibraryName',
      functions: ['foo', 'baz']
    };
    getJSLintAnnotationsStub.returns([]);
    functionStub.returns(sourceFunctionList);
    sourceStub.yields({source: source});
    fetchStub.callsArgWith(0, JSON.stringify(existingLibrary));

    await loadLibrary(
      libraryClientApi,
      onCodeErrorStub,
      onMissingFunctionsStub,
      onSuccessStub
    );

    expect(onCodeErrorStub.called).to.be.false;
    expect(onMissingFunctionsStub.called).to.be.false;
    expect(onSuccessStub).to.have.been.calledWith({
      alreadyPublished: true,
      libraryDescription: existingLibrary.description,
      libraryName: existingLibrary.name,
      librarySource: source,
      selectedFunctions: {foo: true},
      sourceFunctionList: sourceFunctionList
    });
  });
});
