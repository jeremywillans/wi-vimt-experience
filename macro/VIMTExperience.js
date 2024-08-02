/* eslint-disable no-console */
/*
# VIMT Experience Macro
# Written by Jeremy Willans
# https://github.com/jeremywillans/wi-vimt-experience
#
# USE AT OWN RISK, MACRO NOT FULLY TESTED NOR SUPPLIED WITH ANY GUARANTEE
#
# Usage - Update VIMT Meeting experience with Grid View and Hiding Non-Video Participants by Default
#
# Change History
# 0.1.0 20240802 Add Large Gallery
#
*/
// eslint-disable-next-line import/no-unresolved
import xapi from 'xapi';

const version = '0.1.0';

const veOptions = {
  gridDefault: false, // Define Grid View Default option
  largeGalleryDefault: true, // Define Large Gallery Default option
  hideNonVideo: true, // Hide Non-Video Participants by default
  addNonVideoButton: true, // Adds option during meeting to toggle non-video participants
  showMessage: true, // Briefly show message for VIMT Optimizations
  messageTimeout: 5, // Message timeout in Seconds
  silentDtmf: true, // Change to false if you want to hear the DTMF Feedback tones;
  panelId: 'vimtToggle', // Id assigned to NonVideo Action Button
  messageTitle: 'VIMT Experience', // Title for popup message
  vimtDomain: '@m.webex.com', // Webex VIMT Domain
  logDetailed: true, // Enable detailed logging
};

const sleep = (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
});

// VIMT Experience Class
class VIMTExperience {
  constructor() {
    this.xapi = xapi;
    this.o = veOptions;
    this.participantInterval = null;
    this.vimtSetup = false;
    this.vimtActive = false;
  }

  // Send the DTMF tones during the call.
  async sendDTMF(code, message) {
    if (this.o.logDetailed) console.debug(message);
    try {
      const Feedback = this.o.silentDtmf ? 'Silent' : 'Audible';
      this.xapi.command('Call.DTMFSend', {
        DTMFString: code,
        Feedback,
      });
      if (this.o.logDetailed) console.debug('DTMF Values Sent');
    } catch (error) {
      console.error('Error Sending DTMF');
      console.debug(error.message ? error.message : error);
    }
  }

