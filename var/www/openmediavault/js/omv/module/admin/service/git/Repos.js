/**
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @author     OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright  Copyright (c) 2011 Ian Moore
 * @copyright  Copyright (c) 2012 Marcel Beck
 * @copyright  Copyright (c) 2009-2013 Volker Theile
 * @copyright  Copyright (c) 2013-2014 OpenMediaVault Plugin Developers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
// require("js/omv/WorkspaceManager.js")
// require("js/omv/tree/Folder.js")
// require("js/omv/window/Window.js")
// require("js/omv/window/FolderBrowser.js")
// require("js/omv/grid/Privileges.js")
// require("js/omv/toolbar/Tip.js")
// require("js/omv/workspace/grid/Panel.js")
// require("js/omv/workspace/window/Form.js")
// require("js/omv/workspace/window/Grid.js")
// require("js/omv/workspace/window/plugin/ConfigObject.js")
// require("js/omv/data/Store.js")
// require("js/omv/data/Model.js")
// require("js/omv/data/proxy/Rpc.js")
// require("js/omv/form/CompositeField.js")
// require("js/omv/util/Format.js")
// require("js/omv/Rpc.js")

/**
 * @class OMV.module.admin.service.git.Repository
 * @derived OMV.workspace.window.Form
 */
Ext.define("OMV.module.admin.service.git.Repository", {
    extend   : "OMV.workspace.window.Form",
    requires : [
        "OMV.workspace.window.plugin.ConfigObject"
    ],

    rpcService   : "Git",
    rpcGetMethod : "getRepo",
    rpcSetMethod : "setRepo",
    plugins      : [{
        ptype : "configobject"
    }],

    getFormItems : function() {
        return [{
            xtype      : "textfield",
            name       : "name",
            fieldLabel : _("Name"),
            allowBlank : false,
            plugins    : [{
                ptype : "fieldinfo",
                text  : _("Repository name.")
            }]
        },{
            xtype      : "textfield",
            name       : "comment",
            fieldLabel : _("Description"),
            allowBlank : false
        },{
            xtype      : "combo",
            name       : "default-access",
            fieldLabel : _("Default privileges"),
            queryMode  : "local",
            store : [
                [ "none", _("No access") ],
                [ "read-only", _("Read-only") ],
                [ "write", _("Read / Write") ]
            ],
            editable      : false,
            allowBlank    :false,
            triggerAction : "all",
            value         : "none"
        }];
    }
});

/**
 * @class OMV.module.admin.service.git.Repositories
 * @derived OMV.workspace.grid.Panel
 */
