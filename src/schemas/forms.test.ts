import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import {
	type ContactForm,
	contactFormSchema,
	getFieldError,
	hasFieldError,
	type Login,
	loginSchema,
	type ProfileUpdate,
	profileUpdateSchema,
	type Search,
	searchSchema,
	type UserRegistration,
	userRegistrationSchema,
	validateSchema,
} from "./forms";

describe("userRegistrationSchema", () => {
	const validUser = {
		firstName: "John",
		lastName: "Doe",
		email: "john@example.com",
		password: "Password123",
		confirmPassword: "Password123",
		age: 25,
		terms: true,
		newsletter: false,
	};

	it("should validate a valid user registration", () => {
		const result = userRegistrationSchema.safeParse(validUser);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validUser);
		}
	});

	it("should reject invalid first name", () => {
		const invalidUser = { ...validUser, firstName: "J" };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject invalid last name", () => {
		const invalidUser = { ...validUser, lastName: "D" };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject invalid email", () => {
		const invalidUser = { ...validUser, email: "invalid-email" };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject weak password", () => {
		const invalidUser = {
			...validUser,
			password: "weak",
			confirmPassword: "weak",
		};
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject mismatched passwords", () => {
		const invalidUser = {
			...validUser,
			confirmPassword: "DifferentPassword123",
		};
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
		if (!result.success) {
			const error = result.error.issues.find((issue) =>
				issue.path.includes("confirmPassword"),
			);
			expect(error?.message).toBe("Passwords don't match");
		}
	});

	it("should reject age below 13", () => {
		const invalidUser = { ...validUser, age: 12 };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject age above 150", () => {
		const invalidUser = { ...validUser, age: 151 };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject non-integer age", () => {
		const invalidUser = { ...validUser, age: 25.5 };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should reject when terms not accepted", () => {
		const invalidUser = { ...validUser, terms: false };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should accept without newsletter field", () => {
		const { newsletter, ...userWithoutNewsletter } = validUser;
		const result = userRegistrationSchema.safeParse(userWithoutNewsletter);
		expect(result.success).toBe(true);
	});

	it("should reject names with invalid characters", () => {
		const invalidUser = { ...validUser, firstName: "John123" };
		const result = userRegistrationSchema.safeParse(invalidUser);
		expect(result.success).toBe(false);
	});

	it("should accept names with valid special characters", () => {
		const validUser2 = {
			...validUser,
			firstName: "Mary-Jane",
			lastName: "O'Connor",
		};
		const result = userRegistrationSchema.safeParse(validUser2);
		expect(result.success).toBe(true);
	});
});

describe("contactFormSchema", () => {
	const validContact = {
		name: "John Doe",
		email: "john@example.com",
		subject: "Test Subject",
		message: "This is a test message that is long enough.",
		priority: "medium" as const,
	};

	it("should validate a valid contact form", () => {
		const result = contactFormSchema.safeParse(validContact);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validContact);
		}
	});

	it("should reject short name", () => {
		const invalidContact = { ...validContact, name: "J" };
		const result = contactFormSchema.safeParse(invalidContact);
		expect(result.success).toBe(false);
	});

	it("should reject invalid email", () => {
		const invalidContact = { ...validContact, email: "invalid" };
		const result = contactFormSchema.safeParse(invalidContact);
		expect(result.success).toBe(false);
	});

	it("should reject short subject", () => {
		const invalidContact = { ...validContact, subject: "Hi" };
		const result = contactFormSchema.safeParse(invalidContact);
		expect(result.success).toBe(false);
	});

	it("should reject short message", () => {
		const invalidContact = { ...validContact, message: "Too short" };
		const result = contactFormSchema.safeParse(invalidContact);
		expect(result.success).toBe(false);
	});

	it("should reject invalid priority", () => {
		const invalidContact = { ...validContact, priority: "invalid" };
		const result = contactFormSchema.safeParse(invalidContact);
		expect(result.success).toBe(false);
	});

	it("should accept valid attachments", () => {
		const file = new File(["content"], "test.txt", { type: "text/plain" });
		const contactWithAttachments = { ...validContact, attachments: [file] };
		const result = contactFormSchema.safeParse(contactWithAttachments);
		expect(result.success).toBe(true);
	});

	it("should reject too many attachments", () => {
		const files = new Array(6)
			.fill(null)
			.map(
				(_, i) => new File(["content"], `test${i}.txt`, { type: "text/plain" }),
			);
		const contactWithTooManyAttachments = {
			...validContact,
			attachments: files,
		};
		const result = contactFormSchema.safeParse(contactWithTooManyAttachments);
		expect(result.success).toBe(false);
	});
});

