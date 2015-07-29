#! /usr/bin/env node

var shell = require('shelljs/global');
var fs = require('fs');
var semver = require('semver');
var query = require('cli-interact').getChar;
var clc = require('cli-color');
var argv = require('minimist')(process.argv.slice(2));


// Setup some variables based on the command line options

// Sometimes it might be useful to have some more output
var verbose = !!argv.verbose;

var showAllVersions = !!argv.all;

/**
 * Load an XML file into a string
 *
 * @param  {String} filePath The path to the XML file
 * @return {String}          
 */
function loadXMLDoc(filePath) {
    var xml2js = require('xml2js');
    var json;

    var fileData = fs.readFileSync(filePath, 'ascii');

    var parser = new xml2js.Parser();

    parser.parseString(fileData.substring(0, fileData.length), function (err, result) {
        json = JSON.stringify(result);
    });

    return json;
};

// Load the Cordova config.xml file and parse it for currently installed plugins
try {
    var json = JSON.parse(loadXMLDoc('./config.xml'));
}
catch (error) {
    console.error('Failed to load config.xml');
    process.exit(-1);
}

var plugins = [];

if(json.widget && json.widget.plugin) {

    // Keep a track of the plugins we've updated
    var updatedPlugins = [];

    // Iterate each of the plugins installed
    json.widget.plugin.forEach(function(plugin) {

        // Get the plugin name and spec
        var name = plugin.$.name;
        var spec = plugin.$.spec;

        try {
            // Read the plugin's package.json to work out the currently installed version
            var pluginPackage = JSON.parse(fs.readFileSync('./plugins/' + name + '/package.json', "utf8"));

            // Get a list of all the versions available on NPM
            var npmCheck = exec('npm view '+name+' versions --json', {
                silent: true
            });

            // Check that the npm command wasn't a failure
            if(npmCheck.code === 0) {

                // Parse the list of versions
                var versions = JSON.parse(npmCheck.output);

                var availableVersions = [];

                if(showAllVersions) {
                    // Show all versions
                    availableVersions = versions;

                    // Find the current version and remove it
                    var index = availableVersions.indexOf(pluginPackage.version);
                    availableVersions.splice(index, 1);
                }
                else {
                    // Work out which versions are newer than the version currently installed
                    versions.forEach(function(version) {
                        if(semver.gt(version, pluginPackage.version)) {
                            availableVersions.push(version);
                        }
                    });
                }

                // If there are new versions then display the options
                if(availableVersions.length) {
                    // Reverse the order of list so the newest is first
                    availableVersions.reverse();

                    // Work out the right language to use
                    if(showAllVersions) {
                        if(availableVersions.length > 1) {
                            console.log('\nAlternate versions of `' + name + '` are available (currently ' + pluginPackage.version + ')\n');
                        }
                        else {
                            console.log('\nAn alternate version of `' + name + '` is available (currently ' + pluginPackage.version + ')\n');
                        }
                    }
                    else {
                        if(availableVersions.length > 1) {
                            console.log('\nNewer versions of `' + name + '` are available (currently ' + pluginPackage.version + ')\n');
                        }
                        else {
                            console.log('\nA newer versions of `' + name + '` is available (currently ' + pluginPackage.version + ')\n');
                        }
                        
                    }

                    var options = {};

                    for(var i=0; i < availableVersions.length; i++) {
                        // Start the options at 1 not 0
                        var key = i+1+'';

                        options[key] = availableVersions[i];

                        // Present the option to the user
                        console.log(clc.green('  ' + key + ') ') + availableVersions[i]);
                    }

                    // Add in an option to do nothing (i.e. skip this plugin)
                    var skipChar = Object.keys(options).length + 1;
                    console.log(clc.red('  ' + skipChar + ')') + ' Don\'t update\n');

                    options[skipChar] = false;

                    // Prompt the user for some input
                    var answer = query('Install', Object.keys(options).join(''));
                    var version = options[answer];

                    // Throw in a new line
                    console.log('');

                    // We have a new version requested so take some action
                    if(version) {

                        // Uninstall the current version
                        var pluginRemove = exec('cordova plugin remove '+name+' --save', {
                            silent: !verbose
                        });

                        if(pluginRemove.code === 0) {
                            // Install the new version
                            var pluginAdd = exec('cordova plugin add '+name+'@'+version+' --save', {
                                silent: !verbose
                            });

                            if(pluginAdd.code === 0) {
                                updatedPlugins.push({
                                    name: name,
                                    oldVersion: pluginPackage.version,
                                    newVersion: version
                                });
                            }
                            else {
                                console.log('Error adding plugin: ' + name);
                            }
                        }
                        else {
                            console.log('Error removing plugin: ' + name);
                        }
                    }   
                }        
            }
            else {
                console.log('Error checking npm versions for `' + name + '`');
            }
        }
        catch (error) {
            console.log('Error loading package.json for `'+name+'`')
        }
    });

    // Print out a summary of what has been done

    console.log('');

    updatedPlugins.forEach(function(plugin) {
        console.log(plugin.name + ' (' + clc.red(plugin.oldVersion) + ' => ' + clc.green(plugin.newVersion) + ')');
    });
    
}
else {
    console.log('No plugins found');
}

