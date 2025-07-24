/**
 * OpenTelemetry Production Configuration
 *
 * Production-ready observability configuration with exporters
 */

export interface ObservabilityConfig {
	tracing: {
		enabled: boolean;
		serviceName: string;
		serviceVersion: string;
		samplingRatio: number;
		exporters: {
			otlp: {
				enabled: boolean;
				endpoint: string;
				headers: Record<string, string>;
			};
			jaeger: {
				enabled: boolean;
				endpoint: string;
			};
			console: {
				enabled: boolean;
			};
		};
	};
	metrics: {
		enabled: boolean;
		collectInterval: number;
		exporters: {
			otlp: {
				enabled: boolean;
				endpoint: string;
				headers: Record<string, string>;
			};
			prometheus: {
				enabled: boolean;
				endpoint: string;
				port: number;
			};
		};
	};
	logging: {
		level: "debug" | "info" | "warn" | "error";
		structured: boolean;
		exporters: {
			console: boolean;
			file: {
				enabled: boolean;
				path: string;
				maxSize: string;
				maxFiles: number;
			};
			elasticsearch: {
				enabled: boolean;
				endpoint: string;
				index: string;
			};
		};
	};
	alerting: {
		enabled: boolean;
		channels: {
			slack: {
				enabled: boolean;
				webhookUrl: string;
				channel: string;
			};
			email: {
				enabled: boolean;
				smtpConfig: {
					host: string;
					port: number;
					secure: boolean;
					auth: {
						user: string;
						pass: string;
					};
				};
				recipients: string[];
			};
			webhook: {
				enabled: boolean;
				url: string;
				headers: Record<string, string>;
			};
		};
		rules: {
			errorRate: {
				threshold: number;
				window: number;
			};
			responseTime: {
				threshold: number;
				percentile: number;
			};
			availability: {
				threshold: number;
				window: number;
			};
		};
	};
}

