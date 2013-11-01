<?php
/**
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @author     OpenMediaVault Plugin Developers <plugins@omv-extras.org>
 * @copyright  Copyright (c) 2011-2012 Ian Moore
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

require_once("openmediavault/object.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/rpc.inc");
require_once("openmediavault/notify.inc");

class OMVRpcServiceGit extends OMVRpcServiceAbstract {

	public function getName() {
		return "Git";
	}

	public function initialize() {
		$this->registerMethod("getSettings");
		$this->registerMethod("setSettings");
		$this->registerMethod("deleteRepo");
		$this->registerMethod("getRepos");
		$this->registerMethod("setRepo");
		$this->registerMethod("getRepo");
		$this->registerMethod("getPrivileges");
		$this->registerMethod("setPrivileges");
	}
    
	public function getSettings($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		
		// Get the configuration object.
		$xpath = "//services/git";
		$object = $xmlConfig->get($xpath);
		if(is_null($object)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED,
			  $xpath);
		}

		// Modify the result object.
		$object['enable'] = boolval($object['enable']);
        $object['gitweb-enable'] = boolval($object['gitweb-enable']);
        $object['gitweb-anon'] = boolval($object['gitweb-anon']);
		$object['showtab'] = boolval($object['showtab']);

		return $object;
	}

	public function setSettings($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
			"type":"object",
			"properties":{
                "enable":{"type":"boolean"},
				"gitweb-enable":{"type":"boolean"},
				"gitweb-anon":{"type":"boolean"},
				"realm":{"type":"string"},
				"repository-root":{"type":"string","optional":true},
				"mntentref":{' . $GLOBALS['OMV_JSONSCHEMA_UUID'] . '},
                "showtab":{"type":"boolean"}
			}
		}');
		
		$xpath = sprintf("//system/fstab/mntent[uuid='%s']", $params['mntentref']);
        $deviceDir = $xmlConfig->get($xpath);
        $deviceDir = $deviceDir['dir'];

        $repoFolder = "{$deviceDir}/git-repos";
        $params['repository-root'] = $repoFolder;

        $econf = $this->get();
        
		// Don't change repo root if we have existing repos
		if (is_array($econf['repos']) && count($econf['repos']) && $econf['repository-root'] != $params['repository-root']) {
			throw new Exception("Refusing to chnage repository root while repositories exist.");
		}

		// Create repo root
		if ($econf['repository-root'] != $params['repository-root']) {
			// Ultimately files / folders must be readable / writable by apache.
			$cmd = "sudo /bin/sh -c '[ -d {$params['repository-root']} ] || /bin/mkdir -p {$params['repository-root']}; chown www-data:openmediavault {$params['repository-root']}; chmod 750 {$params['repository-root']}'";
			OMVUtil::exec($cmd, $output, $result);
			
            if ($result !== 0) {
				throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
			}

		}
        
        // Prepare configuration data
        $object = array(
            "enable" => array_boolval($params, 'enable'),
            "gitweb-enable" => array_boolval($params, 'gitweb-enable'),
            "gitweb-anon" => array_boolval($params, 'gitweb-anon'),
			"realm" => $params['realm'],
			"repository-root" => $params['repository-root'],
			"mntentref" => $params['mntentref'],
			"repos" => (isset($econf['repos']) ? $econf['repos'] : array()),
            "showtab" => array_boolval($params, 'showtab')
        );

        // Set configuration object
        if (false === $xmlConfig->replace("//services/git", $object))
            throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED, $this->getXpath());

        // Notify configuration changes
        $dispatcher = &OMVNotifyDispatcher::getInstance();
        $dispatcher->notify(OMV_NOTIFY_MODIFY, "org.openmediavault.services.git", $object);

        return $object;
	}

	public function deleteRepo($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
            "type":"object",
            "properties":{
                "uuid":{'.$GLOBALS['OMV_JSONSCHEMA_UUID'].'}
            }
        }');
		
        // Get configuration object for notification
		$xpath = sprintf("//services/git/repos/repo[uuid='%s']", $params['uuid']);
		$object = $xmlConfig->get($xpath);
        
		// Remove the folder
		$repoFolder = $this->configGet("//services/git/repository-root") . "/" . $object['name'];
		// These must match!!!
		if (realpath($repoFolder) == $repoFolder)
		{
			$cmd = "sudo su - www-data -c 'rm -rf {$repoFolder} 2>&1'";
			OMVUtil::exec($cmd, $output, $res);
			if ($res !== 0)
			{
				throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
			}
		}
        
        // Delete the configuration object.
		return $this->deleteConfigObjectByPath($xpath,
		  "org.openmediavault.services.git.repos.repo");
	}

	public function getRepos($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
            "type":"object",
            "properties":{
                "start":{"type":"integer"},
                "limit":{'.$GLOBALS['OMV_JSONSCHEMA_COUNTFIELD'].'},
                "sortfield":{'.$GLOBALS['OMV_JSONSCHEMA_SORTFIELD'].'},
                "sortdir":{'.$GLOBALS['OMV_JSONSCHEMA_SORTDIR'].'}
            }
        }');
		// Get configuration data.
		$xpath = "//services/git/repos/repo";
		$objects = $xmlConfig->getList($xpath);
        $gitroot = $this->configGet("//services/git/repository-root") . "/";
		if(is_null($objects)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
		}

		// Add path info
		foreach ($objects as $objectk => &$objectv) {
			$objectv['path'] = $gitroot . $objectv['name'];
		}
		
		// Filter the result.
		return $this->applyFilter($objects, $params['start'], $params['limit'],
		  $params['sortfield'], $params['sortdir']);
	}

	public function setRepo($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array(
			  "role" => OMV_ROLE_ADMINISTRATOR
		  ));
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
            "type":"object",
            "properties":{
                "uuid":{' . $GLOBALS['OMV_JSONSCHEMA_UUID_UNDEFINED'] . '},
				"comment":{"type":"string"},
				"default-access":{"type":"string","enum":["none","read-only","write"]},
				"name":{
					"type":"string",
					"format":"regex",
					"pattern":"/^[a-z0-9_\\\\-][a-z0-9_\\\\-\\\\.]+$/i"
				}
            }
		}');
        
		// Prepare configuration data
		$object = array(
			"uuid" => ($params['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED']) ? OMVUtil::uuid() : $params['uuid'],
			"name" => trim($params['name']),
			"default-access" => @$params['default-access'],
			"comment" => $params['comment']
		);

		// Set configuration data
        $success = FALSE;
		if ($params['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED']) {

			// Check uniqueness
			if (TRUE === $this->configExists("//services/git/repos/repo[name='{$object['name']}']")) {
				throw new OMVException(OMVErrorMsg::E_CONFIG_OBJECT_UNIQUENESS);
			}

			// Initialize repo
			$path = $this->configGet("//services/git/repository-root") . "/{$object['name']}";

			// If this isn't an existing repository, create it
			if (! file_exists($path)) {
				$cmd = "sudo su - www-data -c 'git init --bare {$path} 2>&1'";
				OMVUtil::exec($cmd, $output, $res);
				if ($res !== 0) {
					throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
				}

				$cmd = "sudo su - www-data -c 'cd {$path} && git update-server-info 2>&1'";
				OMVUtil::exec($cmd, $output, $res);
				if ($res !== 0) {
					throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
				}
			}

			// add perms array
			$object['privileges'] = array();

			// Append object to configuration
			$this->configSet("//services/git/repos", array("repo" => $object));
		} else {
			// Update existing configuration object
			$success = $xmlConfig->replace("//services/git/repos/repo[uuid='{$params['uuid']}']", $object);

			// Need path to repo
			$path = $this->configGet("//services/git/repository-root") . "/" . $object['name'];
		}
        
		if(FALSE === $success) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED);
		}        

		// Set description
		$cmd = 'sudo bash -c "echo ' . escapeshellarg($params['comment']) . " > {$path}/description\" 2>&1";
		OMVUtil::exec($cmd, $output, $res);
		if ($res !== 0) {
			throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
		}

		// Notify configuration changes
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(($params['uuid'] == $GLOBALS['OMV_UUID_UNDEFINED']) ? 
            OMV_NOTIFY_CREATE : OMV_NOTIFY_MODIFY, 
            "org.openmediavault.services.git.repos.repo", $object);
        
        // Return the configuration object.        
        return $object;
	}

    public function getRepo($params, $context) {
		global $xmlConfig;
		
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array("role" => OMV_ROLE_ADMINISTRATOR));
		
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
			  "type":"object",
			  "properties":{
				  "uuid":{'.$GLOBALS['OMV_JSONSCHEMA_UUID'].'}
			  }
		  }');

		  // Get the configuration object.
		$xpath = sprintf("//services/git/repos/repo[uuid='%s']", $params['uuid']);
		$object = $xmlConfig->get($xpath);
		if(is_null($object)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
		}

		return $object;
	}

	function getPrivileges($params, $contex) {
		global $xmlConfig;
		
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array("role" => OMV_ROLE_ADMINISTRATOR));
		
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
            "type": "object",
            "properties": {
                "uuid":{'.$GLOBALS['OMV_JSONSCHEMA_UUID'].'}
			}
		}');

		// Get the configuration object.
		$xpath = sprintf("//services/git/repos/repo[uuid='%s']", $params['uuid']);
		$object = $xmlConfig->get($xpath);
		if(is_null($object)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
		}
        
        // Prepare result object.
		$result = array();

		// Process non-system users.
		$users = OMVRpc::exec("UserMgmt", "enumerateUsers", NULL, $context);
		foreach($users as $userk => $userv) {
			$privilege = array(
				"type" => "user",
				"name" => $userv['name'],
				"perms" => NULL
			);
			// Check if there are any configured privileges for the
			// given user.
			if(!empty($object['privileges']['privilege'])) {
				foreach($object['privileges']['privilege'] as $objectv) {
					if(($objectv['type'] === $privilege['type']) &&
					  ($objectv['name'] === $privilege['name'])) {
						$privilege['perms'] = intval($objectv['perms']);
						break;
					}
				}
			}
			$result[] = $privilege;
		}
		// Process non-system groups.
		$groups = OMVRpc::exec("UserMgmt", "enumerateGroups", NULL, $context);
		foreach($groups as $groupk => $groupv) {
			$privilege = array(
				"type" => "group",
				"name" => $groupv['name'],
				"perms" => NULL
			);
			// Check if there are any configured privileges for the
			// given group.
			if(!empty($object['privileges']['privilege'])) {
				foreach($object['privileges']['privilege'] as $objectv) {
					if(($objectv['type'] === $privilege['type']) &&
					  ($objectv['name'] === $privilege['name'])) {
						$privilege['perms'] = intval($objectv['perms']);
						break;
					}
				}
			}
			$result[] = $privilege;
		}

		return $result;
	}

	function setPrivileges($params, $context) {
		global $xmlConfig;
		// Validate the RPC caller context.
		$this->validateMethodContext($context, array( "role" => OMV_ROLE_ADMINISTRATOR ));
		// Validate the parameters of the RPC service method.
		$this->validateMethodParams($params, '{
            "type":"object",
            "properties":{
                "uuid":{'.$GLOBALS['OMV_JSONSCHEMA_UUID'].'},
				"privileges":{
					"type":"array",
					"items":{
						"type":"object",
						"properties":{
							"name":{"type":"string"},
							"perms":{"type":"integer","enum":[0,5,7]},
							"type":{"type":"string","enum":["user","group"]}
						}
					}
				}
			}
		}');
        
		// Get shared folder configuration object.
		$xpath = sprintf("//services/git/repos/repo[uuid='%s']", $params['uuid']);
		$object = $xmlConfig->get($xpath);
		if(is_null($object)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
		}
		// Reset the shared folders privileges.
		$object['privileges'] = array();
		// Prepare the shared folders privileges.
		foreach($params['privileges'] as $privilegek => $privilegev) {
			// Skip entries with perms = NULL. It seems they are not detected
			// by the JSON schema validation.
			if(is_null($privilegev['perms']))
				continue;
			// Do some checks ...
			switch($privilegev['type']) {
			case "user":
				// Check if user exists
				$user = new OMVUser($privilegev['name']);
				if(!$user->exists()) {
					throw new OMVException(OMVErrorMsg::E_MISC_FAILURE,
					  sprintf(gettext("The user '%s' does not exist"),
					  $user->getName()));
				}
				// Is user allowed? It does not make sense to give the WebGUI
				// administrator permissions for a shared folder.
				if(in_array($user->getName(), array("admin"))) {
					throw new OMVException(OMVErrorMsg::E_MISC_FAILURE,
					  sprintf(gettext("The user '%s' is not allowed"),
					  $user->getName()));
				}
				break;
			case "group":
				// Check if group exists.
				$group = new OMVUserGroup($privilegev['name']);
				if(!$group->exists()) {
					throw new OMVException(OMVErrorMsg::E_MISC_FAILURE,
					  sprintf(gettext("The group '%s' does not exist"),
					  $group->getName()));
				}
				break;
			}
			// Finally add privilege to shared folder privileges.
			$object['privileges']['privilege'][] = array(
                "type" => $privilegev['type'],
				"name" => $privilegev['name'],
				"perms" => $privilegev['perms']
			);
		}
		// Update existing configuration object.
		$xpath = sprintf("//services/git/repos/repo[uuid='%s']", $params['uuid']);
		if(FALSE === $xmlConfig->replace($xpath, $object)) {
			throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED);
		}
		// Notify configuration changes.
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(OMV_NOTIFY_MODIFY,
            "org.openmediavault.service.git.repos.repo.privileges",
            $object);

		// Return the configuration object.
		return $object;
	}
}

?>