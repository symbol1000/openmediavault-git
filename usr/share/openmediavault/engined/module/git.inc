<?php
/**
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @author     OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright  Copyright (c) 2011-2012 Ian Moore
 * @copyright  Copyright (c) 2012 Marcel Beck
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
 *
 */
require_once("openmediavault/module.inc");
require_once("openmediavault/config.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/initscript.inc");

class OMVModuleGit extends OMVModuleServiceAbstract
    implements OMVINotifyListener, OMVIModuleServiceStatus {

    /**
     * Get the module name.
     */
    public function getName() {
        return "Git";
    }

    /**
     * Get the module status.
     */
    public function getStatus() {
        global $xmlConfig;

        // Get the configuration object
        $xpath  = "//services/git";
        $object = $xmlConfig->get($xpath);
        if (is_null($object)) {
            throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
        }

        // This is the best I could do
        $cmd = sprintf("sudo /bin/sh -c '[ -f /etc/nginx/openmediavault-webgui.d/git.conf ] && echo ok'");
        OMVUtil::exec($cmd, $output, $result);
        return array(
            "name" => $this->getName(),
            "title" => gettext("Git Web Service"),
            "enabled" => boolval($object['enable']),
            "running" => ! empty($output[0])
        );
    }

    /**
     * Update the service.
     */
    public function applyConfig() {

        global $xmlConfig;

        // Create gitweb file
        $cmd = "sudo omv-mkconf git 2>&1";
        OMVUtil::exec($cmd, $output, $result);
        if ($result !== 0) {
            throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
        }

        // Create privileges file
        $cmd = "sudo omv-mkconf git-privileges 2>&1";
        OMVUtil::exec($cmd, $output, $result);
        if ($result !== 0) {
            throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
        }

        $xpath = "//services/git";
        $object = $xmlConfig->get($xpath);

        if(is_null($object)) {
            throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
        }
        if(FALSE === boolval($object['enable']))
            return;

    }

    /**
     * Bind listeners.
     */
    function bindListeners(OMVNotifyDispatcher $dispatcher)
    {
        /* Update service if configuration has been modified */
        $dispatcher->addListener(OMV_NOTIFY_MODIFY, "org.openmediavault.services.git", array($this, "setDirty"), 1);

        /* Repo events */
        $dispatcher->addListener(OMV_NOTIFY_CREATE | OMV_NOTIFY_MODIFY, "org.openmediavault.services.git.repos.repo", array($this, "setDirty"), 1);

        /* Listen for repo privileges events */
        $dispatcher->addListener(OMV_NOTIFY_MODIFY, "org.openmediavault.services.git.repos.repo.privileges", array($this, "setDirty"), 1);

        /* Listen for user events */
        $dispatcher->addListener(OMV_NOTIFY_CREATE | OMV_NOTIFY_MODIFY, "org.openmediavault.system.usermanagement.users.user", array($this, "setDirty"));

        /* Listen for group events */
        $dispatcher->addListener(OMV_NOTIFY_DELETE, "org.openmediavault.system.usermanagement.groups.group", array($this, "setDirty"));
    }

}

// Register module
$moduleMgr = &OMVModuleMgr::getInstance();
$moduleMgr->registerModule(new OMVModuleGit());

?>