Ext.define("OMV.module.admin.service.git.Repositories", {
    extend   : "OMV.workspace.grid.Panel",
    requires : [
        "OMV.Rpc",
        "OMV.data.Store",
        "OMV.data.Model",
        "OMV.data.proxy.Rpc"
    ],
    uses     : [
        "OMV.module.admin.service.git.Repository",
        "OMV.module.admin.service.git.Privileges" //
    ],

    hidePagingToolbar : false,
    stateful          : true,
    stateId           : "9889057b-b2c0-4c48-a4c1-8c9b4fb54d7b",
    columns           : [{
        text      : _("Name"),
        sortable  : true,
        dataIndex : "name",
        stateId   : "name"
    },{
        text      : _("Description"),
        sortable  : true,
        dataIndex : "comment",
        stateId   : "comment"
    },{
        text      : _("URL"),
        sortable  : true,
        dataIndex : "name",
        stateId   : "url",
        renderer  : this.urlRenderer
    },{
        text      : _("Default privilege level"),
        sortable  : true,
        dataIndex : "default-access",
        stateId   : "default-access",
        renderer  : this.prvRenderer
    }],

    initComponent : function () {
        var me = this;
        Ext.apply(me, {
            store : Ext.create("OMV.data.Store", {
                autoLoad : true,
                model    : OMV.data.Model.createImplicit({
                    idProperty  : "uuid",
                    fields      : [
                        { name : "uuid", type : "string" },
                        { name : "path", type : "string" },
                        { name : "default-access", type : "string" },
                        { name : "comment", type : "string" },
                        { name : "name", type : "string" }
                    ]
                }),
                proxy : {
                    type    : "rpc",
                    rpcData : {
                        service : "Git",
                        method  : "getRepos"
                    }
                }
            })
        });
        me.callParent(arguments);
    },

    getTopToolbarItems : function() {
        var me = this;
        var items = me.callParent(arguments);
        // Add the 'Privileges' button.
        Ext.Array.insert(items, 2, [{
            id       : me.getId() + "-privileges",
            xtype    : "button",
            text     : _("Privileges"),
            icon     : "images/group.png",
            iconCls  : Ext.baseCSSPrefix + "btn-icon-16x16",
            handler  : me.onPrivilegesButton,
            scope    : me,
            disabled : true
        }]);
        return items;
    },

    urlRenderer : function (val, cell, record, row, col, store) {
        var u = location.host + location.pathname + '/git/' + val;
        u = location.protocol + '//' + u.replace('//', '/');
        return '<a href="' + u + '" target="_blank">' + u + '</a>';
    },

    prvRenderer : function (val, cell, record, row, col, store) {
        switch (val) {
            case "read-only":
                val = _("Read-only");
                break;
            case "write":
                val = _("Read / Write");
                break;
            default:
                val = _("No access");
        }
        return val;
    },

    onAddButton : function () {
        var me = this;
        Ext.create("OMV.module.admin.service.git.Repository", {
            title     : _("Add repository"),
            uuid      : OMV.UUID_UNDEFINED,
            listeners : {
                scope  : me,
                submit : function () {
                    this.doReload();
                }
            }
        }).show();
    },

    onEditButton : function () {
        var me, record;

        me = this;
        record = me.getSelected();

        Ext.create("OMV.module.admin.service.git.Repository", {
            title     : _("Edit repository"),
            uuid      : record.get("uuid"),
            listeners : {
                scope  : me,
                submit : function () {
                    this.doReload();
                }
            }
        }).show();
    },

    onPrivilegesButton : function () {
        var me = this;
        var record = me.getSelected();
        Ext.create("OMV.module.admin.service.git.Privileges", {
            uuid : record.get("uuid")
        }).show();
    },

    onSelectionChange : function(model, records) {
        var me = this;
        me.callParent(arguments);
        // Process additional buttons.
        var tbarBtnName = [ "privileges", "edit", "delete" ];
        var tbarBtnDisabled = {
            "privileges": true,
            "edit": true,
            "delete": true
        };
        if(records.length <= 0) {
            tbarBtnDisabled["privileges"] = true;
            tbarBtnDisabled["edit"] = true;
            tbarBtnDisabled["delete"] = true;
        } else if(records.length == 1) {
            tbarBtnDisabled["privileges"] = false;
            tbarBtnDisabled["edit"] = false;
            tbarBtnDisabled["delete"] = false;
        } else {
            tbarBtnDisabled["privileges"] = true;
            tbarBtnDisabled["edit"] = true;
            tbarBtnDisabled["delete"] = true;
        }
        for(var i = 0; i < tbarBtnName.length; i++) {
            var tbarBtnCtrl = me.queryById(me.getId() + "-" + tbarBtnName[i]);
            if(!Ext.isEmpty(tbarBtnCtrl)) {
                if(true == tbarBtnDisabled[tbarBtnName[i]]) {
                    tbarBtnCtrl.disable();
                } else {
                    tbarBtnCtrl.enable();
                }
            }
        }
    },

    doDeletion : function (record) {
        var me = this;
        OMV.Rpc.request({
            scope    : me,
            callback : me.onDeletion,
            rpcData  : {
                service : "Git",
                method  : "deleteRepo",
                params  : {
                    uuid : record.get("uuid")
                }
            }
        });
    }

});

Ext.define("OMV.module.admin.service.git.Privileges", {
    extend : "OMV.workspace.window.Grid",
    uses   : [
        "OMV.Rpc",
        "OMV.module.admin.service.git.Privileges.grid", //"OMV.grid.Privileges",
        "OMV.workspace.window.plugin.ConfigObject"
    ],

    autoLoadData : false,
    rpcService   : "Git",
    rpcSetMethod : "setPrivileges",
    plugins      : [{
        ptype : "configobject"
    }],
    gridClassName : "OMV.module.admin.service.git.Privileges.grid", //"OMV.grid.Privileges",

    title  : _("Edit privileges"),
    width  : 550,
    height : 350,

    getGridConfig : function() {
        var me = this;
        return {
            border   : false,
            stateful : true,
            stateId  : "475eacf4-cadb-1234-b545-4f7f47d71234", //"475eacf4-cadb-4ae4-b545-4f7f47d7aed9",
            readOnly : me.readOnly,
            uuid     : me.uuid
        };
    },

    getRpcSetParams : function() {
        var me = this;
        var privileges = [];
        var items = me.getValues();
        Ext.Array.each(items, function(item) {
            if((true === item.deny) || (true === item.readonly) ||
              (true === item.writeable)) {
                var perms = 0; // No access
                if(true === item.readonly)
                    perms = 5;
                else if(true === item.writeable)
                    perms = 7;
                privileges.push({
                    type: item.type,
                    name: item.name,
                    perms: perms
                });
            }
        });
        return {
            privileges: privileges
        };
    }
});