  // Add button to panel for toggling Non-Video participants
  async addPanel() {
    const config = await this.xapi.command('UserInterface.Extensions.List');
    if (config.Extensions && config.Extensions.Panel) {
      const panelExist = config.Extensions.Panel.find((panel) => panel.PanelId === this.o.panelId);
      if (panelExist) {
        if (this.o.logDetailed) console.debug('Panel already added');
        return;
      }
    }

    if (this.o.logDetailed) console.debug('Adding Panel');
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
      'UserInterface.Extensions.Panel.Save',
      { PanelId: this.o.panelId },
      xml,
    );
  }

  // Remove button from panel
  async removePanel(showLog = true) {
    const config = await this.xapi.command('UserInterface.Extensions.List');
    if (config.Extensions && config.Extensions.Panel) {
      const panelExist = config.Extensions.Panel.find((panel) => panel.PanelId === this.o.panelId);
      if (!panelExist) {
        if (this.o.logDetailed && showLog) console.debug('Panel does not exist');
        return;
      }
    }

    if (this.o.logDetailed && showLog) console.debug('Removing Panel');
    await this.xapi.command('UserInterface.Extensions.Panel.Close');
    await this.xapi.command(
      'UserInterface.Extensions.Panel.Remove',
      { PanelId: this.o.panelId },
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
        await this.xapi.command('Video.Layout.SetLayout', { LayoutName: 'Grid' });
        messageText.push('Grid View Layout Enabled');
      } catch (error) {
        console.error('Unable to set Grid');
        console.debug(error.message ? error.message : error);
      }
    }
    // Large Gallery Default
    if (this.o.largeGalleryDefault) {
      try {
        await this.xapi.command('Video.Layout.SetLayout', { LayoutName: 'Large Gallery' });
        messageText.push('Large Gallery Layout Enabled');
      } catch (error) {
        console.error('Unable to set Large Gallery');
        console.debug(error.message ? error.message : error);
      }
    }
    // Hide Non-Video participants
    if (this.o.hideNonVideo) {
      try {
        await this.sendDTMF('#5', 'Hide Non-Video was Pressed');
        messageText.push('Non-Video Participants Hidden');
      } catch (error) {
        console.error('Unable to Hide Non-Video');
        console.debug(error.message ? error.message : error);
      }
    }
    // Add Non-Video participants toggle
    if (this.o.addNonVideoButton) {
      try {
        await this.addPanel();
        messageText.push('Non-Video Toggle added to Controls');
      } catch (error) {
        console.error('Unable to add Panel');
        console.debug(error.message ? error.message : error);
      }
    }
    // Display VIMT message
    if (this.o.showMessage && messageText.length > 0) {
      try {
        this.xapi.command('UserInterface.Message.Alert.Display', {
          Title: this.o.messageTitle,
          Text: messageText.join('<br>'),
          Duration: this.o.messageTimeout,
        });
      } catch (error) {
        console.error('Unable to display Alert message');
        console.debug(error.message ? error.message : error);
      }
    }
  }

  async handleCallIndication() {
    let call;
    try {
      [call] = await this.xapi.status.get('Call[*].*');
    } catch (error) {
      // No active call
      return;
    }
    if (this.o.logDetailed) console.debug(call.CallbackNumber);
    if (call.CallbackNumber.match(this.o.vimtDomain)) {
      // Matched VIMT call, update global variable
      this.vimtSetup = true;
      if (this.o.logDetailed) console.debug(`VIMT Setup: ${this.vimtSetup}`);
      const vimtRegex = new RegExp(`.*[0-9].*..*${this.o.vimtDomain}`);
      if (call.CallbackNumber.match(vimtRegex)) {
        this.vimtActive = true;
        if (this.o.logDetailed) console.debug(`VIMT Active: ${this.vimtActive}`);
      }
    }
  }

  async participantCheck() {
    if (this.o.logDetailed) console.debug('Checking Participant List');
    const result = await this.xapi.command('Conference.ParticipantList.Search');
    // Joined meeting with multiple participants
    if (result && result.Participant && result.Participant.length > 1) {
      if (this.o.logDetailed) console.debug('Multiple participants detected');
      return true;
    }
    // Joined meeting as only participant (so far!)
    if (result && result.Participant && result.Participant[0].Status === 'connected') {
      if (this.o.logDetailed) console.debug('Device detected in meeting');
      return true;
    }
    return false;
  }

  async handleCallSuccessful() {
    // Check if active VIMT call
    if (this.vimtActive) {
      await sleep(500);
      try {
        if (await this.participantCheck()) {
          this.performActions();
          return;
        }
        if (this.o.logDetailed) console.debug('Lobby Detected');
        this.vimtActive = false;
        if (this.o.logDetailed) console.debug(`VIMT Active: ${this.vimtActive}`);
      } catch (error) {
        console.error('Unable to check participant list');
        console.debug(error.message ? error.message : error);
        return;
      }
    }
    // Check if VIMT call setup (aka VTC Conference DTMF Menu)
    if (this.vimtSetup) {
      if (this.o.logDetailed) console.debug('Pending Meeting Join');
      // Wait for participant list status change
      this.participantInterval = setInterval(async () => {
        try {
          if (await this.participantCheck()) {
            this.vimtActive = true;
            if (this.o.logDetailed) console.debug(`VIMT Active: ${this.vimtActive}`);
            this.performActions();
            clearInterval(this.participantInterval);
          }
        } catch (error) {
          console.error('Unable to process meeting');
          console.debug(error.message ? error.message : error);
          clearInterval(this.participantInterval);
        }
      }, 5000);
    }
  }

  handleCallDisconnect() {
    // Call disconnect detected, remove panel
    if (this.o.logDetailed) console.debug('Invoke Remove Panel');
    this.removePanel();
    // Clear interval check (i.e. call disconnected from vtc lobby)
    clearInterval(this.participantInterval);
    // Restore global variables
    this.vimtSetup = false;
    if (this.o.logDetailed) console.debug(`VIMT Setup: ${this.vimtSetup}`);
    this.vimtActive = false;
    if (this.o.logDetailed) console.debug(`VIMT Active: ${this.vimtActive}`);
  }

  async handlePanelClicked(event) {
    if (event.PanelId === this.o.panelId) {
      try {
        await this.sendDTMF('#5', 'Hide Non-Video was Pressed');
        this.xapi.command('UserInterface.Message.Alert.Display', {
          Title: this.o.messageTitle,
          Text: 'Hide Non-Video Participants Toggled',
          Duration: this.o.messageTimeout,
        });
      } catch (error) {
        console.error('Unable to toggle non-video participants');
        console.debug(error.message ? error.message : error);
      }
    }
  }

  configureCodec() {
    // Remove lingering button during init.
    this.removePanel(false);
  }
}

// Init function
async function init() {
  console.log(`VIMT Experience Macro v${version}`);
  // Declare Class
  const sys = new VIMTExperience();
  try {
    // ensure codec is configured correctly
    sys.configureCodec();

    console.info('--- Processing Subscriptions');
    // Process call indication
    xapi.event.on('OutgoingCallIndication', () => {
      sys.handleCallIndication();
    });
    // Process call successful
    xapi.event.on('CallSuccessful', () => {
      sys.handleCallSuccessful();
    });
    // Process call disconnect
    xapi.event.on('CallDisconnect', () => {
      sys.handleCallDisconnect();
    });
    // Process panel clicked
    xapi.event.on('UserInterface.Extensions.Panel.Clicked', (event) => {
      sys.handlePanelClicked(event);
    });
  } catch (error) {
    console.error('Error during device and subscription processing');
    console.debug(error.message ? error.message : error);
  }
}

init();
