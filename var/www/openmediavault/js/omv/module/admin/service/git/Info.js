/**
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright  Copyright (c) 2013 OpenMediaVault Plugin Developers 
 *
 * This file is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This file is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this file. If not, see <http://www.gnu.org/licenses/>.
 *
 */
// require("js/omv/WorkspaceManager.js")
// require("js/omv/workspace/form/Panel.js")

/**
 * @class OMV.module.admin.service.git.Info
 * @derived OMV.workspace.form.Panel
 */
Ext.define("OMV.module.admin.service.git.Info", {
    extend: "OMV.workspace.form.Panel",

autoLoadData    : false,
    hideOkButton    : true,
    hideResetButton : true,
    mode            : "local",

    getFormItems : function() {
        var me = this;

        return [{
            /* Git info */
            xtype : "fieldset",
            layout : "fit",
            items : [{
                border  : false,
                html    : '<h3>Git</h3>'
                        + '<p>'
                        + 'Git is a distributed version control system.'
                        + '</p>'
                        + '<h3>First time use</h3>'
                        + '<h4>OMV</h4>'
                        + '<p>'
                        + '<ol>'
                        + '<li>'
                        + 'You must have a user made for your OMV. (root can not be used for git http access). To add a user to your OMV go to Access Right Management / User.'
                        + '</li>'
                        + '<li>'
                        + 'Return to Git plugin.'
                        + '</li>'
                        + '<li>'
                        + 'On the Settings tab: Select a Repository Volume and enable Git.'
                        + '</li>'
                        + '<li>'
                        + 'On the Repositories tab: Add a repository and set the privilege level to "Read / Write".'
                        + '</li>'
                        + '</ol>'
                        + '</p>'
                        + '<h4>Linux workstation</h4>'
                        + '<p>'
                        + '<ol>'
                        + '<li>'
                        + 'Go to a folder where the repository should be set up as a subdirectory.'
                        + '</li>'
                        + '<li>'
                        + 'In terminal run: "git clone http://username@192.168.1.123/git/repositoryname" You will be asked for your password. You will also get a warning: "You appear to have cloned an empty repository." This is normal.'
                        + '</li>'
                        + '<li>'
                        + 'In terminal run: "cd repositoryname". Now you are in your git repository.'
                        + '</li>'
                        + '<li>'
                        + 'After you have made some changes and commits you want to push your changes to the server. In terminal run: "git push -u origin master". You will be asked for your password.'
                        + '</li>'
                        + '</ol>'
                        + '</p>'
                        + '<h3>Repository Privileges</h3>'
                        + '<p>'
                        + 'The privileges settings refer to the users that are setup for your OMV. All connections to the repository are confirmed with username/password.'
                        + '</p>'
                        + '<p>'
                        + 'Default privilege level affects all OMV users. It is also possible to set privileges for individual OMV users and groups.'
                        + '</p>'
                        + '<p>'
                        + 'If you wish to prevent access to a repository for a single user you have to set the value "No access" for the user and every group that the user is in.'
                        + '</p>'
            }]
        }];
    }

});

OMV.WorkspaceManager.registerPanel({
    id        : "info",
    path      : "/service/git",
    text      : _("Info"),
    position  : 30,
    className : "OMV.module.admin.service.git.Info"
});
