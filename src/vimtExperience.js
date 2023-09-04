//
// VIMTExperience Module
//

// eslint-disable-next-line object-curly-newline
const { cleanEnv, str, bool, num } = require('envalid');
const logger = require('./logger')(__filename.slice(__dirname.length + 1, -3));

// Process ENV Parameters
const e = cleanEnv(process.env, {
  LOG_DETAILED: bool({ default: true }),
  VE_GRID_DEFAULT: bool({ default: true }),
  VE_HIDE_NON_VIDEO: bool({ default: true }),
  VE_ADD_BUTTON: bool({ default: true }),
  VE_SHOW_MESSAGE: bool({ default: true }),
  VE_MESSAGE_TIMEOUT: num({ default: 5 }),
  VE_SILENT_DTMF: bool({ default: true }),
  VE_PANEL_ID: str({ default: 'vimtToggle' }),
  VE_MESSAGE_TITLE: str({ default: 'VIMT Experience' }),
});

// Define VIMT Experience options from ENV Parameters
const veOptions = {
  gridDefault: e.VE_GRID_DEFAULT, // Define Grid View Default option
  hideNonVideo: e.VE_HIDE_NON_VIDEO, // Hide Non-Video Participants by default
  addNonVideoButton: e.VE_ADD_BUTTON, // Adds option during meeting to toggle non-video participants
  showMessage: e.VE_SHOW_MESSAGE, // Briefly show message for VIMT Optimizations
  messageTimeout: e.VE_MESSAGE_TIMEOUT, // Message timeout in Seconds
  silentDtmf: e.VE_SILENT_DTMF, // Change to false if you want to hear the DTMF Feedback tones;
  panelId: e.VE_PANEL_ID, // Id assigned to NonVideo Action Button
  messageTitle: e.VE_MESSAGE_TITLE, // Title for popup message
  vimtDomain: '@m.webex.com', // Webex VIMT Domain
  logDetailed: e.LOG_DETAILED, // Enable detailed logging
};

const sleep = (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
});

// VIMT Experience Class - Instantiated per Device
class VIMTExperience {
  constructor(i, id, deviceId) {
    this.xapi = i.xapi;
    this.id = id;
    this.deviceId = deviceId;
    this.o = veOptions;
    this.participantInterval = null;
    this.vimtSetup = false;
    this.vimtActive = false;
  }

  // Send the DTMF tones during the call.
  async sendDTMF(code, message) {
    if (this.o.logDetailed) logger.debug(`${this.id}: ${message}`);

    try {
      const Level = await this.xapi.status.get(this.deviceId, 'Audio.Volume');
      await this.xapi.command(this.deviceId, 'Audio.Volume.Set', {
        Level: 30,
      });
      if (this.o.logDetailed) logger.debug(`${this.id}: Volume set to 30`);

      await sleep(200);
      const Feedback = this.o.silentDtmf ? 'Silent' : 'Audible';
      this.xapi.command(this.deviceId, 'Call.DTMFSend', {
        DTMFString: code,
        Feedback,
      });
      if (this.o.logDetailed) logger.debug(`${this.id}: DTMF Values Sent`);

      await sleep(750);
      await this.xapi.command(this.deviceId, 'Audio.Volume.Set', {
        Level,
      });
      if (this.o.logDetailed) logger.debug(`${this.id}: Volume Set Back to ${Level}`);
    } catch (error) {
      logger.error(`${this.id}: Error Sending DTMF`);
      logger.debug(`${this.id}: ${error.message}`);
    }
  }

  // Add button to panel for toggling Non-Video participants
  async addPanel() {
    const config = await this.xapi.command(this.deviceId, 'UserInterface.Extensions.List');
    if (config.Extensions.Panel) {
      const panelExist = config.Extensions.Panel.find(
        (panel) => panel.PanelId === this.o.panelId,
      );
      if (panelExist) {
        if (this.o.logDetailed) logger.debug(`${this.id}: Panel already added`);
        return;
      }
    }

    if (this.o.logDetailed) logger.debug(`${this.id}: Adding Panel`);
    const xml = `<?xml version="1.0"?>
    <Extensions>
    <Version>1.10</Version>
    <Panel>
      <Order>1</Order>
      <PanelId>${this.o.panelId}</PanelId>
      <Location>CallControls</Location>
      <Icon>Camera</Icon>
      <Color>#262626</Color>
      <Name>Toggle Non-Video</Name>
      <ActivityType>Custom</ActivityType>
    </Panel>
    </Extensions>`;

    await this.xapi.command(
      this.deviceId,
      'UserInterface.Extensions.Panel.Save',
      {
        PanelId: this.o.panelId,
      },
      xml,
    );
  }

  // Remove button from panel
  async removePanel() {
    const config = await this.xapi.command(this.deviceId, 'UserInterface.Extensions.List');
    if (config.Extensions.Panel) {
      const panelExist = config.Extensions.Panel.find(
        (panel) => panel.PanelId === this.o.panelId,
      );
      if (!panelExist) {
        if (this.o.logDetailed) logger.debug(`${this.id}: Panel does not exist`);
        return;
      }
    }

    if (this.o.logDetailed) logger.debug(`${this.id}: Removing Panel`);
    await this.xapi.command(this.deviceId, 'UserInterface.Extensions.Panel.Close');
    await this.xapi.command(
      this.deviceId,
      'UserInterface.Extensions.Panel.Remove',
      {
        PanelId: this.o.panelId,
      },
    );
  }