describe("loginSchema", () => {
	const validLogin = {
		email: "user@example.com",
		password: "password123",
		rememberMe: false,
	};

	it("should validate a valid login", () => {
		const result = loginSchema.safeParse(validLogin);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validLogin);
		}
	});

	it("should reject invalid email", () => {
		const invalidLogin = { ...validLogin, email: "invalid" };
		const result = loginSchema.safeParse(invalidLogin);
		expect(result.success).toBe(false);
	});

	it("should reject empty password", () => {
		const invalidLogin = { ...validLogin, password: "" };
		const result = loginSchema.safeParse(invalidLogin);
		expect(result.success).toBe(false);
	});

	it("should accept without rememberMe field", () => {
		const { rememberMe, ...loginWithoutRememberMe } = validLogin;
		const result = loginSchema.safeParse(loginWithoutRememberMe);
		expect(result.success).toBe(true);
	});
});

describe("searchSchema", () => {
	const validSearch = {
		query: "test search",
		category: "all" as const,
		sortBy: "relevance" as const,
		dateRange: {
			from: new Date("2023-01-01"),
			to: new Date("2023-12-31"),
		},
		filters: {
			minPrice: 10,
			maxPrice: 100,
			inStock: true,
			brand: "test-brand",
		},
	};

	it("should validate a valid search", () => {
		const result = searchSchema.safeParse(validSearch);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validSearch);
		}
	});

	it("should use defaults for optional fields", () => {
		const minimalSearch = { query: "test" };
		const result = searchSchema.safeParse(minimalSearch);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.category).toBe("all");
			expect(result.data.sortBy).toBe("relevance");
		}
	});

	it("should reject empty query", () => {
		const invalidSearch = { query: "" };
		const result = searchSchema.safeParse(invalidSearch);
		expect(result.success).toBe(false);
	});

	it("should reject too long query", () => {
		const invalidSearch = { query: "a".repeat(201) };
		const result = searchSchema.safeParse(invalidSearch);
		expect(result.success).toBe(false);
	});

	it("should reject invalid date range", () => {
		const invalidSearch = {
			query: "test",
			dateRange: {
				from: new Date("2023-12-31"),
				to: new Date("2023-01-01"),
			},
		};
		const result = searchSchema.safeParse(invalidSearch);
		expect(result.success).toBe(false);
	});

	it("should reject invalid price range", () => {
		const invalidSearch = {
			query: "test",
			filters: {
				minPrice: 100,
				maxPrice: 10,
			},
		};
		const result = searchSchema.safeParse(invalidSearch);
		expect(result.success).toBe(false);
	});

	it("should accept valid single date", () => {
		const searchWithFromDate = {
			query: "test",
			dateRange: {
				from: new Date("2023-01-01"),
			},
		};
		const result = searchSchema.safeParse(searchWithFromDate);
		expect(result.success).toBe(true);
	});
});

