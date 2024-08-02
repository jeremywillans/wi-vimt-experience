# wi-vimt-experience

## VIMT Experience Workspace Integration

VIMT Experience is a Workspace Integration designed to improve the default meeting experience when using Webex CVI

Current Options
- Grid View Layout as the default layout
- Hide Non-Video Participants by default
- Adds Toggle for Hiding Non-Video Participants

Periodic check of devices occurs every 30 minutes (on the half/hour intervals) to detect if a new device is un/tagged, otherwise devices are re/processed on integration restart.

## Macro Version
Within the macro directory of this repository contains a macro version of this for individual device deployment, if preferred. As the underlying code is shared between both the macro and the Workspace Integration, it will be maintained in the same repository for consistency.

## Prerequisites

1. Navigate to Workspace Integrations in [Control Hub](https://admin.webex.com/workspaces/integrations)
2. Select `Add integration` then `Upload integration` and provide included manifest.json file - ensure you document the provided credentials
3. Navigate to the newly created Integration and select `Activate` from the `Actions` menu - ensure you document the encoded activation code
3. Add the required Device Tag (default: `wi-vimt-experience`) to each device to be managed by this integration

## Deployment (Local)

1. Clone / Download repository
2. Run `npm install` to add the require dependencies (ensure Node and NPM are installed)
3. Create an `.env` file and include the required variables outlined below.
- Recommend adding `WI_LOGGING=info`, `CONSOLE_LEVEL=debug` and `LOG_DETAILED=true` during initial testing
4. Start the integration using `npm run start`
5. Review the console logs to confirm no errors encountered

## Deployment (Docker)

The simplest deployment method is using [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)

1. Clone / Download repository
2. Update the included docker-compose.yml file with the correct Environmental parameters
3. - Use the prebuilt image available on Docker Hub (included in docker-compose.yml)
   - Build the Docker Image using `docker build --tag wi-vimt-experience .` and update image line in docker-compose.yml
4. Provision and start the Integration using `docker-compose up -d`
5. Review the console logs using `docker logs wi-vimt-experience -f` (assuming you are using the default container name)

### Environmental Variables

These variables can be individually defined in Docker, or loaded as an `.env` file in the app directory.

| Name | Required | Type | Default | Description
| ---- | ---- | ---- | ------- | -----------
| **Integration Settings**
| CLIENT_ID | **Yes** | string | ` ` | Client Identifier provided during the Integration creation process
| CLIENT_SECRET | **Yes** | string | ` ` | Client Secret provided during the Integration creation process
| **---**
| CODE | no* | string | ` ` | Encoded Activation Code provided during the Integration activation process
| *-- or --*
| OAUTH_URL | no* | string | ` ` | Decoded oAuth URL from the Activation Code
| REFRESH_TOKEN | no* | string | ` ` | Decoded Refresh Token from the Activation Code
| WEBEXAPIS_BASE_URL | no* | string | ` ` | Decoded Webex APIs Base Url from the Activation Code
| APP_URL | no* | ` ` | string | Decoded App Url from the Activation Code
| **---**
| DEVICE_TAG | no | string | `wi-vimt-experience` | Device Tag used to determine which devices to process
| **Logging Settings**
| LOG_DETAILED | no | bool | `true` | Enable detailed logging
| CONSOLE_LEVEL | no | bool | `info` | Logging level exposed to console
| APP_NAME | no | string | `wi-vimt-experience` | App Name used for logging service
| SYSLOG_ENABLED | no | bool | `false` | Enable external syslog server
| SYSLOG_HOST | no | string | `syslog` | Destination host for syslog server
| SYSLOG_PORT | no | num | `514` | Destination port for syslog server
| SYSLOG_PROTOCOL | no | str | `udp4` | Destination protocol for syslog server
| SYSLOG_SOURCE | no | str | `localhost` | Host to indicate that log messages are coming from
| LOKI_ENABLED | no | bool | `false` | Enable external Loki logging server
| LOKI_HOST| no | string | `http://loki:3100` | Destination host for Loki logging server
| **HTTP Proxy**
| GLOBAL_AGENT_HTTP_PROXY | no | string | ` ` | Container HTTP Proxy Server (format `http://<ip or fqdn>:<port>`)
| GLOBAL_AGENT_NO_PROXY | no | string | ` ` | Comma Separated List of excluded proxy domains (Supports wildcards)
| NODE_EXTRA_CA_CERTS | no | string | ` ` | Include extra CA Cert bundle if required, (PEM format) ensure location is attached as a volume to the container
| **VIMT Options**
| VE_GRID_DEFAULT | no | bool | `true` | : Define Grid View Default option
| VE_GALLERY_DEFAULT | no | bool | `false` | Define Large Gallery Default option
| VE_HIDE_NON_VIDEO | no | bool | `true` | : Hide Non-Video Participants by default
| VE_ADD_BUTTON | no | bool | `true` | Add button the device allowing toggling of Non-Video participants
| VE_SHOW_MESSAGE | no | bool | `true` | Show message when optimizations applied to device
| VE_MESSAGE_TIMEOUT | no | num | `5` | Seconds messages stay on screen
| VE_SILENT_DTMF | no | bool | `true` | Suppress local tone when sending DTMF sequences
| VE_PANEL_ID | no | string | `vimtToggle` | Panel Identifier used for Toggle button
| VE_MESSAGE_TITLE | no | string | `VIMT Experience` | Title string used on Message boxes

***Note:** You must either include the encoded Activation Code, or the four individual decoded parameters.

## Support

In case you've found a bug, please [open an issue on GitHub](../../issues).

## Disclaimer

This application is provided as a sample only is NOT guaranteed to be bug free and production quality.