Ext.define("OMV.module.admin.service.git.Privileges.grid", { //OMV.grid.Privileges
    extend   : "OMV.grid.Panel",
    //alias  : [ "widget.privilegesgrid" ],
    requires : [
        "Ext.grid.column.CheckColumn",
        "Ext.grid.feature.Grouping",
        "OMV.data.Store",
        "OMV.data.Model",
        "OMV.data.proxy.Rpc",
        "OMV.grid.column.BooleanText"
    ],

    autoLoadData     : true,
    readOnly         : false,
    hideSystemColumn : true,

    features         : [{
        ftype          : "grouping",
        groupHeaderTpl : "{renderedGroupValue}"
    }],

    initComponent : function() {
        var me = this;
        Ext.apply(me, {
            store: Ext.create("OMV.data.Store", {
                autoLoad   : me.autoLoadData,
                groupField : "system",
                model      : OMV.data.Model.createImplicit({
                    fields  : [
                        { name : "type", type : "string" },
                        { name : "name", type : "string" },
                        { name : "perms", type : "int" },
                        { name : "deny", type : "boolean", defaultValue: null },
                        { name : "readonly", type : "boolean", defaultValue: null },
                        { name : "writeable", type : "boolean", defaultValue: null },
                        { name : "system", type : "boolean" }
                    ]
                }),
                proxy : {
                    type             : "rpc",
                    appendSortParams : false,
                    extraParams      : {
                        uuid : me.uuid
                    },
                    rpcData : {
                        service : "Git",
                        method  : "getPrivileges"
                    }
                },
                sorters : [{
                    direction : "ASC",
                    property  : "name"
                }],
                listeners  : {
                    scope : me,
                    load  : function(store, records, successful, eOpts) {
                        Ext.Array.each(records, function(record) {
                            record.beginEdit();
                            switch(record.get("perms")) {
                            case 0:
                                record.set("deny", true);
                                break;
                            case 5:
                                record.set("readonly", true);
                                break;
                            case 7:
                                record.set("writeable", true);
                                break;
                            }
                            record.commit();
                            record.endEdit();
                        });
                        store.commitChanges();
                    }
                }
            }),
            columns : [{
                text      : _("Type"),
                sortable  : true,
                dataIndex : "type",
                stateId   : "type",
                align     : "center",
                width     : 60,
                resizable : false,
                renderer  : function(value, metaData) {
                    switch(value) {
                    case "user":
                        metaData.tdAttr = "data-qtip='" + _("User") + "'";
                        value = "<img border='0' src='images/user.png'>";
                        break;
                    case "group":
                        metaData.tdAttr = "data-qtip='" + _("Group") + "'";
                        value = "<img border='0' src='images/group.png'>";
                        break;
                    }
                    return value;
                }
            },{
                text      : _("Name"),
                sortable  : true,
                dataIndex : "name",
                stateId   : "name",
                flex      : 2
            },{
                xtype     : "checkcolumn",
                text      : _("Read/Write"),
                sortable  : true,
                groupable : false,
                dataIndex : "writeable",
                stateId   : "writeable",
                align     : "center",
                flex      : 1,
                listeners : {
                    scope       : me,
                    checkchange : me.onCheckChange
                }
            },{
                xtype     : "checkcolumn",
                text      : _("Read-only"),
                sortable  : true,
                groupable : false,
                dataIndex : "readonly",
                stateId   : "readonly",
                align     : "center",
                flex      : 1,
                listeners : {
                    scope       : me,
                    checkchange : me.onCheckChange
                }
            },{
                xtype     : "checkcolumn",
                text      : _("No access"),
                sortable  : true,
                groupable : false,
                dataIndex : "deny",
                stateId   : "deny",
                align     : "center",
                flex      : 1,
                listeners : {
                    scope       : me,
                    checkchange : me.onCheckChange
                }
            },{
                xtype     : "booleantextcolumn",
                text      : _("System"),
                sortable  : true,
                groupable : true,
                hidden    : me.hideSystemColumn,
                dataIndex : "system",
                stateId   : "system",
                align     : "center",
                flex      : 1
            }]
        });
        me.callParent(arguments);
    },

    onCheckChange : function(column, rowIndex, checked, eOpts) {
        var me = this;
        if(me.readOnly)
            return;
        var record = me.store.getAt(rowIndex);
        var fieldNames = [ "readonly", "writeable", "deny" ];
        // Clear all other fields except the current selected one.
        record.beginEdit();
        Ext.Array.each(fieldNames, function(fieldName) {
            if(fieldName === column.dataIndex)
                return;
            record.set(fieldName, false);
        });
        record.endEdit();
    }
});


OMV.WorkspaceManager.registerPanel({
    id        : "repos",
    path      : "/service/git",
    text      : _("Repositories"),
    position  : 20,
    className : "OMV.module.admin.service.git.Repositories"
});
