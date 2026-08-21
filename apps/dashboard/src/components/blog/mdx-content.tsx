"use client";

import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import { getMDXComponents } from "./mdx-components";

export function MDXContent({ source }: { source: MDXRemoteSerializeResult }) {
	const components = getMDXComponents();
	return <MDXRemote {...source} components={components} />;
}
