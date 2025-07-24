"use client";

import { useAuthBase } from "./use-auth-base";

interface ClaudeUser {
	id: string;
	email: string;
	name: string;
	organization_id?: string;
	claude_pro?: boolean;
	model_access?: string[];
	usage_tier?: string;
	workspaces?: Array<{
		id: string;
		name: string;
		role: string;
	}>;
	current_workspace_id?: string;
	projects?: Array<{
		id: string;
		name: string;
		created_at: string;
	}>;
	active_project_id?: string;
}

/**
 * Refactored Anthropic authentication hook with enhanced features
 * Provides advanced authentication functionality for Anthropic/Claude services
 */
export function useAnthropicAuthRefactored() {
	const baseAuth = useAuthBase({
		statusEndpoint: "/api/auth/anthropic/status",
		loginEndpoint: "/api/auth/anthropic/login",
		logoutEndpoint: "/api/auth/anthropic/logout",
		refreshEndpoint: "/api/auth/anthropic/refresh",
		provider: "anthropic",
	});

	const claudeUser = baseAuth.user as ClaudeUser | null;

	// Claude-specific methods
	const getAvailableClaudeModels = () => {
		return claudeUser?.model_access || [];
	};

	const hasClaudePro = () => {
		return claudeUser?.claude_pro || false;
	};

	const getUsageTier = () => {
		return claudeUser?.usage_tier || "free";
	};

	const authenticateWithClaudeAPIKey = async (apiKey: string) => {
		return await baseAuth.actions.login({
			api_key: apiKey,
			auth_type: "api_key",
			provider: "anthropic",
		});
	};

	const getWorkspaces = () => {
		return claudeUser?.workspaces || [];
	};

	const getCurrentWorkspace = () => {
		const workspaces = getWorkspaces();
		return workspaces.find((ws) => ws.id === claudeUser?.current_workspace_id) || null;
	};

	const getProjects = () => {
		return claudeUser?.projects || [];
	};

	const getActiveProject = () => {
		const projects = getProjects();
		return projects.find((proj) => proj.id === claudeUser?.active_project_id) || null;
	};

	return {
		// Base auth properties
		authenticated: baseAuth.authenticated,
		loading: baseAuth.loading,
		error: baseAuth.error,
		user: claudeUser,
		token: baseAuth.token,

		// Base auth actions
		login: baseAuth.actions.login,
		logout: baseAuth.actions.logout,
		refresh: baseAuth.actions.refresh,
		checkAuth: baseAuth.actions.checkAuth,
		clearError: baseAuth.actions.clearError,

		// Claude-specific methods
		getAvailableClaudeModels,
		hasClaudePro,
		getUsageTier,
		authenticateWithClaudeAPIKey,
		getWorkspaces,
		getCurrentWorkspace,
		getProjects,
		getActiveProject,
	};
}
