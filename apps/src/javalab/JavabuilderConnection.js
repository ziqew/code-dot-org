import {
  WebSocketMessageType,
  StatusMessageType,
  STATUS_MESSAGE_PREFIX
} from './constants';
import {handleException} from './javabuilderExceptionHandler';
import {getStore} from '../redux';
import {setIsRunning, appendNewlineToConsoleLog} from './javalabRedux';
import project from '@cdo/apps/code-studio/initApp/project';
import javalabMsg from '@cdo/javalab/locale';

// Creates and maintains a websocket connection with javabuilder while a user's code is running.
export default class JavabuilderConnection {
  constructor(javabuilderUrl, onMessage, miniApp, serverLevelId, options) {
    this.channelId = project.getCurrentId();
    this.javabuilderUrl = javabuilderUrl;
    this.onOutputMessage = onMessage;
    this.miniApp = miniApp;
    this.levelId = serverLevelId;
    this.options = options;
  }

  // Get the access token to connect to javabuilder and then open the websocket connection.
  // The token prevents access to our javabuilder AWS execution environment by un-verified users.
  connectJavabuilder() {
    $.ajax({
      url: '/javabuilder/access_token',
      type: 'get',
      data: {
        projectUrl: project.getProjectSourcesUrl(),
        channelId: this.channelId,
        projectVersion: project.getCurrentSourceVersionId(),
        levelId: this.levelId,
        options: this.options
      }
    })
      .done(result => this.establishWebsocketConnection(result.token))
      .fail(error => {
        this.onOutputMessage(
          'We hit an error connecting to our server. Try again.'
        );
        console.error(error.responseText);
      });
  }

  establishWebsocketConnection(token) {
    const url = `${this.javabuilderUrl}?Authorization=${token}`;
    this.socket = new WebSocket(url);
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);
  }

  onOpen() {
    this.miniApp?.onCompile?.();
  }

  onStatusMessage(messageKey) {
    let message;
    let includeLineBreak = false;
    switch (messageKey) {
      case StatusMessageType.COMPILING:
        message = javalabMsg.compiling();
        break;
      case StatusMessageType.COMPILATION_SUCCESSFUL:
        message = javalabMsg.compilationSuccess();
        break;
      case StatusMessageType.RUNNING:
        message = javalabMsg.running();
        includeLineBreak = true;
        break;
      case StatusMessageType.GENERATING_RESULTS:
        message = javalabMsg.generatingResults();
        includeLineBreak = true;
        break;
      case StatusMessageType.EXITED:
        this.onExit();
        break;
      default:
        break;
    }
    if (message) {
      this.onOutputMessage(`${STATUS_MESSAGE_PREFIX} ${message}`);
    }
    if (includeLineBreak) {
      getStore().dispatch(appendNewlineToConsoleLog());
    }
  }

  onMessage(event) {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case WebSocketMessageType.STATUS:
        this.onStatusMessage(data.value);
        break;
      case WebSocketMessageType.SYSTEM_OUT:
        this.onOutputMessage(data.value);
        break;
      case WebSocketMessageType.NEIGHBORHOOD:
      case WebSocketMessageType.THEATER:
        this.miniApp.handleSignal(data);
        break;
      case WebSocketMessageType.EXCEPTION:
        handleException(data, this.onOutputMessage);
        break;
      case WebSocketMessageType.DEBUG:
        if (window.location.hostname.includes('localhost')) {
          this.onOutputMessage('--- Localhost debugging message ---');
          this.onOutputMessage(data.value);
        }
        break;
      default:
        break;
    }
  }

  onClose(event) {
    if (event.wasClean) {
      console.log(`[close] code=${event.code} reason=${event.reason}`);
    } else {
      // e.g. server process ended or network down
      // event.code is usually 1006 in this case
      console.log(`[close] Connection died. code=${event.code}`);
    }
  }

  onExit() {
    if (this.miniApp) {
      // miniApp on close should handle setting isRunning state as it
      // may not align with actual program execution. If mini app does
      // not have on close we won't toggle back automatically.
      // We also pass onOutputMessage so the mini app can send its own custom
      // done message.
      this.miniApp.onClose?.();
    } else {
      // add blank line and program exited message to console logs
      getStore().dispatch(appendNewlineToConsoleLog());
      this.onOutputMessage(
        `${STATUS_MESSAGE_PREFIX} ${javalabMsg.programCompleted()}`
      );
      getStore().dispatch(appendNewlineToConsoleLog());
      // Set isRunning to false
      getStore().dispatch(setIsRunning(false));
    }
  }

  onError(error) {
    this.onOutputMessage(
      'We hit an error connecting to our server. Try again.'
    );
    console.error(`[error] ${error.message}`);
  }

  // Send a message across the websocket connection to Javabuilder
  sendMessage(message) {
    this.socket.send(message);
  }
}