  // Successfully joined VIMT call, perform optimizations
  async performActions() {
    // Pause 1 second just to be sure
    await sleep(1000);
    const messageText = [];
    // Grid Default
    if (this.o.gridDefault) {
      try {
        await this.xapi.command(this.deviceId, 'Video.Layout.SetLayout', { LayoutName: 'Grid' });
        messageText.push('Grid View Layout Enabled');
      } catch (error) {
        logger.error(`${this.id}: Unable to set Grid`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }
    // Hide Non-Video participants
    if (this.o.hideNonVideo) {
      try {
        await this.sendDTMF('#5', 'Hide Non-Video was Pressed');
        messageText.push('Non-Video Participants Hidden');
      } catch (error) {
        logger.error(`${this.id}: Unable to Hide Non-Video`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }
    // Add Non-Video participants toggle
    if (this.o.addNonVideoButton) {
      try {
        await this.addPanel();
        messageText.push('Non-Video Toggle added to Controls');
      } catch (error) {
        logger.error(`${this.id}: Unable to add Panel`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }
    // Display VIMT message
    if (this.o.showMessage && messageText.length > 0) {
      try {
        this.xapi.command(this.deviceId, 'UserInterface.Message.Alert.Display', {
          Title: this.o.messageTitle,
          Text: messageText.join('<br>'),
          Duration: this.o.messageTimeout,
        });
      } catch (error) {
        logger.error(`${this.id}: Unable to display Alert message`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }
  }

  async handleCallIndication() {
    let call;
    try {
      [call] = await this.xapi.status.get(this.deviceId, 'Call[*].*');
    } catch (error) {
      // No active call
      return;
    }
    if (this.o.logDetailed) logger.debug(`${this.id}: ${call.CallbackNumber}`);
    if (call.CallbackNumber.match(this.o.vimtDomain)) {
      // Matched VIMT call, update global variable
      this.vimtSetup = true;
      if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Setup: ${this.vimtSetup}`);
      const vimtRegex = new RegExp(`.*[0-9].*..*${this.o.vimtDomain}`);
      if (call.CallbackNumber.match(vimtRegex)) {
        this.vimtActive = true;
        if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Active: ${this.vimtActive}`);
      }
    }
  }

  async participantCheck() {
    if (this.o.logDetailed) logger.debug(`${this.id}: Checking Participant List`);
    const result = await this.xapi.command(this.deviceId, 'Conference.ParticipantList.Search');
    // Joined meeting with multiple participants
    if (result && result.Participant.length > 1) {
      if (this.o.logDetailed) logger.debug(`${this.id}: Multiple participants detected`);
      return true;
    }
    // Joined meeting as only participant (so far!)
    if (result && result.Participant[0].Status === 'connected') {
      if (this.o.logDetailed) logger.debug(`${this.id}: Device detected in meeting`);
      return true;
    }
    return false;
  }

  async handleCallSuccessful() {
    // Check if active VIMT call
    if (this.vimtActive) {
      try {
        if (await this.participantCheck()) {
          this.performActions();
          return;
        }
        if (this.o.logDetailed) logger.debug(`${this.id}: Lobby Detected`);
        this.vimtActive = false;
        if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Active: ${this.vimtActive}`);
      } catch (error) {
        logger.error(`${this.id}: Unable to check participant list`);
        logger.debug(`${this.id}: ${error.message}`);
        return;
      }
    }
    // Check if VIMT call setup (aka VTC Conference DTMF Menu)
    if (this.vimtSetup) {
      if (this.o.logDetailed) logger.debug(`${this.id}: Pending Meeting Join`);
      // Wait for participant list status change
      this.participantInterval = setInterval(async () => {
        try {
          if (await this.participantCheck()) {
            this.vimtActive = true;
            if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Active: ${this.vimtActive}`);
            this.performActions();
            clearInterval(this.participantInterval);
          }
        } catch (error) {
          logger.error(`${this.id}: Unable to process meeting`);
          logger.debug(`${this.id}: ${error.message}`);
          clearInterval(this.participantInterval);
        }
      }, 5000);
    }
  }

  handleCallDisconnect() {
    // Call disconnect detected, remove panel
    if (this.o.logDetailed) logger.debug(`${this.id}: Invoke Remove Panel`);
    this.removePanel();
    // Clear interval check (i.e. call disconnected from vtc lobby)
    clearInterval(this.participantInterval);
    // Restore global variables
    this.vimtSetup = false;
    if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Setup: ${this.vimtSetup}`);
    this.vimtActive = false;
    if (this.o.logDetailed) logger.debug(`${this.id}: VIMT Active: ${this.vimtActive}`);
  }

  async handlePanelClicked(event) {
    if (event.PanelId === this.o.panelId) {
      try {
        await this.sendDTMF('#5', 'Hide Non-Video was Pressed');
        this.xapi.command(this.deviceId, 'UserInterface.Message.Alert.Display', {
          Title: this.o.messageTitle,
          Text: 'Hide Non-Video Participants Toggled',
          Duration: this.o.messageTimeout,
        });
      } catch (error) {
        logger.error(`${this.id}: Unable to toggle non-video participants`);
        logger.debug(`${this.id}: ${error.message}`);
      }
    }
  }

  configureCodec() {
    // Remove lingering button during init.
    this.removePanel();
  }
}
exports.VIMTExperience = VIMTExperience;
