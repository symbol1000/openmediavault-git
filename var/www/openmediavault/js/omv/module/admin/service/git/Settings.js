/**
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @author     OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright  Copyright (c) 2011 Ian Moore
 * @copyright  Copyright (c) 2012 Marcel Beck
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
// require("js/omv/workspace/window/Form.js")
// require("js/omv/data/Store.js")
// require("js/omv/data/Model.js")
// require("js/omv/data/proxy/Rpc.js")
// require("js/omv/workspace/window/plugin/ConfigObject.js")
// require("js/omv/form/field/SharedFolderComboBox.js")

/**
 * @class OMV.module.admin.service.git.Settings
 * @derived OMV.workspace.form.Panel
 */
Ext.define("OMV.module.admin.service.git.Settings", {
    extend: "OMV.workspace.form.Panel",

    rpcService: "Git",
    rpcGetMethod: "getSettings",
    rpcSetMethod: "setSettings",

    plugins: [{
        ptype: "linkedfields",
        correlations: [{
            name: [
                "launch-gitweb"
            ],
            conditions: [{
                name: "gitweb-enable",
                value: true
            },{
                name: "enable",
                value: true
            }],
            properties: [
                "enabled"
            ]
        }]
    }],
    
    initComponent : function () {
        var me = this;

        me.on('load', function () {
            var checked = me.findField('enable').checked;
            var showtab = me.findField('showtab').checked;
            var parent = me.up('tabpanel');

            if (!parent)
                return;

            var repoPanel = parent.down('panel[title=' + _("Repositories") + ']');
            var gitWebPanel = parent.down('panel[title=' + _("GitWeb") + ']');
            
            if (repoPanel) {
                checked ? repoPanel.enable() : repoPanel.disable();
            }
            
            if (gitWebPanel) {
                checked ? gitWebPanel.enable() : gitWebPanel.disable();
                showtab ? gitWebPanel.tab.show() : gitWebPanel.tab.hide();
            }
        });

        me.callParent(arguments);
    },


    getFormItems:function () {
        return [{
            xtype: "fieldset",
            title: _("General settings"),
            defaults: {
                labelSeparator: ""
            },
            items: [{
                xtype: "checkbox",
                name: "enable",
                fieldLabel: _("Enable"),
                checked: false
            },{
                xtype: "checkbox",
                name: "symlinks-enable",
                fieldLabel: _("Symbolic links"),
                boxLabel: _("Enable automatic creation of symbolic links in users homefolder to permitted repositories."),
                checked: false
            },{
                xtype: "textfield",
                name: "realm",
                fieldLabel: _("Realm Name"),
                allowBlank: false,
                value: "Git Repository on Open Media Vault",
                plugins: [{
                    ptype: "fieldinfo",
                    text: _("Authentication realm.")
                }]
            },{
                xtype: "combo",
                name: "mntentref",
                fieldLabel: _("Database Volume"),
                emptyText: _("Select a volume ..."),
                allowBlank: false,
                allowNone: false,
                editable: false,
                triggerAction: "all",
                displayField: "description",
                valueField: "uuid",
                store: Ext.create("OMV.data.Store", {
                    autoLoad: true,
                    model: OMV.data.Model.createImplicit({
                        idProperty: "uuid",
                        fields: [
                            { name: "uuid", type: "string" },
                            { name: "devicefile", type: "string" },
                            { name: "description", type: "string" }
                        ]
                    }),
                    proxy: {
                        type: "rpc",
                        rpcData: {
                            service: "ShareMgmt",
                            method: "getCandidates"
                        },
                        appendSortParams: false
                    },
                    sorters: [{
                        direction: "ASC",
                        property: "devicefile"
                    }]
                }),
                plugins: [{
                    ptype: "fieldinfo",
                    text: _("Database files will move to new location if database volume is changed.")
                }]
            },{
                xtype: "textfield",
                name: "repository-root",
                fieldLabel: _("Repository root"),
                allowNone: true,
                readOnly: true
            }]
        },{
            xtype:'fieldset',
            title:_('GitWeb'),
            fieldDefaults: {
                labelSeparator: ""
            },
            items:[{
                xtype: "checkbox",
                name: "gitweb-enable",
                fieldLabel: _("Enable"),
                boxLabel: _("Enable read-only repository content and history browsing through GitWeb"),
                checked: false
            },{
                xtype: "checkbox",
                name: "gitweb-anon",
                fieldLabel: _("Allow anonymous access"),
                boxLabel: _("Users do not have to log in to view GitWeb"),
                checked: false
            },{
                xtype: "checkbox",
                name: "showtab",
                fieldLabel: _("Show Tab"),
                boxLabel: _("Show tab containing GitWeb frame"),
                checked: false
            },{
                xtype: "button",
                name: "launch-gitweb",
                text: _("Launch GitWeb"),
                disabled: true,
                handler: function() {
                    window.open("/git/");
                }
            },{
                border : false,
                html   : "<p/>"
            }]
        }];
    }
});

OMV.WorkspaceManager.registerPanel({
    id: "settings",
    path: "/service/git",
    text: _("Settings"),
    position: 10,
    className: "OMV.module.admin.service.git.Settings"
});