describe("profileUpdateSchema", () => {
	const validProfile = {
		displayName: "John Doe",
		bio: "Software developer",
		website: "https://johndoe.com",
		location: "San Francisco, CA",
		preferences: {
			theme: "dark" as const,
			notifications: {
				email: true,
				push: false,
				sms: false,
			},
			privacy: {
				profileVisibility: "public" as const,
				showEmail: false,
				showLocation: true,
			},
		},
	};

	it("should validate a valid profile update", () => {
		const result = profileUpdateSchema.safeParse(validProfile);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validProfile);
		}
	});

	it("should use defaults for missing fields", () => {
		const minimalProfile = {};
		const result = profileUpdateSchema.safeParse(minimalProfile);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.preferences.theme).toBe("system");
			expect(result.data.preferences.notifications.email).toBe(true);
			expect(result.data.preferences.privacy.profileVisibility).toBe("public");
		}
	});

	it("should reject short display name", () => {
		const invalidProfile = { displayName: "J" };
		const result = profileUpdateSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("should reject long bio", () => {
		const invalidProfile = { bio: "a".repeat(501) };
		const result = profileUpdateSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("should reject invalid website URL", () => {
		const invalidProfile = { website: "not-a-url" };
		const result = profileUpdateSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("should accept empty website string", () => {
		const profileWithEmptyWebsite = { website: "" };
		const result = profileUpdateSchema.safeParse(profileWithEmptyWebsite);
		expect(result.success).toBe(true);
	});

	it("should reject invalid avatar file size", () => {
		const largeContent = new Array(6 * 1024 * 1024).fill("a").join("");
		const largeFile = new File([largeContent], "large.jpg", {
			type: "image/jpeg",
		});
		const invalidProfile = { avatar: largeFile };
		const result = profileUpdateSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("should reject invalid avatar file type", () => {
		const invalidFile = new File(["content"], "test.pdf", {
			type: "application/pdf",
		});
		const invalidProfile = { avatar: invalidFile };
		const result = profileUpdateSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("should accept valid avatar file", () => {
		const validFile = new File(["content"], "avatar.jpg", {
			type: "image/jpeg",
		});
		const profileWithAvatar = { avatar: validFile };
		const result = profileUpdateSchema.safeParse(profileWithAvatar);
		expect(result.success).toBe(true);
	});
});

describe("validateSchema", () => {
	it("should return success for valid data", () => {
		const result = validateSchema(loginSchema, {
			email: "user@example.com",
			password: "password123",
		});
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.error).toBeNull();
	});

	it("should return error for invalid data", () => {
		const result = validateSchema(loginSchema, {
			email: "invalid-email",
			password: "",
		});
		expect(result.success).toBe(false);
		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
	});

	it("should handle non-Zod errors", () => {
		const throwingSchema = {
			parse: () => {
				throw new Error("Unknown error");
			},
		} as any;
		const result = validateSchema(throwingSchema, {});
		expect(result.success).toBe(false);
		expect(result.error?.formErrors).toContain("Unknown validation error");
	});
});

describe("getFieldError", () => {
	it("should return field error when exists", () => {
		const error = {
			formErrors: [],
			fieldErrors: {
				email: ["Invalid email"],
				password: ["Password too short"],
			},
		};
		const result = getFieldError(error, "email");
		expect(result).toBe("Invalid email");
	});

	it("should return undefined when no error exists", () => {
		const error = {
			formErrors: [],
			fieldErrors: {},
		};
		const result = getFieldError(error, "email");
		expect(result).toBeUndefined();
	});

	it("should return undefined when error is null", () => {
		const result = getFieldError(null, "email");
		expect(result).toBeUndefined();
	});
});

describe("hasFieldError", () => {
	it("should return true when field has error", () => {
		const error = {
			formErrors: [],
			fieldErrors: {
				email: ["Invalid email"],
			},
		};
		const result = hasFieldError(error, "email");
		expect(result).toBe(true);
	});

	it("should return false when field has no error", () => {
		const error = {
			formErrors: [],
			fieldErrors: {},
		};
		const result = hasFieldError(error, "email");
		expect(result).toBe(false);
	});

	it("should return false when error is null", () => {
		const result = hasFieldError(null, "email");
		expect(result).toBe(false);
	});
});

describe("Type inference", () => {
	it("should infer correct types", () => {
		const user: UserRegistration = {
			firstName: "John",
			lastName: "Doe",
			email: "john@example.com",
			password: "Password123",
			confirmPassword: "Password123",
			age: 25,
			terms: true,
		};

		const contact: ContactForm = {
			name: "John Doe",
			email: "john@example.com",
			subject: "Test Subject",
			message: "Test message",
			priority: "medium",
		};

		const login: Login = {
			email: "user@example.com",
			password: "password123",
		};

		const search: Search = {
			query: "test",
			category: "all",
			sortBy: "relevance",
		};

		const profile: ProfileUpdate = {
			displayName: "John Doe",
			preferences: {
				theme: "dark",
				notifications: {
					email: true,
					push: false,
					sms: false,
				},
				privacy: {
					profileVisibility: "public",
					showEmail: false,
					showLocation: true,
				},
			},
		};

		expect(user.firstName).toBeDefined();
		expect(contact.name).toBeDefined();
		expect(login.email).toBeDefined();
		expect(search.query).toBeDefined();
		expect(profile.displayName).toBeDefined();
	});
});