export const getObservabilityConfig = (): ObservabilityConfig => {
	const environment = process.env.NODE_ENV || "development";

	const baseConfig: ObservabilityConfig = {
		tracing: {
			enabled: true,
			serviceName: process.env.SERVICE_NAME || "vibex-app",
			serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
			samplingRatio: 1.0,
			exporters: {
				otlp: {
					enabled: false,
					endpoint: process.env.OTLP_ENDPOINT || "",
					headers: {},
				},
				jaeger: {
					enabled: false,
					endpoint: process.env.JAEGER_ENDPOINT || "",
				},
				console: {
					enabled: true,
				},
			},
		},
		metrics: {
			enabled: true,
			collectInterval: 30000, // 30 seconds
			exporters: {
				otlp: {
					enabled: false,
					endpoint: process.env.OTLP_METRICS_ENDPOINT || "",
					headers: {},
				},
				prometheus: {
					enabled: false,
					endpoint: "/metrics",
					port: 9090,
				},
			},
		},
		logging: {
			level: "info",
			structured: true,
			exporters: {
				console: true,
				file: {
					enabled: false,
					path: "./logs/app.log",
					maxSize: "10MB",
					maxFiles: 5,
				},
				elasticsearch: {
					enabled: false,
					endpoint: process.env.ELASTICSEARCH_ENDPOINT || "",
					index: "vibex-logs",
				},
			},
		},
		alerting: {
			enabled: false,
			channels: {
				slack: {
					enabled: false,
					webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
					channel: "#alerts",
				},
				email: {
					enabled: false,
					smtpConfig: {
						host: process.env.SMTP_HOST || "",
						port: Number.parseInt(process.env.SMTP_PORT || "587"),
						secure: false,
						auth: {
							user: process.env.SMTP_USER || "",
							pass: process.env.SMTP_PASS || "",
						},
					},
					recipients: process.env.ALERT_RECIPIENTS?.split(",") || [],
				},
				webhook: {
					enabled: false,
					url: process.env.ALERT_WEBHOOK_URL || "",
					headers: {},
				},
			},
			rules: {
				errorRate: {
					threshold: 0.05, // 5%
					window: 300000, // 5 minutes
				},
				responseTime: {
					threshold: 2000, // 2 seconds
					percentile: 95,
				},
				availability: {
					threshold: 0.99, // 99%
					window: 900000, // 15 minutes
				},
			},
		},
	};

	// Environment-specific overrides
	switch (environment) {
		case "production":
			return {
				...baseConfig,
				tracing: {
					...baseConfig.tracing,
					samplingRatio: 0.1, // Sample 10% in production
					exporters: {
						otlp: {
							enabled: true,
							endpoint: process.env.OTLP_ENDPOINT || "https://api.honeycomb.io",
							headers: {
								"x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
							},
						},
						jaeger: {
							enabled: false,
							endpoint: "",
						},
						console: {
							enabled: false,
						},
					},
				},
				metrics: {
					...baseConfig.metrics,
					collectInterval: 15000, // More frequent in production
					exporters: {
						otlp: {
							enabled: true,
							endpoint: process.env.OTLP_METRICS_ENDPOINT || "https://api.honeycomb.io",
							headers: {
								"x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
							},
						},
						prometheus: {
							enabled: true,
							endpoint: "/metrics",
							port: 9090,
						},
					},
				},
				logging: {
					level: "warn",
					structured: true,
					exporters: {
						console: false,
						file: {
							enabled: true,
							path: "./logs/app.log",
							maxSize: "100MB",
							maxFiles: 10,
						},
						elasticsearch: {
							enabled: true,
							endpoint: process.env.ELASTICSEARCH_ENDPOINT || "",
							index: "vibex-prod-logs",
						},
					},
				},
				alerting: {
					enabled: true,
					channels: {
						slack: {
							enabled: true,
							webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
							channel: "#production-alerts",
						},
						email: {
							enabled: true,
							smtpConfig: {
								host: process.env.SMTP_HOST || "",
								port: Number.parseInt(process.env.SMTP_PORT || "587"),
								secure: true,
								auth: {
									user: process.env.SMTP_USER || "",
									pass: process.env.SMTP_PASS || "",
								},
							},
							recipients: process.env.ALERT_RECIPIENTS?.split(",") || [],
						},
						webhook: {
							enabled: false,
							url: "",
							headers: {},
						},
					},
					rules: {
						errorRate: {
							threshold: 0.01, // 1% - stricter in production
							window: 300000,
						},
						responseTime: {
							threshold: 1000, // 1 second - stricter in production
							percentile: 95,
						},
						availability: {
							threshold: 0.995, // 99.5%
							window: 900000,
						},
					},
				},
			};

		case "staging":
			return {
				...baseConfig,
				tracing: {
					...baseConfig.tracing,
					samplingRatio: 0.5, // Sample 50% in staging
					exporters: {
						otlp: {
							enabled: true,
							endpoint: process.env.OTLP_ENDPOINT || "",
							headers: {
								"x-honeycomb-team": process.env.HONEYCOMB_API_KEY || "",
							},
						},
						jaeger: {
							enabled: false,
							endpoint: "",
						},
						console: {
							enabled: false,
						},
					},
				},
				logging: {
					level: "info",
					structured: true,
					exporters: {
						console: true,
						file: {
							enabled: true,
							path: "./logs/staging.log",
							maxSize: "50MB",
							maxFiles: 5,
						},
						elasticsearch: {
							enabled: false,
							endpoint: "",
							index: "",
						},
					},
				},
				alerting: {
					enabled: true,
					channels: {
						slack: {
							enabled: true,
							webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
							channel: "#staging-alerts",
						},
						email: {
							enabled: false,
							smtpConfig: {
								host: "",
								port: 587,
								secure: false,
								auth: { user: "", pass: "" },
							},
							recipients: [],
						},
						webhook: {
							enabled: false,
							url: "",
							headers: {},
						},
					},
					rules: {
						errorRate: {
							threshold: 0.1, // 10% - more lenient in staging
							window: 300000,
						},
						responseTime: {
							threshold: 5000, // 5 seconds
							percentile: 95,
						},
						availability: {
							threshold: 0.95, // 95%
							window: 900000,
						},
					},
				},
			};

		case "development":
			return {
				...baseConfig,
				tracing: {
					...baseConfig.tracing,
					samplingRatio: 1.0, // Sample everything in development
				},
				logging: {
					level: "debug",
					structured: false,
					exporters: {
						console: true,
						file: {
							enabled: false,
							path: "",
							maxSize: "",
							maxFiles: 0,
						},
						elasticsearch: {
							enabled: false,
							endpoint: "",
							index: "",
						},
					},
				},
				alerting: {
					enabled: false,
					channels: {
						slack: { enabled: false, webhookUrl: "", channel: "" },
						email: {
							enabled: false,
							smtpConfig: { host: "", port: 587, secure: false, auth: { user: "", pass: "" } },
							recipients: [],
						},
						webhook: { enabled: false, url: "", headers: {} },
					},
					rules: {
						errorRate: { threshold: 1.0, window: 300000 },
						responseTime: { threshold: 10000, percentile: 95 },
						availability: { threshold: 0.5, window: 900000 },
					},
				},
			};

		default:
			return baseConfig;
	}
};

export const validateObservabilityConfig = (config: ObservabilityConfig): string[] => {
	const errors: string[] = [];

	if (!config.tracing.serviceName) {
		errors.push("Service name is required for tracing");
	}

	if (config.tracing.samplingRatio < 0 || config.tracing.samplingRatio > 1) {
		errors.push("Sampling ratio must be between 0 and 1");
	}

	if (config.metrics.collectInterval < 5000) {
		errors.push("Metrics collection interval must be at least 5 seconds");
	}

	if (config.alerting.enabled) {
		const hasEnabledChannel = Object.values(config.alerting.channels).some(
			(channel) => channel.enabled
		);
		if (!hasEnabledChannel) {
			errors.push("At least one alerting channel must be enabled when alerting is enabled");
		}
	}

	return errors;
};
