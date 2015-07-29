# Cordova Plugin Update

A CLI tool for making updating plugins in a Cordova project easier.

## Install

    npm install -g cordova-plugin-update

## Usage

Run the following from a valid cordova project folder (one that contains a `config.xml`):

    cordova-plugin-update

## Available options:

- `--all`: Shows all available plugin versions, not just ones newer that the currently installed version.
- `--verbose`: Outputs more information (useful if you run into problems during an update).

## Known issues

- Only handles plugins in NPM, self hosted will just be ignored
- Can't handle interdependant plugins, e.g. Trying to update `cordova-plugin-file` will fail if the `cordova-plugin-file-transfer` is also installed.