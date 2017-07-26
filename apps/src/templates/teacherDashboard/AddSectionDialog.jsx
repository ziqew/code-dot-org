import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import i18n from '@cdo/locale';
import BaseDialog from '../BaseDialog';
import LoginTypePicker from './LoginTypePicker';
import EditSectionForm from "./EditSectionForm";
import PadAndCenter from './PadAndCenter';
import {sectionShape} from './shapes';
import {isAddingSection} from './teacherSectionsRedux';

class AddSectionDialog extends Component {
  static propTypes = {
    // Provided by Redux
    isOpen: PropTypes.bool.isRequired,
    section: sectionShape,
  };

  render() {
    const {isOpen, section} = this.props;
    const {loginType} = section || {};
    const title = i18n.newSection();
    return (
      <BaseDialog
        useUpdatedStyles
        fixedWidth={1010}
        assetUrl={() => ''}
        isOpen={isOpen}
        uncloseable
      >
        <PadAndCenter>
          {!loginType && <LoginTypePicker title={title}/>}
          {loginType && <EditSectionForm title={title}/>}
        </PadAndCenter>
      </BaseDialog>
    );
  }
}

export default connect(state => ({
  isOpen: isAddingSection(state.teacherSections),
  section: state.teacherSections.sectionBeingEdited,
}))(AddSectionDialog);
