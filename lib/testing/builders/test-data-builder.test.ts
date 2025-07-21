import { UserBuilder } from "./test-data-builder";

describe("TestDataBuilder", () => {
	describe("Base Builder Pattern", () => {
		it("should create a basic builder with default values", () => {
			const builder = new TestDataBuilder({
				id: 1,
				name: "default",
			});

			const result = builder.build();

			expect(result).toEqual({
				id: 1,
				name: "default",
			});
		});

		it("should allow overriding values", () => {
			const builder = new TestDataBuilder({
				id: 1,
				name: "default",
			});

			const result = builder.with("id", 2).with("name", "custom").build();

			expect(result).toEqual({
				id: 2,
				name: "custom",
			});
		});

		it("should support chaining", () => {
			const builder = new TestDataBuilder({ count: 0 });

			const result = builder.with("count", 1).with("count", 2).build();

			expect(result.count).toBe(2);
		});
	});

	describe("UserBuilder", () => {
		it("should create user with default values", () => {
			const user = new UserBuilder().build();

			expect(user.id).toBeDefined();
			expect(user.email).toMatch(/test\d+@example\.com/);
			expect(user.name).toMatch(/Test User \d+/);
			expect(user.role).toBe("user");
			expect(user.isActive).toBe(true);
			expect(user.createdAt).toBeInstanceOf(Date);
		});

		it("should create admin user", () => {
			const user = new UserBuilder().asAdmin().build();

			expect(user.role).toBe("admin");
		});

		it("should create inactive user", () => {
			const user = new UserBuilder().inactive().build();

			expect(user.isActive).toBe(false);
		});

		it("should create user with custom email", () => {
			const user = new UserBuilder().withEmail("custom@test.com").build();

			expect(user.email).toBe("custom@test.com");
		});

		it("should create multiple unique users", () => {
			const users = UserBuilder.createMany(3);

			expect(users).toHaveLength(3);
			expect(new Set(users.map((u) => u.id)).size).toBe(3);
			expect(new Set(users.map((u) => u.email)).size).toBe(3);
		});
	});

	describe("ProjectBuilder", () => {
		it("should create project with default values", () => {
			const project = new ProjectBuilder().build();

			expect(project.id).toBeDefined();
			expect(project.name).toMatch(/Test Project \d+/);
			expect(project.description).toMatch(/A test project/);
			expect(project.status).toBe("active");
			expect(project.owner).toBeDefined();
			expect(project.collaborators).toHaveLength(0);
			expect(project.createdAt).toBeInstanceOf(Date);
		});

		it("should create project with collaborators", () => {
			const project = new ProjectBuilder().withCollaborators(3).build();

			expect(project.collaborators).toHaveLength(3);
			expect(project.collaborators[0]).toHaveProperty("id");
		});

		it("should create archived project", () => {
			const project = new ProjectBuilder().archived().build();

			expect(project.status).toBe("archived");
		});

		it("should create project with custom owner", () => {
			const owner = new UserBuilder().withEmail("owner@test.com").build();
			const project = new ProjectBuilder().withOwner(owner).build();

			expect(project.owner.email).toBe("owner@test.com");
		});
	});

	describe("ApiResponseBuilder", () => {
		it("should create successful API response", () => {
			const response = new ApiResponseBuilder()
				.success()
				.withData({ message: "Hello" })
				.build();

			expect(response.success).toBe(true);
			expect(response.status).toBe(200);
			expect(response.data).toEqual({ message: "Hello" });
			expect(response.error).toBeNull();
		});

		it("should create error API response", () => {
			const response = new ApiResponseBuilder().error("Not found", 404).build();

			expect(response.success).toBe(false);
			expect(response.status).toBe(404);
			expect(response.error).toBe("Not found");
			expect(response.data).toBeNull();
		});

		it("should create loading state", () => {
			const response = new ApiResponseBuilder().loading().build();

			expect(response.loading).toBe(true);
			expect(response.data).toBeNull();
		});

		it("should create paginated response", () => {
			const users = UserBuilder.createMany(5);
			const response = new ApiResponseBuilder()
				.success()
				.withPagination(users, 1, 10, 25)
				.build();

			expect(response.data).toEqual(users);
			expect(response.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 25,
				totalPages: 3,
			});
		});
	});

	describe("Builder Factory", () => {
		it("should create builders from factory", () => {
			const factory = TestDataBuilder.createFactory();

			const user = factory.user().build();
			const project = factory.project().build();
			const response = factory.apiResponse().success().build();

			expect(user).toHaveProperty("id");
			expect(project).toHaveProperty("id");
			expect(response.success).toBe(true);
		});

		it("should support preset configurations", () => {
			const factory = TestDataBuilder.createFactory();

			const adminUser = factory.user().asAdmin().build();
			const archivedProject = factory.project().archived().build();

			expect(adminUser.role).toBe("admin");
			expect(archivedProject.status).toBe("archived");
		});
	});
});
