/* global React, dashboard, trackEvent */

window.dashboard = window.dashboard || {};

/**
 * Send-to-phone component used by share project dialog.
 */
window.dashboard.SendToPhone = (function (React) {
// TODO (brent) - could we also use this instead of what we have in sharing.html.ejs?  

  var SendState = {
    invalidVal: 'invalidVal',
    canSubmit: 'canSubmit',
    sending: 'sending',
    sent: 'sent',
    error: 'error'
  };

  function sendButtonString(sendState) {
    switch (sendState) {
      case SendState.invalidVal:
      case SendState.canSubmit:
        return 'Send';
      case SendState.sending:
        return 'Sending...';
      case SendState.sent:
        return 'Sent!';
      case SendState.error:
        return 'Error!';
      default:
        throw new Error('unexpected');
      }
  }

  var baseStyles = {
    label: {},
    div: {}
  };

  return React.createClass({
    propTypes: {
      styles: React.PropTypes.shape({
        label: React.PropTypes.object,
        div: React.PropTypes.object,
      })
    },

    getInitialState: function () {
      return {
        sendState: SendState.invalidVal
      };
    },

    componentDidMount: function () {
      this.maskPhoneInput();
    },

    maskPhoneInput: function () {
      // TODO - what happens when called multiple times
      if (this.refs.phone) {
        var phone = this.refs.phone.getDOMNode();
        $(phone).mask('(000) 000-0000', {
          onComplete: function () {
            this.setState({sendState: SendState.canSubmit});
          }.bind(this),
          onChange: function () {
            this.setState({sendState: SendState.invalidVal});
          }.bind(this),
        });
        phone.focus();
      }
    },

    handleSubmit: function () {
      // Do nothing if we aren't in a state where we can send.
      if (this.state.sendState !== SendState.canSubmit) {
        return;
      }
      var phone = this.refs.phone.getDOMNode();

      // TODO - should we be reaching into dashboard.project, or passing these
      // funcs in? same with trackEvent
      this.setState({sendState: SendState.sending});

      var params = $.param({
        type: dashboard.project.getStandaloneApp(),
        channel_id: dashboard.project.getCurrentId(),
        phone: $(phone).val()
      });
      $.post('/sms/send', params)
        .done(function () {
          this.setState({sendState: SendState.sent});
          trackEvent('SendToPhone', 'success');
        }.bind(this))
        .fail(function () {
          this.setState({sendState: SendState.error});
          trackEvent('SendToPhone', 'error');
        }.bind(this));
    },

    render: function () {
      var styles = $.extend({}, baseStyles, this.props.styles);
      return (
        <div>
          <label style={styles.label} htmlFor="phone">Enter a US phone number:</label>
          <input
            type="text"
            ref="phone"
            name="phone"
            disabled={this.state.sendState !== SendState.invalidVal &&
              this.state.sendState !== SendState.canSubmit}>
          </input>
          <button
            disabled={this.state.sendState === SendState.invalidVal}
            onClick={this.handleSubmit}>
              {sendButtonString(this.state.sendState)}
          </button>
          <div style={styles.div}>
            A text message will be sent via <a href="http://twilio.com">Twilio</a>.
            Charges may apply to the recipient.
          </div>
        </div>
      );
    }
  });
})(React);
