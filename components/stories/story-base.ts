import type { Meta } from "@storybook/nextjs";

export function createStorybookMeta<T>(
	component: T,
	title: string,
	description: string,
): Meta<T> {
	return {
		title,
		component,
		parameters: {
			layout: "fullscreen",
			docs: {
				description: {
					component: description,
				},
			},
		},
		tags: ["autodocs"],
	} satisfies Meta<T>;
}
